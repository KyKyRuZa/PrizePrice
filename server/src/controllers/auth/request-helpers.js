import { config } from "../../config/index.js";
import { constants as otpConstants, generateOtp, saveCode } from "../../services/otp.service.js";
import { INPUT_LIMITS, isValidLoginInput, sanitizeTextInput } from "../../utils/sanitize.js";
import { parsePhone } from "./shared.js";

export function sendValidationError(res) {
  return res.status(400).json({ error: "VALIDATION_ERROR" });
}

export function parseBodyOrValidationError(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    sendValidationError(res);
    return null;
  }

  return parsed.data;
}

export function parsePhoneOrValidationError(rawPhone, res) {
  const phone = parsePhone(rawPhone);
  if (!phone) {
    sendValidationError(res);
    return null;
  }

  return phone;
}

export function sanitizeLoginOrValidationError(rawLogin, res) {
  const input = sanitizeTextInput(rawLogin, {
    maxLength: INPUT_LIMITS.LOGIN,
    stripHtml: true,
  });

  if (!input || !isValidLoginInput(input)) {
    sendValidationError(res);
    return null;
  }

  return input;
}

export function buildOtpSuccessPayload({ message, code = null } = {}) {
  const payload = {
    ok: true,
    cooldownSeconds: otpConstants.RESEND_COOLDOWN_SECONDS,
  };

  if (message) {
    payload.message = message;
  }

  if (config.debugReturnOtp && code) {
    payload.debugCode = code;
  }

  return payload;
}

export async function issueOtpCode(otpKey) {
  const code = generateOtp();
  await saveCode(otpKey, code);
  return code;
}

export async function maybeIssueDebugOtp(otpKey) {
  if (!config.debugReturnOtp) {
    return null;
  }

  return issueOtpCode(otpKey);
}