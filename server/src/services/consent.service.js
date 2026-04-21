import { UserConsent } from "../models/index.js";
import { logger } from "../utils/logger.js";

export async function recordConsent({ userId, type, given, ip, userAgent, consentText }) {
  try {
    await UserConsent.upsert({
      userId,
      consentType: type,
      consentGiven: given,
      consentAt: new Date(),
      consentText,
      ip,
      userAgent,
    });
    logger.info("consent_recorded", { userId, type, given, ip });
  } catch (error) {
    logger.error("consent_record_failed", { userId, type, error: error.message });
    throw error;
  }
}

export async function getUserConsents(userId) {
  const consents = await UserConsent.findAll({
    where: { userId },
    order: [["consentAt", "DESC"]],
    raw: true,
  });

  return consents.reduce((acc, c) => {
    if (!acc[c.consent_type]) {
      acc[c.consent_type] = {
        given: c.consent_given,
        at: c.consent_at,
        text: c.consent_text,
      };
    }
    return acc;
  }, {});
}

export async function hasConsent(userId, type) {
  const consent = await UserConsent.findOne({
    where: { userId, consentType: type },
    order: [["consentAt", "DESC"]],
    attributes: ["consentGiven"],
    raw: true,
  });
  return consent?.consent_given ?? false;
}
