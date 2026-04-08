import { runPreflightChecks } from "../preflight/index.js";

function parseBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() === "true";
}

function parseNumber(value, defaultValue) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
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

function fail(message) {
  throw new Error(`[Preflight CI] ${message}`);
}

const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "CLIENT_ORIGIN"];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  fail(`Missing required environment variables: ${missing.join(", ")}`);
}

const jwtSecret = String(process.env.JWT_SECRET || "");
if (jwtSecret.length < 32) {
  fail("JWT_SECRET must be at least 32 characters");
}

if (/change_me|dev_secret|test|example/i.test(jwtSecret)) {
  fail("JWT_SECRET looks like a placeholder value");
}

const redisUrlList = parseCsvList(process.env.REDIS_URL || "");
const redisUrl = redisUrlList[0] || "";
const explicitSentinelUrls = parseCsvList(process.env.REDIS_SENTINELS || "");
const explicitClusterNodes = parseCsvList(process.env.REDIS_CLUSTER_NODES || "");
const explicitRedisMode = normalizeRedisMode(process.env.REDIS_MODE || "");
const redisMode = (() => {
  if (explicitRedisMode) return explicitRedisMode;
  if (explicitClusterNodes.length > 0) return "cluster";
  if (explicitSentinelUrls.length > 0) return "sentinel";
  if (redisUrlList.length > 1) return "sentinel";
  return "single";
})();
const redisSentinelUrls = redisMode === "sentinel"
  ? (explicitSentinelUrls.length > 0 ? explicitSentinelUrls : (redisUrlList.length > 1 ? redisUrlList : []))
  : [];
const redisClusterNodes = redisMode === "cluster"
  ? (explicitClusterNodes.length > 0 ? explicitClusterNodes : (redisUrlList.length > 1 ? redisUrlList : []))
  : [];

if (redisMode === "single" && !redisUrl) {
  fail("REDIS_URL is required when REDIS_MODE=single");
}
if (redisMode === "sentinel" && redisSentinelUrls.length === 0) {
  fail("REDIS_SENTINELS (or comma-separated REDIS_URL) is required when REDIS_MODE=sentinel");
}
if (redisMode === "cluster" && redisClusterNodes.length === 0) {
  fail("REDIS_CLUSTER_NODES (or comma-separated REDIS_URL with REDIS_MODE=cluster) is required when REDIS_MODE=cluster");
}

const ciConfig = {
  nodeEnv: "production",
  isProduction: true,
  port: parseNumber(process.env.PORT, 3001),
  databaseUrl: String(process.env.DATABASE_URL || ""),

  redisMode,
  redisUrl,
  redisUrlList,
  redisSentinelUrls,
  redisClusterNodes,
  redisSentinelMasterName: String(process.env.REDIS_SENTINEL_MASTER_NAME || ""),
  redisDatabase: parseNumber(process.env.REDIS_DB, parseRedisDbFromUrl(redisUrl, 0)),
  redisConnectTimeoutMs: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, 800),

  jwtSecret,
  clientOrigin: String(process.env.CLIENT_ORIGIN || ""),
  authAccessTokenTtlSeconds: parseNumber(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS, 15 * 60),
  authRefreshTokenTtlSeconds: parseNumber(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS, 30 * 24 * 60 * 60),
  debugReturnOtp: parseBool(process.env.DEBUG_RETURN_OTP, false),
  debugAdmin: parseBool(process.env.DEBUG_ADMIN, false),
  metricsEnabled: parseBool(process.env.METRICS_ENABLED, false),
  metricsToken: String(process.env.METRICS_TOKEN || ""),
  rateLimitRequireRedis: parseBool(process.env.RATE_LIMIT_REQUIRE_REDIS, true),
  otpRequireRedis: parseBool(process.env.OTP_REQUIRE_REDIS, true),
  apiRateLimitPublicWindowMs: parseNumber(process.env.API_RATE_LIMIT_PUBLIC_WINDOW_MS, 15 * 60 * 1000),
  apiRateLimitPublicMax: parseNumber(process.env.API_RATE_LIMIT_PUBLIC_MAX, 200),
  apiRateLimitPrivateWindowMs: parseNumber(process.env.API_RATE_LIMIT_PRIVATE_WINDOW_MS, 15 * 60 * 1000),
  apiRateLimitPrivateMax: parseNumber(process.env.API_RATE_LIMIT_PRIVATE_MAX, 120),
  redisRequireHaInProduction: parseBool(process.env.REDIS_REQUIRE_HA_IN_PRODUCTION, true),
  redisRequireSentinelInProduction: parseBool(process.env.REDIS_REQUIRE_SENTINEL_IN_PRODUCTION, false),
  runDbMigrationsOnBoot: parseBool(process.env.RUN_DB_MIGRATIONS_ON_BOOT, false),
  seedOnBoot: parseBool(process.env.SEED_ON_BOOT, false),
  allowApiMigrationsOnBootInProduction: parseBool(
    process.env.ALLOW_API_MIGRATIONS_ON_BOOT_IN_PRODUCTION,
    false
  ),
  allowApiSeedOnBootInProduction: parseBool(
    process.env.ALLOW_API_SEED_ON_BOOT_IN_PRODUCTION,
    false
  ),
  allowApiPriceWatcherInProduction: parseBool(
    process.env.ALLOW_API_PRICE_WATCHER_IN_PRODUCTION,
    false
  ),
  priceWatcherEnabled: parseBool(process.env.PRICE_WATCHER_ENABLED, false),
  priceWatcherBatchSize: parseNumber(process.env.PRICE_WATCHER_BATCH_SIZE, 50),
  priceWatcherConcurrency: parseNumber(process.env.PRICE_WATCHER_CONCURRENCY, 25),
  serviceRole: String(process.env.SERVICE_ROLE || "api").toLowerCase(),
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  gracefulShutdownTimeoutMs: parseNumber(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10000),
};

runPreflightChecks(ciConfig);
console.log("[Preflight CI] OK");
