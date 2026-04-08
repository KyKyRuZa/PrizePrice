function isValidPort(port) {
  const n = Number(port);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function hasStrongJwtSecret(secret) {
  return typeof secret === "string" && secret.length >= 32;
}

function isHttpsOrigin(origin) {
  return typeof origin === "string" && origin.startsWith("https://");
}

function isValidRedisUrl(url) {
  return typeof url === "string" && /^redis(s)?:\/\//.test(url);
}

function isLikelyIpAddress(hostname) {
  return /^[\d.]+$/.test(hostname) || hostname.includes(":");
}

function normalizeCookieDomain(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (source.includes("://") || source.includes("/") || source.includes("\\") || source.includes(":") || source.includes("@")) {
    return "";
  }
  return source.toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
}

function isValidCookieDomain(value) {
  const domain = normalizeCookieDomain(value);
  if (!domain || domain === "localhost" || domain.endsWith(".localhost")) return false;
  if (domain.includes("..") || isLikelyIpAddress(domain) || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-") &&
      /^[a-z0-9-]+$/i.test(label)
  );
}

export function runPreflightChecks(config, logger = console) {
  const errors = [];
  const warnings = [];
  const serviceRole = String(config.serviceRole || "api").toLowerCase();
  const validServiceRoles = new Set(["api", "watcher"]);
  const redisMode = String(config.redisMode || "single").toLowerCase();
  const validRedisModes = new Set(["single", "sentinel", "cluster"]);

  if (!validServiceRoles.has(serviceRole)) {
    errors.push(`SERVICE_ROLE must be one of: api, watcher (current: ${serviceRole})`);
  }

  if (!validRedisModes.has(redisMode)) {
    errors.push(`REDIS_MODE must be one of: single, sentinel, cluster (current: ${redisMode})`);
  }

  if (!isValidPort(config.port)) {
    errors.push(`PORT is invalid: "${config.port}"`);
  }

  if (!Number.isFinite(config.gracefulShutdownTimeoutMs) || config.gracefulShutdownTimeoutMs <= 0) {
    errors.push(`GRACEFUL_SHUTDOWN_TIMEOUT_MS must be > 0 (current: ${config.gracefulShutdownTimeoutMs})`);
  }

  if (!Number.isFinite(config.redisConnectTimeoutMs) || config.redisConnectTimeoutMs <= 0) {
    errors.push(`REDIS_CONNECT_TIMEOUT_MS must be > 0 (current: ${config.redisConnectTimeoutMs})`);
  }

  if (!Number.isInteger(config.redisDatabase) || config.redisDatabase < 0) {
    errors.push(`REDIS_DB must be an integer >= 0 (current: ${config.redisDatabase})`);
  }

  if (!Number.isFinite(config.apiRateLimitPublicWindowMs) || config.apiRateLimitPublicWindowMs <= 0) {
    errors.push(
      `API_RATE_LIMIT_PUBLIC_WINDOW_MS must be > 0 (current: ${config.apiRateLimitPublicWindowMs})`
    );
  }

  if (!Number.isFinite(config.apiRateLimitPublicMax) || config.apiRateLimitPublicMax <= 0) {
    errors.push(`API_RATE_LIMIT_PUBLIC_MAX must be > 0 (current: ${config.apiRateLimitPublicMax})`);
  }

  if (!Number.isFinite(config.apiRateLimitPrivateWindowMs) || config.apiRateLimitPrivateWindowMs <= 0) {
    errors.push(
      `API_RATE_LIMIT_PRIVATE_WINDOW_MS must be > 0 (current: ${config.apiRateLimitPrivateWindowMs})`
    );
  }

  if (!Number.isFinite(config.apiRateLimitPrivateMax) || config.apiRateLimitPrivateMax <= 0) {
    errors.push(`API_RATE_LIMIT_PRIVATE_MAX must be > 0 (current: ${config.apiRateLimitPrivateMax})`);
  }

  if (!Number.isFinite(config.priceWatcherBatchSize) || config.priceWatcherBatchSize <= 0) {
    errors.push(`PRICE_WATCHER_BATCH_SIZE must be > 0 (current: ${config.priceWatcherBatchSize})`);
  }

  if (!Number.isFinite(config.priceWatcherConcurrency) || config.priceWatcherConcurrency <= 0) {
    errors.push(
      `PRICE_WATCHER_CONCURRENCY must be > 0 (current: ${config.priceWatcherConcurrency})`
    );
  }

  if (!Number.isFinite(config.authAccessTokenTtlSeconds) || config.authAccessTokenTtlSeconds <= 0) {
    errors.push(
      `AUTH_ACCESS_TOKEN_TTL_SECONDS must be > 0 (current: ${config.authAccessTokenTtlSeconds})`
    );
  }

  if (!Number.isFinite(config.authRefreshTokenTtlSeconds) || config.authRefreshTokenTtlSeconds <= 0) {
    errors.push(
      `AUTH_REFRESH_TOKEN_TTL_SECONDS must be > 0 (current: ${config.authRefreshTokenTtlSeconds})`
    );
  }

  if (
    Number.isFinite(config.authAccessTokenTtlSeconds) &&
    Number.isFinite(config.authRefreshTokenTtlSeconds) &&
    config.authRefreshTokenTtlSeconds <= config.authAccessTokenTtlSeconds
  ) {
    errors.push("AUTH_REFRESH_TOKEN_TTL_SECONDS must be greater than AUTH_ACCESS_TOKEN_TTL_SECONDS");
  }

  if (config.isProduction) {
    if (!config.databaseUrl || !/^postgres(ql)?:\/\//.test(config.databaseUrl)) {
      errors.push("DATABASE_URL must be a valid postgres:// or postgresql:// URL in production");
    }

    if (!hasStrongJwtSecret(config.jwtSecret)) {
      errors.push("JWT_SECRET must be at least 32 characters in production");
    }

    if (!isHttpsOrigin(config.clientOrigin)) {
      errors.push("CLIENT_ORIGIN must use https:// in production");
    }

    if (!config.authCookieSecure) {
      errors.push("AUTH_COOKIE_SECURE must be true in production");
    }

    if (String(config.authCookieSameSite || "").toLowerCase() === "none") {
      errors.push("AUTH_COOKIE_SAMESITE must be lax or strict in production");
    }

    if (String(config.authCookieDomain || "").trim() && !isValidCookieDomain(config.authCookieDomain)) {
      errors.push(
        "AUTH_COOKIE_DOMAIN must be a valid domain without scheme/path/port/IP (example: app.example.com)"
      );
    }

    if (!config.otpRequireRedis) {
      errors.push("OTP_REQUIRE_REDIS must be true in production");
    }

    if (!config.rateLimitRequireRedis) {
      errors.push("RATE_LIMIT_REQUIRE_REDIS must be true in production");
    }

    const redisRequired = config.rateLimitRequireRedis || config.otpRequireRedis;
    if (redisRequired) {
      const requireHa = Boolean(config.redisRequireHaInProduction);
      const requireSentinel = Boolean(config.redisRequireSentinelInProduction);

      if (requireSentinel && redisMode !== "sentinel") {
        errors.push(
          "REDIS_REQUIRE_SENTINEL_IN_PRODUCTION=true requires Redis sentinel mode in production"
        );
      }

      if (requireHa && redisMode === "single") {
        errors.push(
          "REDIS_REQUIRE_HA_IN_PRODUCTION=true requires Redis sentinel or cluster mode in production"
        );
      }

      if (redisMode === "single") {
        warnings.push("Redis single mode is enabled in production; consider Sentinel mode for higher availability");
      }

      if (redisMode === "sentinel") {
        const sentinels = Array.isArray(config.redisSentinelUrls) ? config.redisSentinelUrls : [];
        if (sentinels.length === 0) {
          errors.push("REDIS_SENTINELS (or comma-separated REDIS_URL) must contain at least one sentinel URL in sentinel mode");
        } else {
          const invalidSentinels = sentinels.filter((url) => !isValidRedisUrl(url));
          if (invalidSentinels.length) {
            errors.push(`Invalid Redis sentinel URLs: ${invalidSentinels.join(", ")}`);
          }
          if (sentinels.length < 2) {
            if (requireSentinel || requireHa) {
              errors.push(
                "Redis HA policy requires at least 2 REDIS_SENTINELS entries"
              );
            } else {
              warnings.push("Redis Sentinel configured with fewer than 2 sentinels; failover quorum may be weak");
            }
          }
        }

        if (!String(config.redisSentinelMasterName || "").trim()) {
          errors.push("REDIS_SENTINEL_MASTER_NAME is required in sentinel mode");
        }
      } else if (redisMode === "cluster") {
        const clusterNodes = Array.isArray(config.redisClusterNodes) ? config.redisClusterNodes : [];
        if (clusterNodes.length === 0) {
          errors.push("REDIS_CLUSTER_NODES must contain at least one redis:// or rediss:// URL in cluster mode");
        } else {
          const invalidClusterNodes = clusterNodes.filter((url) => !isValidRedisUrl(url));
          if (invalidClusterNodes.length) {
            errors.push(`Invalid Redis cluster node URLs: ${invalidClusterNodes.join(", ")}`);
          }
          if (clusterNodes.length < 3) {
            if (requireHa) {
              errors.push(
                "REDIS_REQUIRE_HA_IN_PRODUCTION=true requires at least 3 REDIS_CLUSTER_NODES entries"
              );
            } else {
              warnings.push("Redis cluster configured with fewer than 3 nodes; resilience may be weak");
            }
          }
        }
      } else if (!isValidRedisUrl(config.redisUrl)) {
        errors.push("REDIS_URL must be a valid redis:// or rediss:// URL in production when Redis is required");
      }
    }

    if (config.debugReturnOtp) {
      errors.push("DEBUG_RETURN_OTP must be disabled in production");
    }

    if (config.debugAdmin) {
      errors.push("DEBUG_ADMIN must be disabled in production");
    }

    if (config.metricsEnabled && !config.metricsToken) {
      errors.push("METRICS_ENABLED=true requires METRICS_TOKEN in production");
    }

    const isApiRole = serviceRole === "api";

    if (config.seedOnBoot) {
      if (isApiRole && !config.allowApiSeedOnBootInProduction) {
        errors.push(
          "SEED_ON_BOOT=true is blocked for production API; set ALLOW_API_SEED_ON_BOOT_IN_PRODUCTION=true only for an explicit one-off rollout"
        );
      } else {
        warnings.push("SEED_ON_BOOT=true in production; ensure demo data seeding is intended");
      }
    }

    if (config.runDbMigrationsOnBoot) {
      if (isApiRole && !config.allowApiMigrationsOnBootInProduction) {
        errors.push(
          "RUN_DB_MIGRATIONS_ON_BOOT=true is blocked for production API; set ALLOW_API_MIGRATIONS_ON_BOOT_IN_PRODUCTION=true only for an explicit one-off rollout"
        );
      } else {
        warnings.push(
          "RUN_DB_MIGRATIONS_ON_BOOT=true in production; prefer running migrations as a separate deploy step"
        );
      }
    }

    if (config.priceWatcherEnabled && serviceRole !== "watcher") {
      if (isApiRole && !config.allowApiPriceWatcherInProduction) {
        errors.push(
          "PRICE_WATCHER_ENABLED=true is blocked for production API; set ALLOW_API_PRICE_WATCHER_IN_PRODUCTION=true only for an explicit one-off rollout"
        );
      } else {
        warnings.push(
          "PRICE_WATCHER_ENABLED=true in production for API process; use it only in a single-instance runtime or an explicitly coordinated deploy to avoid duplicate notifications"
        );
      }
    }

    if (Number(config.bcryptSaltRounds) < 10) {
      warnings.push(`BCRYPT_SALT_ROUNDS=${config.bcryptSaltRounds} is low for production (recommended >= 10)`);
    }
  }

  if (warnings.length) {
    for (const message of warnings) {
      logger.warn?.(`[Preflight] ${message}`);
    }
  }

  if (errors.length) {
    throw new Error(`[Preflight] failed:\n- ${errors.join("\n- ")}`);
  }

  logger.log?.(`[Preflight] OK (env=${config.nodeEnv})`);
  return { ok: true, warnings };
}
