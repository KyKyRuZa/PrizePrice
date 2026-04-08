import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { connectRedisClientForService } from "./redisClient.factory.js";

function logDebug(message) {
  logger.debug(message);
}

const OTP_TTL_SECONDS = 5 * 60;
const isTestRuntime = String(config.nodeEnv || "").toLowerCase() === "test";
const isDevelopmentRuntime = !config.isProduction && !isTestRuntime;
const RESEND_COOLDOWN_SECONDS = isDevelopmentRuntime ? 15 : 60;

// In-memory fallback
const mem = {
  otp: new Map(), // phone -> { code, expiresAt, lastSentAt }
  registrationData: new Map(), // phone -> { data, expiresAt }
};

let redisClient = null;

function throwOtpUnavailable(reason = "Redis is required") {
  const error = new Error(`OTP storage unavailable: ${reason}`);
  error.code = "OTP_STORAGE_UNAVAILABLE";
  throw error;
}

function isRedisMandatory() {
  return Boolean(config.isProduction || config.otpRequireRedis);
}

function ensureMemoryFallbackAllowed() {
  if (isRedisMandatory()) {
    throwOtpUnavailable();
  }
}

async function closeRedisClientSilently() {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    // ignore
  } finally {
    redisClient = null;
  }
}

async function handleRedisRuntimeFailure(operation, error) {
  logger.warn("otp_redis_runtime_error", {
    operation,
    message: error?.message,
  });
  await closeRedisClientSilently();
  if (isRedisMandatory()) {
    throwOtpUnavailable(`redis operation failed (${operation})`);
  }
}

export async function initOtpStorage() {
  // In development OTP can use in-memory fallback.
  // In production with OTP_REQUIRE_REDIS=true startup must fail fast.
  try {
    const redisInfo = await connectRedisClientForService("otp");
    redisClient = redisInfo.client;
    return { ok: true, driver: redisInfo.driver, mode: redisInfo.mode };
  } catch (error) {
    await closeRedisClientSilently();

    if (isRedisMandatory()) {
      throw new Error(`OTP storage initialization failed: Redis is required (${error?.message || "unknown error"})`);
    }

    return { ok: false, driver: "memory" };
  }
}

export async function closeOtpStorage() {
  await closeRedisClientSilently();
}

function nowMs() {
  return Date.now();
}

function otpKey(phone) {
  return `otp:${phone}`;
}

function cooldownKey(phone) {
  return `otp_cooldown:${phone}`;
}

function registrationDataKey(phone) {
  return `registration_data:${phone}`;
}

export async function setSendCooldown(key) {
  if (redisClient) {
    try {
      await redisClient.setEx(cooldownKey(key), RESEND_COOLDOWN_SECONDS, "1");
      return;
    } catch (error) {
      await handleRedisRuntimeFailure("set_send_cooldown", error);
    }
  }

  ensureMemoryFallbackAllowed();

  const existing = mem.otp.get(key);
  if (existing) {
    mem.otp.set(key, { ...existing, lastSentAt: nowMs() });
    return;
  }

  // For identifiers that do not need OTP verification, we still reserve cooldown.
  mem.otp.set(key, { code: "", expiresAt: nowMs(), lastSentAt: nowMs() });
}

export async function canSendCode(phone) {
  if (redisClient) {
    try {
      const ttl = await redisClient.ttl(cooldownKey(phone));
      if (ttl > 0) {
        logDebug(`[OTP SEND LIMIT] Rate limit hit for key: ${cooldownKey(phone)}, retry after: ${ttl}s`);
        return { ok: false, retryAfter: ttl };
      }
      logDebug(`[OTP SEND ALLOWED] No rate limit for key: ${cooldownKey(phone)}`);
      return { ok: true, retryAfter: 0 };
    } catch (error) {
      await handleRedisRuntimeFailure("can_send_code", error);
    }
  }

  ensureMemoryFallbackAllowed();

  const rec = mem.otp.get(phone);
  if (rec?.lastSentAt && nowMs() - rec.lastSentAt < RESEND_COOLDOWN_SECONDS * 1000) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (nowMs() - rec.lastSentAt)) / 1000);
    logDebug(`[OTP SEND LIMIT] Rate limit hit for phone: ${phone}, retry after: ${retryAfter}s`);
    return { ok: false, retryAfter };
  }

  logDebug(`[OTP SEND ALLOWED] No rate limit for phone: ${phone}`);
  return { ok: true, retryAfter: 0 };
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveRegistrationData(phone, data) {
  if (redisClient) {
    try {
      if (data) {
        await redisClient.setEx(registrationDataKey(phone), OTP_TTL_SECONDS, data);
        logDebug(
          `[REG DATA SAVE] Registration data saved to Redis for key: ${registrationDataKey(phone)} with TTL: ${OTP_TTL_SECONDS}s`
        );
      } else {
        await redisClient.del(registrationDataKey(phone));
        logDebug(`[REG DATA DELETE] Registration data deleted from Redis for key: ${registrationDataKey(phone)}`);
      }
      return;
    } catch (error) {
      await handleRedisRuntimeFailure("save_registration_data", error);
    }
  }

  ensureMemoryFallbackAllowed();

  if (data) {
    mem.registrationData.set(phone, { data, expiresAt: nowMs() + OTP_TTL_SECONDS * 1000 });
    logDebug(`[REG DATA SAVE] Registration data saved to memory for phone: ${phone} with TTL: ${OTP_TTL_SECONDS}s`);
  } else {
    mem.registrationData.delete(phone);
    logDebug(`[REG DATA DELETE] Registration data deleted from memory for phone: ${phone}`);
  }
}

