import { config } from "../config/index.js";
import { startPriceWatcher } from "../jobs/priceWatcher.js";
import { initDb, sequelize } from "../models/index.js";
import { captureException, flushErrorTracker, initErrorTracker } from "../observability/errorTracker.js";
import { runPreflightChecks } from "../preflight/index.js";
import { closeLogger, logger } from "../utils/logger.js";

async function main() {
  initErrorTracker();
  runPreflightChecks({ ...config, serviceRole: "watcher" }, logger);

  if (!config.priceWatcherEnabled) {
    logger.error("watcher_disabled", {
      message:
        "PRICE_WATCHER_ENABLED=false. Set PRICE_WATCHER_ENABLED=true to run the watcher runtime.",
    });
    process.exit(1);
  }

  const migrationInfo = await initDb();
  logger.info("watcher_migrations_status", migrationInfo);

  const watcher = startPriceWatcher();
  logger.info("watcher_worker_started");

  let shuttingDown = false;
  const stop = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("watcher_worker_shutdown_signal", { signal });

    try {
      watcher?.stop?.();
    } catch {
      // ignore watcher stop errors
    }

    await Promise.allSettled([sequelize.close(), flushErrorTracker(), closeLogger()]);
    process.exit(0);
  };

  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((error) => {
  captureException(error, {
    level: "fatal",
    tags: { source: "watcher_worker_bootstrap" },
  });
  logger.error("watcher_worker_failed", {
    message: error?.message,
    stack: error?.stack,
  });
  void Promise.allSettled([flushErrorTracker(), closeLogger()]).finally(() => process.exit(1));
});
