import { User } from "../../models/index.js";
import { logger } from "../../utils/logger.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordConsent } from "../../services/consent.service.js";

export const optOutFromSms = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  await User.update(
    {
      smsOptOut: true,
      smsOptOutAt: new Date(),
      smsOptOutIp: ip,
    },
    { where: { id: userId } }
  );

  await recordConsent({
    userId,
    type: 'sms',
    given: false,
    ip,
    userAgent: req.headers['user-agent'] || '',
    consentText: 'Отказ от SMS-сообщений',
  });

  logger.info("sms_opt_out", { userId, ip });
  return res.json({ ok: true });
});

export const cancelSmsOptOut = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  await User.update(
    {
      smsOptOut: false,
      smsOptOutAt: null,
      smsOptOutIp: null,
    },
    { where: { id: userId } }
  );

  const smsConsentText = "Я даю согласие на получение SMS-сообщений от PrizePrice (в том числе кодов подтверждения при восстановлении пароля) в соответствии с Политикой конфиденциальности";

  await recordConsent({
    userId,
    type: 'sms',
    given: true,
    ip,
    userAgent: req.headers['user-agent'] || '',
    consentText: smsConsentText,
  });

  logger.info("sms_opt_in", { userId, ip });
  return res.json({ ok: true });
});
