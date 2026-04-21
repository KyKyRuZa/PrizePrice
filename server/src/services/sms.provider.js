import { SmsAero } from "smsaero";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { SmsLog } from "../models/index.js";

let smsClient = null;

function isConfigured() {
  return Boolean(config.smsaeroEmail && config.smsaeroApiKey);
}

function getClient() {
  if (!isConfigured()) {
    return null;
  }
  if (!smsClient) {
    smsClient = new SmsAero(config.smsaeroEmail, config.smsaeroApiKey, config.smsaeroSign);
  }
  return smsClient;
}

export async function sendSms(phone, message, { type = "login", userId = null } = {}) {
  const client = getClient();

  if (!client) {
    logger.info("sms_send_skipped", {
      reason: "SMSAERO credentials not configured",
      phone,
      type,
      userId,
    });
    return { ok: false, reason: "not_configured" };
  }

  const cleanPhone = String(phone).replace(/^\+/, "");

  try {
    const response = await client.send(cleanPhone, message);

    const items = response?.data;
    if (response?.success && Array.isArray(items) && items.length > 0) {
      const item = items[0];

      try {
        await SmsLog.create({
          userId,
          phone: cleanPhone,
          type,
          status: "sent",
          providerMessageId: item.id,
          costCents: item.cost,
          metadata: {
            from: item.from,
            text: message, // не храним полный текст SMS (ПДн), только шаблон
            extendStatus: item.extendStatus,
          },
        });
      } catch (dbError) {
        logger.error("sms_log_create_failed", { error: dbError.message, phone, userId });
        // Не падаем, если запись в лог не удалась
      }

      logger.info("sms_sent_success", {
        phone,
        messageId: item.id,
        status: item.extendStatus,
        cost: item.cost,
        type,
        userId,
      });

      return { ok: true, id: item.id, status: item.extendStatus };
    }

    logger.warn("sms_api_error", { phone, response, type, userId });
    return { ok: false, error: response?.message || "SmsAero returned no data" };
  } catch (error) {
    try {
      await SmsLog.create({
        userId,
        phone: cleanPhone,
        type,
        status: "failed",
        errorMessage: error?.message,
      });
    } catch (dbError) {
      logger.error("sms_log_create_failed", { error: dbError.message, phone, userId });
    }

    logger.error("sms_send_failed", {
      phone,
      type,
      userId,
      message: error?.message,
      stack: error?.stack,
    });
    return { ok: false, error: error?.message || "SMS send failed" };
  }
}

export function resetSmsClient() {
  smsClient = null;
}

export { isConfigured };
