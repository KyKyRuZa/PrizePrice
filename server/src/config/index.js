import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../");

dotenv.config({ path: path.join(serverRoot, ".env") });

function parseBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() === "true";
}

function parseNumber(value, defaultValue) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function clampNumber(value, min, max, defaultValue) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.min(max, Math.max(min, n));
}

function parseSameSite(value, defaultValue = "lax") {
  const normalized = String(value || defaultValue).toLowerCase();
  if (normalized === "none") return "none";
  if (normalized === "strict") return "strict";
  return "lax";
}

function parseCsvList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRedisMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "single" || mode === "sentinel" || mode === "cluster") {
    return mode;
  }
  return "";
}

function parseRedisDbFromUrl(url, fallback = 0) {
  try {
    const parsed = new URL(url);
    const rawPath = String(parsed.pathname || "").replace(/^\//, "");
    if (!rawPath) return fallback;
    const db = Number(rawPath);
    return Number.isInteger(db) && db >= 0 ? db : fallback;
  } catch {
    return fallback;
  }
}

const inferredNodeEnv = process.env.NODE_ENV || (process.env.VITEST ? "test" : "development");
const nodeEnv = String(inferredNodeEnv).toLowerCase();
const isProduction = nodeEnv === "production";
const lifecycleEvent = String(process.env.npm_lifecycle_event || "").toLowerCase();
const isVitestRuntime = process.argv.some((arg) => String(arg).toLowerCase().includes("vitest"));
const isTest = nodeEnv === "test" || Boolean(process.env.VITEST) || lifecycleEvent.startsWith("test") || isVitestRuntime;
const debugReturnOtpEnabled = parseBool(process.env.DEBUG_RETURN_OTP, nodeEnv === "development");
const debugAdminEnabled = parseBool(process.env.DEBUG_ADMIN, false);

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

const redisUrlList = parseCsvList(process.env.REDIS_URL || "redis://localhost:6379");
const redisUrl = redisUrlList[0] || "redis://localhost:6379";
const explicitSentinelUrls = parseCsvList(process.env.REDIS_SENTINELS || "");
const explicitClusterNodes = parseCsvList(process.env.REDIS_CLUSTER_NODES || "");
const explicitRedisMode = normalizeRedisMode(process.env.REDIS_MODE || "");

const inferredRedisMode = (() => {
  if (explicitRedisMode) return explicitRedisMode;
  if (explicitClusterNodes.length > 0) return "cluster";
  if (explicitSentinelUrls.length > 0) return "sentinel";
  if (redisUrlList.length > 1) return "sentinel";
  return "single";
})();

const redisMode = inferredRedisMode;
const redisSentinelUrls = redisMode === "sentinel"
  ? (explicitSentinelUrls.length > 0 ? explicitSentinelUrls : (redisUrlList.length > 1 ? redisUrlList : []))
  : [];
const redisClusterNodes = redisMode === "cluster"
  ? (explicitClusterNodes.length > 0 ? explicitClusterNodes : (redisUrlList.length > 1 ? redisUrlList : []))
  : [];
const redisScheme =
  redisUrl.startsWith("rediss://") ||
  redisSentinelUrls.some((url) => url.startsWith("rediss://")) ||
  redisClusterNodes.some((url) => url.startsWith("rediss://"))
    ? "rediss"
    : "redis";

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || "postgres://prizeprice:prizeprice@localhost:5432/prizeprice",

  redisMode,
  redisUrl,
  redisUrlList,
  redisSentinelUrls,
  redisClusterNodes,
  redisSentinelMasterName: String(process.env.REDIS_SENTINEL_MASTER_NAME || ""),
  redisUsername: String(process.env.REDIS_USERNAME || ""),
  redisPassword: String(process.env.REDIS_PASSWORD || ""),
  redisDatabase: parseNumber(process.env.REDIS_DB, parseRedisDbFromUrl(redisUrl, 0)),
  redisConnectTimeoutMs: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, 800),
  redisScheme,

  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  authAccessTokenTtlSeconds: parseNumber(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 15 * 60),
  authRefreshTokenTtlSeconds: parseNumber(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS, 30 * 24 * 60 * 60),
  authCookieAccessName: String(process.env.AUTH_COOKIE_ACCESS_NAME || "pp_access_token"),
  authCookieRefreshName: String(process.env.AUTH_COOKIE_REFRESH_NAME || "pp_refresh_token"),
  authCookieSameSite: parseSameSite(process.env.AUTH_COOKIE_SAMESITE, "lax"),
  authCookieSecure: parseBool(process.env.AUTH_COOKIE_SECURE, isProduction ? true : false),
  authCookieDomain: String(process.env.AUTH_COOKIE_DOMAIN || "").trim(),
  debugReturnOtp: !isProduction && debugReturnOtpEnabled,
  trustProxy: parseBool(process.env.TRUST_PROXY, false),
  bodyLimit: process.env.BODY_LIMIT || "1mb",
  metricsEnabled: parseBool(process.env.METRICS_ENABLED, isProduction ? false : true),
  metricsToken: process.env.METRICS_TOKEN || "",
  rateLimitRequireRedis: isProduction ? true : parseBool(process.env.RATE_LIMIT_REQUIRE_REDIS, false),
  otpRequireRedis: isProduction ? true : parseBool(process.env.OTP_REQUIRE_REDIS, false),
  apiRateLimitPublicWindowMs: parseNumber(process.env.API_RATE_LIMIT_PUBLIC_WINDOW_MS, 15 * 60 * 1000),
  apiRateLimitPublicMax: parseNumber(process.env.API_RATE_LIMIT_PUBLIC_MAX, isProduction ? 200 : 1000),
  apiRateLimitPrivateWindowMs: parseNumber(process.env.API_RATE_LIMIT_PRIVATE_WINDOW_MS, 15 * 60 * 1000),
  apiRateLimitPrivateMax: parseNumber(process.env.API_RATE_LIMIT_PRIVATE_MAX, isProduction ? 120 : 600),
  redisRequireHaInProduction: parseBool(process.env.REDIS_REQUIRE_HA_IN_PRODUCTION, isProduction ? true : false),
  redisRequireSentinelInProduction: parseBool(process.env.REDIS_REQUIRE_SENTINEL_IN_PRODUCTION, false),
  gracefulShutdownTimeoutMs: Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 10000),
  runDbMigrationsOnBoot: parseBool(process.env.RUN_DB_MIGRATIONS_ON_BOOT, isProduction ? false : true),
  seedOnBoot: parseBool(process.env.SEED_ON_BOOT, isProduction ? false : true),
  allowApiMigrationsOnBootInProduction:
    parseBool(process.env.ALLOW_API_MIGRATIONS_ON_BOOT_IN_PRODUCTION, false),
  allowApiSeedOnBootInProduction:
    parseBool(process.env.ALLOW_API_SEED_ON_BOOT_IN_PRODUCTION, false),
  allowApiPriceWatcherInProduction:
    parseBool(process.env.ALLOW_API_PRICE_WATCHER_IN_PRODUCTION, false),
  serviceRole: String(process.env.SERVICE_ROLE || "api").toLowerCase(),

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH || 8),

  priceWatcherEnabled: parseBool(process.env.PRICE_WATCHER_ENABLED, isProduction ? false : true),
  priceWatcherIntervalSeconds: Number(process.env.PRICE_WATCHER_INTERVAL_SECONDS || 60),
  priceWatcherNotifyCooldownMinutes: Number(process.env.PRICE_WATCHER_NOTIFY_COOLDOWN_MINUTES || 1440),
  priceWatcherBatchSize: Number(process.env.PRICE_WATCHER_BATCH_SIZE || 50),
  priceWatcherConcurrency: Number(process.env.PRICE_WATCHER_CONCURRENCY || 25),

  debugAdmin: !isProduction && debugAdminEnabled,

  smsaeroEmail: String(process.env.SMSAERO_EMAIL || "").trim(),
  smsaeroApiKey: String(process.env.SMSAERO_API_KEY || "").trim(),
  smsaeroSign: String(process.env.SMSAERO_SIGN || "PrizePrice").trim(),

   debugLogging: parseBool(process.env.DEBUG_LOGGING, !isProduction && !isTest),
   logFilePath: String(process.env.LOG_FILE_PATH || "").trim(),
   sentryDsn: String(process.env.SENTRY_DSN || "").trim(),
   sentryEnvironment: String(process.env.SENTRY_ENVIRONMENT || nodeEnv).trim() || nodeEnv,
   sentryRelease: String(process.env.SENTRY_RELEASE || process.env.npm_package_version || "").trim(),
   sentryTracesSampleRate: clampNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, 0, 1, 0),

   smsConsentPolicyUrl: String(process.env.SMS_CONSENT_POLICY_URL || "/sms-consent").trim(),
   privacyPolicyUrl: String(process.env.PRIVACY_POLICY_URL || "/privacy").trim(),
   termsUrl: String(process.env.TERMS_URL || "/terms").trim(),
   supportEmail: String(process.env.SUPPORT_EMAIL || "support@prizeprise.ru").trim(),
 };
