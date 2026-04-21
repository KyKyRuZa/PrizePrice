import { User } from "../../models/index.js";
import { logger } from "../../utils/logger.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * POST /api/me/sms-opt-out
 * Пользователь отказывается от SMS-сообщений
 */
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

  logger.info("sms_opt_out", { userId, ip });
  return res.json({ ok: true });
});

/**
 * POST /api/me/sms-opt-in
 * Пользователь включает SMS-сообщения обратно
 */
export const cancelSmsOptOut = asyncHandler(async (req, res) => {
  const userId = req.userId;

  await User.update(
    {
      smsOptOut: false,
      smsOptOutAt: null,
      smsOptOutIp: null,
    },
    { where: { id: userId } }
  );

  logger.info("sms_opt_in", { userId });
  return res.json({ ok: true });
});
