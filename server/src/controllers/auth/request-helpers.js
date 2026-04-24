import { config } from "../../config/index.js";
import { constants as otpConstants, generateOtp, saveCode } from "../../services/otp.service.js";
import { sendSms, isConfigured as isSmsConfigured } from "../../services/sms.provider.js";
import { getUserConsents } from "../../services/consent.service.js";
import { User } from "../../models/index.js";
import { INPUT_LIMITS, isValidLoginInput, sanitizeTextInput } from "../../utils/sanitize.js";
import { parsePhone } from "./shared.js";
import { logger } from "../../utils/logger.js";

function getSmsOptOutMessage(purpose) {
  switch (purpose) {
    case 'password_reset':
      return "Вы отказались от SMS-сообщений. Восстановление пароля через SMS невозможно. Обратитесь в поддержку: prizeprise@gmail.com";
    case 'login':
    default:
      return "Вы отказались от SMS-сообщений. Вход по коду невозможен. Войдите по паролю или напишите в поддержку: prizeprise@gmail.com";
  }
}

export async function checkSmsConsentOrError(user, res, purpose = 'login') {
  if (!user) return true;

  if (user.smsOptOut) {
    return res.status(403).json({
      error: "SMS_OPT_OUT",
      message: getSmsOptOutMessage(purpose),
      supportEmail: "prizeprise@gmail.com",
    });
  }

  try {
    const consents = await getUserConsents(user.id);
    const smsConsent = consents?.sms;
    if (smsConsent && !smsConsent.given) {
      return res.status(403).json({
        error: "SMS_OPT_OUT",
        message: getSmsOptOutMessage(purpose),
        supportEmail: "prizeprise@gmail.com",
      });
    }
  } catch (error) {
    logger.warn(`consent_check_failed_${purpose}`, { userId: user.id, error: error.message });
  }

  return null;
}

export function sendValidationError(res) {
  return res.status(400).json({ error: "VALIDATION_ERROR" });
}

function validateOrError(validationFn, res) {
  const result = validationFn();
  if (!result) {
    sendValidationError(res);
    return null;
  }
  return result;
}

export function parseBodyOrValidationError(schema, body, res) {
  return validateOrError(() => {
    const parsed = schema.safeParse(body);
    return parsed.success ? parsed.data : null;
  }, res);
}

export function parsePhoneOrValidationError(rawPhone, res) {
  return validateOrError(() => parsePhone(rawPhone), res);
}

export function sanitizeLoginOrValidationError(rawLogin, res) {
  return validateOrError(() => {
    const input = sanitizeTextInput(rawLogin, {
      maxLength: INPUT_LIMITS.LOGIN,
      stripHtml: true,
    });
    return input && isValidLoginInput(input) ? input : null;
  }, res);
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

  if (config.debugReturnOtp && code && !smsSent) {
    payload.debugCode = code;
  }

  return payload;
}

export async function issueOtpCode(otpKey, phone, { userId = null, purpose = 'login' } = {}) {
  const code = generateOtp();
  await saveCode(otpKey, code);

  if (userId) {
    try {
      const user = await User.findByPk(userId, { attributes: ['smsOptOut'] });
      if (user?.smsOptOut) {
        logger.info("sms_blocked_user_opt_out", { userId, phone, purpose });
        return { code, smsSent: false, blocked: true };
      }

      const consents = await getUserConsents(userId);
      const smsConsent = consents?.sms;
      if (smsConsent && !smsConsent.given) {
        logger.info("sms_blocked_consent_opt_out", { userId, phone, purpose });
        return { code, smsSent: false, blocked: true };
      }
    } catch (error) {
      logger.warn("consent_check_failed", { userId, error: error.message });
    }
  }

  if (phone && isSmsConfigured()) {
    const template = getSmsTemplate(purpose);
    const message = template.replace('{code}', code);
    const smsResult = await sendSms(phone, message, { type: purpose, userId });
    if (smsResult.ok) {
      return { code, smsSent: true };
    }
    logger.warn("sms_send_failed_in_otp", {
      phone,
      purpose,
      reason: smsResult.error || smsResult.reason,
      fallingBackToDebug: config.debugReturnOtp,
    });
  }

  return { code, smsSent: false };
}

function getSmsTemplate(purpose) {
  switch (purpose) {
    case 'registration':
      return 'PrizePrice: ваш код подтверждения для регистрации: {code}. Код действителен 5 минут';
    case 'password_reset':
      return 'PrizePrice: код для восстановления пароля: {code}. Код действителен 5 минут';
    case 'login':
    default:
      return 'PrizePrice: ваш код для входа: {code}. Код действителен 5 минут';
  }
}

export async function maybeIssueDebugOtp(otpKey) {
  if (!config.debugReturnOtp) {
    return { code: null, smsSent: false };
  }

  return issueOtpCode(otpKey);
}
