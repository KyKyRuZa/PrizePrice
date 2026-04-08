import { config } from "../../config/index.js";
import { constants as otpConstants, generateOtp, saveCode } from "../../services/otp.service.js";
import { sendSms, isConfigured as isSmsConfigured } from "../../services/sms.provider.js";
import { INPUT_LIMITS, isValidLoginInput, sanitizeTextInput } from "../../utils/sanitize.js";
import { parsePhone } from "./shared.js";
import { logger } from "../../utils/logger.js";

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

export function buildOtpSuccessPayload({ message, code = null, smsSent = false } = {}) {
  const payload = {
    ok: true,
    cooldownSeconds: otpConstants.RESEND_COOLDOWN_SECONDS,
    smsSent,
  };

  if (message) {
    payload.message = message;
  }

  // Dev fallback: return code in response if SMS is not configured
  if (config.debugReturnOtp && code && !smsSent) {
    payload.debugCode = code;
  }

  return payload;
}

export async function issueOtpCode(otpKey, phone) {
  const code = generateOtp();
  await saveCode(otpKey, code);

  // Try to send SMS
  if (phone && isSmsConfigured()) {
    const smsResult = await sendSms(phone, `PrizePrice: ваш код ${code}`);
    if (smsResult.ok) {
      return { code, smsSent: true };
    }
    logger.warn("sms_send_failed_in_otp", {
      phone,
      reason: smsResult.error || smsResult.reason,
      fallingBackToDebug: config.debugReturnOtp,
    });
  }

  return { code, smsSent: false };
}

export async function maybeIssueDebugOtp(otpKey) {
  if (!config.debugReturnOtp) {
    return { code: null, smsSent: false };
  }

  return issueOtpCode(otpKey);
}