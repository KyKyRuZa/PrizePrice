import { z } from "zod";

import { User } from "../../models/index.js";
import {
  canSendCode,
  saveCode,
  setSendCooldown,
  verifyCode,
} from "../../services/otp.service.js";
import { getUserById } from "../../services/user.service.js";
import { hashPassword, validatePassword } from "../../utils/passwords.js";
import { sendInvalidOtp, sendTooManyRequests } from "../auth.errors.js";
import {
  buildOtpSuccessPayload,
  issueOtpCode,
  maybeIssueDebugOtp,
  parseBodyOrValidationError,
  parsePhoneOrValidationError,
} from "./request-helpers.js";
import { otpCodeSchema, passwordInputSchema, phoneInputSchema } from "./validation.js";

const requestPasswordResetSchema = z.object({ phone: phoneInputSchema });
const resetPasswordWithOtpSchema = z.object({
  phone: phoneInputSchema,
  code: otpCodeSchema,
  newPassword: passwordInputSchema,
});

export const requestPasswordReset = async (req, res) => {
  const parsed = parseBodyOrValidationError(requestPasswordResetSchema, req.body, res);
  if (!parsed) return;

  const phone = parsePhoneOrValidationError(parsed.phone, res);
  if (!phone) return;

  const resetOtpKey = `reset_${phone}`;
  const allowed = await canSendCode(resetOtpKey);
  if (!allowed.ok) {
    return sendTooManyRequests(res, req, allowed.retryAfter);
  }
  await setSendCooldown(resetOtpKey);

  const user = await User.findOne({ where: { phone } });
  const code = user
    ? await issueOtpCode(resetOtpKey)
    : await maybeIssueDebugOtp(resetOtpKey);

  return res.json(
    buildOtpSuccessPayload({
      message: "If account exists, reset code sent",
      code,
    })
  );
};

export const resetPasswordWithOtp = async (req, res) => {
  const parsed = parseBodyOrValidationError(resetPasswordWithOtpSchema, req.body, res);
  if (!parsed) return;

  const phone = parsePhoneOrValidationError(parsed.phone, res);
  if (!phone) return;

  const code = String(parsed.code).trim();
  const newPassword = parsed.newPassword;
  const validation = validatePassword(newPassword);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const verified = await verifyCode(`reset_${phone}`, code);
  if (!verified.ok) {
    return sendInvalidOtp(res);
  }

  const user = await User.findOne({ where: { phone } });
  if (!user) {
    return sendInvalidOtp(res);
  }

  const passwordHash = await hashPassword(newPassword);
  await user.update({ passwordHash, passwordUpdatedAt: new Date() });
  await saveCode(`reset_${phone}`, "");

  const updatedUser = await getUserById(user.id);
  return res.json({ ok: true, user: updatedUser });
};