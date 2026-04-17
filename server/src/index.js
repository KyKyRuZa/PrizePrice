import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { initDb, seedDbIfEmpty, sequelize } from "./models/index.js";
import { closeOtpStorage, initOtpStorage } from "./services/otp.service.js";
import { closeRateLimitStorage, initRateLimitStorage } from "./services/rateLimit.service.js";
import { startPriceWatcher } from "./jobs/priceWatcher.js";
import { runPreflightChecks } from "./preflight/index.js";
import { setNotReady, setReady } from "./runtime/readiness.js";
import { closeLogger, logger } from "./utils/logger.js";
import { captureException, flushErrorTracker, initErrorTracker } from "./observability/errorTracker.js";
import { startActiveUsersUpdater, stopActiveUsersUpdater } from "./utils/activeUsersUpdater.js";

initErrorTracker();
const app = createApp();

async function bootstrap() {
  setNotReady("BOOTING");
  runPreflightChecks(config);

   const migrationInfo = await initDb();
   logger.info("migrations_status", migrationInfo);
   if (config.seedOnBoot) {
     await seedDbIfEmpty();
     logger.info("seed_boot_enabled");
   } else {
     logger.info("seed_boot_skipped");
   }

   // Start active users metric updater
   startActiveUsersUpdater();
   logger.info("active_users_updater_started");

  const otpInfo = await initOtpStorage();
  logger.info("otp_storage_ready", { driver: otpInfo.driver });

  const rateLimitInfo = await initRateLimitStorage();
  logger.info("rate_limit_storage_ready", { driver: rateLimitInfo.driver });

  setReady();

  const server = app.listen(config.port, () => {
    logger.info("server_listening", { port: config.port });
  });

  // Background watcher: отслеживание цены и уведомления
  const watcher = startPriceWatcher();
  let shuttingDown = false;
  const stop = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    setNotReady("SHUTTING_DOWN");
    logger.info("shutdown_signal_received", { signal, exitCode });

   try {
     watcher?.stop?.();
     stopActiveUsersUpdater();
   } catch {
     /* ignore */
   }

    try {
      await Promise.race([
        new Promise((resolve) => {
          server.close(() => resolve());
        }),
        new Promise((resolve) => setTimeout(resolve, config.gracefulShutdownTimeoutMs)),
      ]);
      await Promise.allSettled([
        closeOtpStorage(),
        closeRateLimitStorage(),
        sequelize.close(),
        flushErrorTracker(),
        closeLogger(),
      ]);
    } catch (error) {
      logger.error("shutdown_failed", { message: error?.message, stack: error?.stack });
      exitCode = 1;
    }

    process.exit(exitCode);
  };

  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("uncaughtException", (error) => {
    captureException(error, {
      level: "fatal",
      tags: { source: "process", handler: "uncaughtException" },
    });
    logger.error("uncaught_exception", { message: error?.message, stack: error?.stack });
    void stop("UNCAUGHT_EXCEPTION", 1);
  });
  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    captureException(error, {
      level: "error",
      tags: { source: "process", handler: "unhandledRejection" },
    });
    logger.error("unhandled_rejection", { message: error.message, stack: error.stack });
    void stop("UNHANDLED_REJECTION", 1);
  });
}

bootstrap().catch((e) => {
  captureException(e, {
    level: "fatal",
    tags: { source: "bootstrap" },
  });
  setNotReady("BOOT_FAILED");
  logger.error("bootstrap_failed", { message: e?.message, stack: e?.stack });
  process.exit(1);
});