export async function getAndDeleteRegistrationData(phone) {
  if (redisClient) {
    try {
      const data = await redisClient.get(registrationDataKey(phone));
      await redisClient.del(registrationDataKey(phone));
      logDebug(`[REG DATA GET AND DELETE] Retrieved and deleted registration data from Redis for key: ${registrationDataKey(phone)}`);
      return data;
    } catch (error) {
      await handleRedisRuntimeFailure("get_and_delete_registration_data", error);
    }
  }

  ensureMemoryFallbackAllowed();

  const rec = mem.registrationData.get(phone);
  mem.registrationData.delete(phone);
  if (!rec) {
    logDebug(`[REG DATA GET AND DELETE] Registration data not found in memory for phone: ${phone}`);
    return null;
  }

  if (rec.expiresAt < nowMs()) {
    logDebug(`[REG DATA GET AND DELETE] Registration data expired in memory for phone: ${phone}`);
    return null;
  }

  logDebug(`[REG DATA GET AND DELETE] Retrieved and deleted registration data from memory for phone: ${phone}`);
  return rec.data;
}

export async function saveCode(phone, code) {
  if (redisClient) {
    try {
      if (code) {
        await redisClient.setEx(otpKey(phone), OTP_TTL_SECONDS, code);
        await redisClient.setEx(cooldownKey(phone), RESEND_COOLDOWN_SECONDS, "1");
        logDebug(`[OTP SAVE] Code saved to Redis for key: ${otpKey(phone)} with TTL: ${OTP_TTL_SECONDS}s`);
        return;
      }

      const currentValue = await redisClient.get(otpKey(phone));
      await redisClient.del(otpKey(phone));
      logDebug(`[OTP DELETE] Code deleted from Redis for key: ${otpKey(phone)}`);
      return currentValue;
    } catch (error) {
      await handleRedisRuntimeFailure("save_code", error);
    }
  }

  ensureMemoryFallbackAllowed();

  if (code) {
    mem.otp.set(phone, { code, expiresAt: nowMs() + OTP_TTL_SECONDS * 1000, lastSentAt: nowMs() });
    logDebug(`[OTP SAVE] Code saved to memory for phone: ${phone} with TTL: ${OTP_TTL_SECONDS}s`);
    return;
  }

  const rec = mem.otp.get(phone);
  mem.otp.delete(phone);
  logDebug(`[OTP DELETE] Code deleted from memory for phone: ${phone}`);
  return rec ? rec.code : null;
}

export async function verifyCode(phone, code) {
  if (redisClient) {
    try {
      const saved = await redisClient.get(otpKey(phone));
      if (!saved) {
        logDebug(`[OTP VERIFICATION] Code not found for key: ${otpKey(phone)}`);
        return { ok: false, reason: "expired" };
      }
      if (String(saved) !== String(code)) {
        logDebug(`[OTP VERIFICATION] Invalid code for key: ${otpKey(phone)}`);
        return { ok: false, reason: "invalid" };
      }
      await redisClient.del(otpKey(phone));
      logDebug(`[OTP VERIFICATION] Successfully verified and deleted code for key: ${otpKey(phone)}`);
      return { ok: true };
    } catch (error) {
      await handleRedisRuntimeFailure("verify_code", error);
    }
  }

  ensureMemoryFallbackAllowed();

  const rec = mem.otp.get(phone);
  if (!rec) {
    logDebug(`[OTP VERIFICATION] Code not found in memory for phone: ${phone}`);
    return { ok: false, reason: "expired" };
  }
  if (rec.expiresAt < nowMs()) {
    mem.otp.delete(phone);
    logDebug(`[OTP VERIFICATION] Code expired for phone: ${phone}`);
    return { ok: false, reason: "expired" };
  }
  if (String(rec.code) !== String(code)) {
    logDebug(`[OTP VERIFICATION] Invalid code for phone: ${phone}`);
    return { ok: false, reason: "invalid" };
  }

  mem.otp.delete(phone);
  logDebug(`[OTP VERIFICATION] Successfully verified and deleted code for phone: ${phone}`);
  return { ok: true };
}

export const constants = {
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
};

// Test helper: resets in-memory OTP state.
export function resetOtpStorageForTests() {
  mem.otp.clear();
  mem.registrationData.clear();
}

export { logDebug };
