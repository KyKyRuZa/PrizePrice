import { z } from "zod";

import { setAuthCookies } from "../../utils/session.js";
import {
  canSendCode,
  setSendCooldown,
  verifyCode,
} from "../../services/otp.service.js";
import { findOrCreateUserByPhone, getUserById } from "../../services/user.service.js";
import { verifyPassword } from "../../utils/passwords.js";
import {
  sendInvalidAuthFlow,
  sendInvalidOtp,
  sendTooManyRequests,
} from "../auth.errors.js";
import {
  findUserByLoginInput,
  isValidPhone,
} from "./shared.js";
import {
  buildOtpSuccessPayload,
  issueOtpCode,
  parseBodyOrValidationError,
  parsePhoneOrValidationError,
  sanitizeLoginOrValidationError,
} from "./request-helpers.js";
import {
  loginInputSchema,
  otpCodeSchema,
  passwordInputSchema,
  phoneInputSchema,
} from "./validation.js";

const requestCodeSchema = z.object({ phone: phoneInputSchema });
const verifyOtpSchema = z.object({ phone: phoneInputSchema, code: otpCodeSchema });
const requestCodeForLoginSchema = z.object({ login: loginInputSchema });
const loginPasswordSchema = z.object({
  login: loginInputSchema,
  password: passwordInputSchema,
});
const verifyLoginWithOtpSchema = z.object({
  login: loginInputSchema,
  code: otpCodeSchema,
});

export const requestCode = async (req, res) => {
  const parsed = parseBodyOrValidationError(requestCodeSchema, req.body, res);
  if (!parsed) return;

  const phone = parsePhoneOrValidationError(parsed.phone, res);
  if (!phone) return;

  const allowed = await canSendCode(phone);
  if (!allowed.ok) {
    return sendTooManyRequests(res, req, allowed.retryAfter);
  }

  const { code, smsSent } = await issueOtpCode(phone, phone);
  return res.json(buildOtpSuccessPayload({ code, smsSent }));
};

export const verifyOtp = async (req, res) => {
  const parsed = parseBodyOrValidationError(verifyOtpSchema, req.body, res);
  if (!parsed) return;

  const phone = parsePhoneOrValidationError(parsed.phone, res);
  if (!phone) return;

  const code = String(parsed.code).trim();
  const verified = await verifyCode(phone, code);
  if (!verified.ok) return sendInvalidOtp(res);

  const user = await findOrCreateUserByPhone(phone);
  setAuthCookies(res, user);
  return res.json({ user });
};

export const requestCodeForLogin = async (req, res) => {
  const parsed = parseBodyOrValidationError(requestCodeForLoginSchema, req.body, res);
  if (!parsed) return;

  const sanitizedInput = sanitizeLoginOrValidationError(parsed.login, res);
  if (!sanitizedInput) return;

  const requestKey = `login_request:${String(sanitizedInput).trim().toLowerCase()}`;

  const allowed = await canSendCode(requestKey);
  if (!allowed.ok) {
    return sendTooManyRequests(res, req, allowed.retryAfter);
  }
  await setSendCooldown(requestKey);

  const userRec = await findUserByLoginInput(sanitizedInput);
  const phone = userRec?.phone;
  const shouldIssueOtp = userRec && isValidPhone(phone);
  const { code, smsSent } = shouldIssueOtp
    ? await issueOtpCode(`login_${phone}`, phone)
    : { code: null, smsSent: false };

  return res.json(
    buildOtpSuccessPayload({
      message: "If account exists, login code sent",
      code,
      smsSent,
    })
  );
};

export const loginPassword = async (req, res) => {
  const parsed = parseBodyOrValidationError(loginPasswordSchema, req.body, res);
  if (!parsed) return;

  const input = sanitizeLoginOrValidationError(parsed.login, res);
  if (!input) return;

  const password = String(parsed.password);
  const userRec = await findUserByLoginInput(input);
  if (!userRec || !userRec.passwordHash) {
    return sendInvalidAuthFlow(res);
  }

  let validPassword = false;
  try {
    validPassword = await verifyPassword(password, userRec.passwordHash);
  } catch {
    validPassword = false;
  }

  if (!validPassword) {
    return sendInvalidAuthFlow(res);
  }

  const user = await getUserById(userRec.id);
  setAuthCookies(res, userRec);
  return res.json({ user });
};

export const verifyLoginWithOtp = async (req, res) => {
  const parsed = parseBodyOrValidationError(verifyLoginWithOtpSchema, req.body, res);
  if (!parsed) return;

  const input = sanitizeLoginOrValidationError(parsed.login, res);
  if (!input) return;

  const code = String(parsed.code).trim();
  const userRec = await findUserByLoginInput(input);
  const phone = userRec?.phone;
  const otpKey = isValidPhone(phone)
    ? `login_${phone}`
    : `login_unknown_${String(input).trim().toLowerCase()}`;

  const verified = await verifyCode(otpKey, code);
  if (!verified.ok || !userRec || !isValidPhone(phone)) {
    return sendInvalidOtp(res);
  }

  const user = await getUserById(userRec.id);
  setAuthCookies(res, userRec);
  return res.json({ user });
};