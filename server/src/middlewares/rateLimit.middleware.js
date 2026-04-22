import { incrementRateLimit } from '../services/rateLimit.service.js';
import { config } from "../config/index.js";
import { logger } from '../utils/logger.js';

function logDebug(message) {
  logger.debug(message);
}

function sendTooManyRequests(res, req, retryAfterSeconds, message) {
  const parsed = Number(retryAfterSeconds);
  const seconds = Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 0;
  if (seconds > 0) {
    res.setHeader("Retry-After", String(seconds));
  }

  const payload = {
    error: "TOO_MANY_REQUESTS",
    retryAfterSeconds: seconds,
    message,
  };
  if (req?.requestId) payload.requestId = req.requestId;
  return res.status(429).json(payload);
}

export function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
  } = options;

  return async (req, res, next) => {
    const key = keyGenerator(req);

    try {
      const result = await incrementRateLimit(key, windowMs, max);

      if (result.limited) {
        logDebug(`[RATE LIMIT MIDDLEWARE] Rate limit exceeded for IP: ${req.ip}, key: ${key}, count: ${result.count}/${result.max}`);
        return sendTooManyRequests(res, req, result.retryAfter, message);
      }

      if (!skipSuccessfulRequests) {
        res.setHeader('X-RateLimit-Limit', result.max);
        res.setHeader('X-RateLimit-Remaining', result.max - result.count);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      }

      next();
    } catch (error) {
      logDebug(
        `[RATE LIMIT MIDDLEWARE] Storage error for IP: ${req.ip}, key: ${key}, message: ${error?.message || "unknown"}`
      );
      const payload = {
        error: 'RATE_LIMIT_UNAVAILABLE',
        message: 'Rate limiting backend unavailable.',
      };
      if (req?.requestId) payload.requestId = req.requestId;
      return res.status(503).json(payload);
    }
  };
}

function normalizeRateLimitPolicy(policy, fallbackWindowMs, fallbackMax) {
  const windowMs = Number(policy?.windowMs);
  const max = Number(policy?.max);

  return {
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? Math.ceil(windowMs) : fallbackWindowMs,
    max: Number.isFinite(max) && max > 0 ? Math.ceil(max) : fallbackMax,
  };
}

function isPrivateApiRequest(req) {
  const path = String(req?.path || "");
  if (path === "/me" || path.startsWith("/me/")) return true;
  if (path === "/auth/user-data" || path.startsWith("/auth/user-data/")) return true;
  return false;
}

export function createTieredApiRateLimit(options = {}) {
  const {
    publicPolicy = { windowMs: 15 * 60 * 1000, max: 200 },
    privatePolicy = { windowMs: 15 * 60 * 1000, max: 120 },
    publicMessage = "Too many public API requests, please try again later.",
    privateMessage = "Too many private API requests, please try again later.",
    keyGenerator = (req, tier) => `api:${tier}:${req.ip}`,
    skipSuccessfulRequests = false,
  } = options;

  const normalizedPublic = normalizeRateLimitPolicy(publicPolicy, 15 * 60 * 1000, 200);
  const normalizedPrivate = normalizeRateLimitPolicy(privatePolicy, 15 * 60 * 1000, 120);

  return async (req, res, next) => {
    const tier = isPrivateApiRequest(req) ? "private" : "public";
    const policy = tier === "private" ? normalizedPrivate : normalizedPublic;
    const message = tier === "private" ? privateMessage : publicMessage;
    const key = keyGenerator(req, tier);

    try {
      const result = await incrementRateLimit(key, policy.windowMs, policy.max);

      if (result.limited) {
        logDebug(
          `[RATE LIMIT MIDDLEWARE] Tier limit exceeded for IP: ${req.ip}, tier: ${tier}, key: ${key}, count: ${result.count}/${result.max}`
        );
        return sendTooManyRequests(res, req, result.retryAfter, message);
      }

      if (!skipSuccessfulRequests) {
        res.setHeader('X-RateLimit-Limit', result.max);
        res.setHeader('X-RateLimit-Remaining', result.max - result.count);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      }

      next();
    } catch (error) {
      logDebug(
        `[RATE LIMIT MIDDLEWARE] Tier storage error for IP: ${req.ip}, tier: ${tier}, key: ${key}, message: ${error?.message || "unknown"}`
      );
      const payload = {
        error: 'RATE_LIMIT_UNAVAILABLE',
        message: 'Rate limiting backend unavailable.',
      };
      if (req?.requestId) payload.requestId = req.requestId;
      return res.status(503).json(payload);
    }
  };
}

const isTestRuntime = String(config.nodeEnv || "").toLowerCase() === "test";
const isDevelopmentRuntime = !config.isProduction && !isTestRuntime;

export const globalApiRateLimiter = createTieredApiRateLimit({
  publicPolicy: {
    windowMs: config.apiRateLimitPublicWindowMs,
    max: config.apiRateLimitPublicMax ?? (isDevelopmentRuntime ? 1000 : 200),
  },
  privatePolicy: {
    windowMs: config.apiRateLimitPrivateWindowMs,
    max: config.apiRateLimitPrivateMax ?? (isDevelopmentRuntime ? 600 : 120),
  },
  publicMessage: "Too many public API requests, please try again later.",
  privateMessage: "Too many private API requests, please try again later.",
  keyGenerator: (req, tier) => `api:${tier}:${req.ip}`,
});

export const authRateLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopmentRuntime ? 30 : 5,
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => `auth:${req.ip}:${req.path}`,
});

export const otpRateLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopmentRuntime ? 15 : 3,
  message: 'Too many OTP requests, please try again later.',
  keyGenerator: (req) => `otp:${req.ip}:${req.path}`,
});

export const passwordResetRateLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevelopmentRuntime ? 15 : 5,
  message: 'Too many password reset attempts, please try again later.',
  keyGenerator: (req) => `reset:${req.ip}:${req.path}`,
});
