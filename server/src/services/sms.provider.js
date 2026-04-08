import { SmsAero } from "smsaero";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

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

/**
 * Send SMS via SmsAero.
 * API returns: { success, data: [{ id, number, status, extendStatus, ... }], message }
 */
export async function sendSms(phone, message) {
  const client = getClient();

  if (!client) {
    logger.info("sms_send_skipped", {
      reason: "SMSAERO credentials not configured",
      phone,
    });
    return { ok: false, reason: "not_configured" };
  }

  // SmsAero API expects number without +: 79991234567
  const cleanPhone = String(phone).replace(/^\+/, "");

  try {
    // client.send(number, text, dateSend?, callbackUrl?)
    const response = await client.send(cleanPhone, message);

    // response.data is array: [{ id, from, number, text, status, extendStatus, ... }]
    const items = response?.data;
    if (response?.success && Array.isArray(items) && items.length > 0) {
      const item = items[0];
      logger.info("sms_sent_success", {
        phone,
        messageId: item.id,
        status: item.extendStatus,
        cost: item.cost,
      });
      return { ok: true, id: item.id, status: item.extendStatus };
    }

    logger.warn("sms_api_error", { phone, response });
    return { ok: false, error: response?.message || "SmsAero returned no data" };
  } catch (error) {
    logger.error("sms_send_failed", {
      phone,
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
