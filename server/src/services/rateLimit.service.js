import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { connectRedisClientForService } from "./redisClient.factory.js";

function logDebug(message) {
  logger.debug(message);
}

// In-memory fallback for rate limiting
const memLimits = new Map(); // key -> { count, resetTime }

let redisClient = null;
const REDIS_INCR_WITH_TTL_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  local ttl = redis.call("PTTL", KEYS[1])
  return { current, ttl }
`;

function throwRateLimitUnavailable(reason = "Redis is required") {
  const error = new Error(`Rate limit storage unavailable: ${reason}`);
  error.code = "RATE_LIMIT_STORAGE_UNAVAILABLE";
  throw error;
}

function isRedisMandatory() {
  return Boolean(config.isProduction || config.rateLimitRequireRedis);
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
  logger.warn("rate_limit_redis_runtime_error", {
    operation,
    message: error?.message,
  });
  await closeRedisClientSilently();
  if (isRedisMandatory()) {
    throwRateLimitUnavailable(`redis operation failed (${operation})`);
  }
}

export async function initRateLimitStorage() {
  // Try to connect to Redis for rate limiting
  try {
    const redisInfo = await connectRedisClientForService("rate-limit");
    redisClient = redisInfo.client;
    return { ok: true, driver: redisInfo.driver, mode: redisInfo.mode };
  } catch (error) {
    await closeRedisClientSilently();

    if (isRedisMandatory()) {
      throw new Error(`Rate limit storage initialization failed: Redis is required (${error?.message || "unknown error"})`);
    }

    return { ok: false, driver: "memory" };
  }
}

export async function closeRateLimitStorage() {
  await closeRedisClientSilently();
}

function getKey(identifier, windowMs) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  return `rate_limit:${identifier}:${windowStart}`;
}

function getWindowResetTime(windowMs) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  return windowStart + windowMs;
}

export async function incrementRateLimit(identifier, windowMs, maxRequests) {
  const key = getKey(identifier, windowMs);
  const resetTime = getWindowResetTime(windowMs);

  if (redisClient) {
    try {
      // Atomic Redis increment with TTL in a single round-trip.
      const [rawCount, rawTtlMs] = await redisClient.eval(REDIS_INCR_WITH_TTL_SCRIPT, {
        keys: [key],
        arguments: [String(windowMs)],
      });
      const count = Number(rawCount);
      let ttlMs = Number(rawTtlMs);
      if (!Number.isFinite(ttlMs) || ttlMs < 0) {
        ttlMs = Math.max(0, resetTime - Date.now());
      }
      const retryAfter = Math.ceil(ttlMs / 1000);
      const limited = count > maxRequests;

      if (limited) {
        logDebug(`[RATE LIMIT] Hit rate limit for identifier: ${identifier}, key: ${key}, count: ${count}/${maxRequests}`);
      } else {
        logDebug(`[RATE LIMIT] Incremented rate limit counter for identifier: ${identifier}, key: ${key}, count: ${count}/${maxRequests}`);
      }

      return {
        limited,
        count,
        max: maxRequests,
        resetTime,
        retryAfter,
      };
    } catch (error) {
      await handleRedisRuntimeFailure("increment_rate_limit", error);
    }
  }

  if (isRedisMandatory()) {
    throwRateLimitUnavailable();
  }

  // Fallback to in-memory rate limiting (development mode).
  const record = memLimits.get(key);
  const now = Date.now();

  if (!record || now >= record.resetTime) {
    // New window
    const newRecord = {
      count: 1,
      resetTime,
    };
    memLimits.set(key, newRecord);

    logDebug(`[RATE LIMIT] Created new rate limit window for identifier: ${identifier}, key: ${key}, count: 1/${maxRequests}`);

    return {
      limited: false,
      count: 1,
      max: maxRequests,
      resetTime,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    };
  }

  // Existing window
  record.count += 1;
  memLimits.set(key, record);

  if (record.count > maxRequests) {
    logDebug(`[RATE LIMIT] Hit rate limit for identifier: ${identifier}, key: ${key}, count: ${record.count}/${maxRequests}`);
    return {
      limited: true,
      count: record.count,
      max: maxRequests,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000),
    };
  }

  logDebug(`[RATE LIMIT] Incremented rate limit counter for identifier: ${identifier}, key: ${key}, count: ${record.count}/${maxRequests}`);

  return {
    limited: false,
    count: record.count,
    max: maxRequests,
    resetTime: record.resetTime,
    retryAfter: Math.ceil((record.resetTime - Date.now()) / 1000),
  };
}

// Test helper: resets in-memory rate-limit windows.
export function resetRateLimitStorageForTests() {
  memLimits.clear();
}
