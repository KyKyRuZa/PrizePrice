import { z } from "zod";

import { setAuthCookies } from "../../utils/session.js";
import { User } from "../../models/index.js";
import {
  canSendCode,
  getAndDeleteRegistrationData,
  saveRegistrationData,
  verifyCode,
} from "../../services/otp.service.js";
import { getUserById } from "../../services/user.service.js";
import { hashPassword, validatePassword } from "../../utils/passwords.js";
import { buildRequestLogMeta } from "../../utils/requestMeta.js";
import { INPUT_LIMITS, isValidUsername, sanitizeUserName } from "../../utils/sanitize.js";
import { logger } from "../../utils/logger.js";
import {
  sendInternalError,
  sendInvalidOtp,
  sendTooManyRequests,
  sendUserUniqueConflict,
} from "../auth.errors.js";
import { parsePhone } from "./shared.js";
import {
  buildOtpSuccessPayload,
  issueOtpCode,
  parseBodyOrValidationError,
  parsePhoneOrValidationError,
} from "./request-helpers.js";
import {
  otpCodeSchema,
  passwordInputSchema,
  phoneInputSchema,
  usernameInputSchema,
} from "./validation.js";

const registrationPayloadSchema = z.object({
  username: usernameInputSchema,
  phone: phoneInputSchema,
  password: passwordInputSchema,
  passwordConfirmation: passwordInputSchema,
});

const registerWithCodePayloadSchema = z.object({
  phone: phoneInputSchema,
  code: otpCodeSchema,
});

function validateRegistrationInput(data) {
  const username = sanitizeUserName(data.username, INPUT_LIMITS.USERNAME);
  if (!isValidUsername(username)) {
    return { error: "VALIDATION_ERROR" };
  }

  if (data.password !== data.passwordConfirmation) {
    return { error: "PASSWORD_MISMATCH" };
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.ok) {
    return { error: passwordValidation.error };
  }

  const normalizedPhone = parsePhone(data.phone);
  if (!normalizedPhone) {
    return { error: "VALIDATION_ERROR" };
  }

  return {
    username,
    normalizedPhone,
    password: data.password,
  };
}

async function findRegistrationConflict({ phone, username }) {
  const existingUserWithPhone = await User.findOne({ where: { phone } });
  if (existingUserWithPhone) return "PHONE_EXISTS";

  const existingUserWithName = await User.findOne({ where: { name: username } });
  if (existingUserWithName) return "USERNAME_EXISTS";

  return null;
}

async function sendRegistrationConflictIfAny(res, payload) {
  const conflict = await findRegistrationConflict(payload);
  if (!conflict) {
    return false;
  }

  res.status(409).json({ error: conflict });
  return true;
}

export const requestCodeForRegistration = async (req, res) => {
  try {
    const parsed = parseBodyOrValidationError(registrationPayloadSchema, req.body, res);
    if (!parsed) return;

    const validated = validateRegistrationInput(parsed);
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const { normalizedPhone, username, password } = validated;

    if (await sendRegistrationConflictIfAny(res, { phone: normalizedPhone, username })) {
      return;
    }

    const registrationOtpKey = `registration_${normalizedPhone}`;
    const allowed = await canSendCode(registrationOtpKey);
    if (!allowed.ok) {
      return sendTooManyRequests(res, req, allowed.retryAfter);
    }

    const code = await issueOtpCode(registrationOtpKey);

    const passwordHash = await hashPassword(password);
    await saveRegistrationData(
      registrationOtpKey,
      JSON.stringify({
        username,
        phone: normalizedPhone,
        passwordHash,
      })
    );

    return res.json(
      buildOtpSuccessPayload({
        message: "Registration code sent",
        code,
      })
    );
  } catch (error) {
    logger.error("request_registration_code_failed", {
      ...buildRequestLogMeta(req),
      message: error?.message,
      stack: error?.stack,
    });
    return sendInternalError(res, req);
  }
};

export const registerWithCode = async (req, res) => {
  try {
    const parsed = parseBodyOrValidationError(registerWithCodePayloadSchema, req.body, res);
    if (!parsed) return;

    const normalizedPhone = parsePhoneOrValidationError(parsed.phone, res);
    if (!normalizedPhone) return;

    const code = parsed.code;
    const verified = await verifyCode(`registration_${normalizedPhone}`, code);
    if (!verified.ok) {
      return sendInvalidOtp(res);
    }

    const registrationDataStr = await getAndDeleteRegistrationData(`registration_${normalizedPhone}`);
    const registrationData = JSON.parse(registrationDataStr || "{}");
    const registrationUsername = sanitizeUserName(registrationData.username, INPUT_LIMITS.USERNAME);
    const registrationPhone = parsePhone(registrationData.phone);
    const hasPasswordHash = typeof registrationData.passwordHash === "string" && registrationData.passwordHash.length > 0;
    const hasPlainPassword = typeof registrationData.password === "string" && registrationData.password.length > 0;

    if (!isValidUsername(registrationUsername) || !registrationPhone || (!hasPasswordHash && !hasPlainPassword)) {
      return res.status(400).json({ error: "REGISTRATION_DATA_EXPIRED" });
    }

    if (
      await sendRegistrationConflictIfAny(res, {
        phone: registrationPhone,
        username: registrationUsername,
      })
    ) {
      return;
    }

    const passwordHash = hasPasswordHash
      ? registrationData.passwordHash
      : await hashPassword(registrationData.password);
    const user = await User.create({
      name: registrationUsername,
      phone: registrationPhone,
      passwordHash,
      passwordUpdatedAt: new Date(),
    });

    const updatedUser = await getUserById(user.id);
    setAuthCookies(res, user);
    return res.json({ user: updatedUser });
  } catch (error) {
    if (sendUserUniqueConflict(res, error)) return;
    logger.error("register_with_code_failed", {
      ...buildRequestLogMeta(req),
      message: error?.message,
      stack: error?.stack,
    });
    return sendInternalError(res, req);
  }
};

export const registerWithUsername = async (req, res) => {
  try {
    const parsed = parseBodyOrValidationError(registrationPayloadSchema, req.body, res);
    if (!parsed) return;

    const validated = validateRegistrationInput(parsed);
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const { normalizedPhone, username, password } = validated;

    if (await sendRegistrationConflictIfAny(res, { phone: normalizedPhone, username })) {
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: username,
      phone: normalizedPhone,
      passwordHash,
      passwordUpdatedAt: new Date(),
    });

    const updatedUser = await getUserById(user.id);
    setAuthCookies(res, user);
    return res.json({ user: updatedUser });
  } catch (error) {
    if (sendUserUniqueConflict(res, error)) return;
    logger.error("register_with_username_failed", {
      ...buildRequestLogMeta(req),
      message: error?.message,
      stack: error?.stack,
    });
    return sendInternalError(res, req);
  }
};