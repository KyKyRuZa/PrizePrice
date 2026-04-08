import SequelizePkg from "sequelize";

import { runPriceWatcherIteration } from "../jobs/priceWatcher.js";
import {
  initDb,
  sequelize,
  Notification,
  Offer,
  PriceHistory,
  PriceWatch,
  Product,
  User,
} from "../models/index.js";
import { captureException, flushErrorTracker, initErrorTracker } from "../observability/errorTracker.js";
import { closeLogger, logger } from "../utils/logger.js";

const { Op } = SequelizePkg;

const DEFAULT_WATCH_COUNT = 1000;
const DEFAULT_CYCLES = 1;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_CONCURRENCY = 25;
const DEFAULT_TARGET_CYCLE_SECONDS = 30;
const DEFAULT_INSERT_CHUNK_SIZE = 500;

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

function parseNonNegativeInt(value, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return fallback;
  return n;
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value, fallback = false) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === "true";
}

function toMiB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function snapshotMemory() {
  const m = process.memoryUsage();
  return {
    rss: m.rss,
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    external: m.external,
  };
}

function mergePeakMemory(currentPeak, sample) {
  if (!currentPeak) return { ...sample };
  return {
    rss: Math.max(currentPeak.rss, sample.rss),
    heapUsed: Math.max(currentPeak.heapUsed, sample.heapUsed),
    heapTotal: Math.max(currentPeak.heapTotal, sample.heapTotal),
    external: Math.max(currentPeak.external, sample.external),
  };
}

async function bulkCreateInChunks(Model, rows, { transaction, chunkSize = DEFAULT_INSERT_CHUNK_SIZE } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const size = Math.max(1, Number(chunkSize) || DEFAULT_INSERT_CHUNK_SIZE);
  for (let offset = 0; offset < rows.length; offset += size) {
    const chunk = rows.slice(offset, offset + size);
    await Model.bulkCreate(chunk, { transaction });
  }
}

async function seedLoadDataset({ watchCount, runId, insertChunkSize }) {
  return await sequelize.transaction(async (transaction) => {
    const maxProductId = await Product.max("id", { transaction });
    const baseProductId = Math.max(1_000_000, Number(maxProductId || 0) + 1000);

    const user = await User.create(
      {
        phone: `+7999${String(runId).slice(-7)}${String(process.pid % 1000).padStart(3, "0")}`,
        email: `watcher-load-${runId}@example.com`,
        name: `watcher-load-${runId}`,
      },
      { transaction }
    );

    const products = [];
    const offers = [];
    const watches = [];
    const productIds = [];

    for (let i = 0; i < watchCount; i += 1) {
      const productId = baseProductId + i;
      productIds.push(productId);

      products.push({
        id: productId,
        name: `Watcher Load Product ${i + 1}`,
        category: "Load Test",
        image: "",
        rating: 4.5,
        reviews: 0,
        isBestPrice: false,
      });

      const price = 10_000 + (i % 500);
      offers.push({
        productId,
        marketplace: "LoadShop",
        price,
        oldPrice: price + 100,
        discount: 1,
        link: `https://example.com/load/${runId}/${productId}`,
      });

      watches.push({
        userId: user.id,
        productId,
        targetPrice: null,
        dropPercent: null,
        active: true,
        lastSeenPrice: null,
        lastCheckedAt: null,
        lastNotifiedAt: null,
        lastNotifiedPrice: null,
      });
    }

    await bulkCreateInChunks(Product, products, { transaction, chunkSize: insertChunkSize });
    await bulkCreateInChunks(Offer, offers, { transaction, chunkSize: insertChunkSize });
    await bulkCreateInChunks(PriceWatch, watches, { transaction, chunkSize: insertChunkSize });

    return {
      userId: user.id,
      productIds,
      watchCount,
    };
  });
}

async function cleanupLoadDataset(dataset) {
  if (!dataset) return;
  const { userId, productIds } = dataset;

  await sequelize.transaction(async (transaction) => {
    await PriceWatch.destroy({ where: { userId }, transaction });
    await Notification.destroy({ where: { userId }, transaction });

    if (Array.isArray(productIds) && productIds.length > 0) {
      await PriceHistory.destroy({
        where: { productId: { [Op.in]: productIds } },
        transaction,
      });
      await Offer.destroy({
        where: { productId: { [Op.in]: productIds } },
        transaction,
      });
      await Product.destroy({
        where: { id: { [Op.in]: productIds } },
        transaction,
      });
    }

    await User.destroy({ where: { id: userId }, transaction });
  });
}

async function runMeasuredCycle({ batchSize, concurrencyLimit }) {
  let peakMemory = snapshotMemory();
  const memoryBefore = peakMemory;

  const sampler = setInterval(() => {
    peakMemory = mergePeakMemory(peakMemory, snapshotMemory());
  }, 100);

  const cpuStart = process.cpuUsage();
  const startedAt = process.hrtime.bigint();

  try {
    const result = await runPriceWatcherIteration({
      stoppedRef: { value: false },
      cooldownMin: 0,
      batchSize,
      concurrencyLimit,
    });

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const cpuDiff = process.cpuUsage(cpuStart);
    const cpuMs = (cpuDiff.user + cpuDiff.system) / 1000;
    const cpuPercentSingleCore = durationMs > 0 ? Number(((cpuMs / durationMs) * 100).toFixed(2)) : 0;

    const memoryAfter = snapshotMemory();
    peakMemory = mergePeakMemory(peakMemory, memoryAfter);

    return {
      result,
      durationMs,
      cpuMs: Number(cpuMs.toFixed(2)),
      cpuPercentSingleCore,
      memoryBefore,
      memoryAfter,
      peakMemory,
    };
  } finally {
    clearInterval(sampler);
  }
}

async function main() {
  initErrorTracker();

  const watchCount = parsePositiveInt(process.env.WATCHER_LOAD_WATCH_COUNT, DEFAULT_WATCH_COUNT);
  const cycles = parsePositiveInt(process.env.WATCHER_LOAD_CYCLES, DEFAULT_CYCLES);
  const batchSize = parsePositiveInt(process.env.WATCHER_LOAD_BATCH_SIZE, DEFAULT_BATCH_SIZE);
  const concurrencyLimit = parsePositiveInt(process.env.WATCHER_LOAD_CONCURRENCY, DEFAULT_CONCURRENCY);
  const targetCycleSeconds = parseNumber(
    process.env.WATCHER_LOAD_TARGET_CYCLE_SECONDS,
    DEFAULT_TARGET_CYCLE_SECONDS
  );
  const cleanup = parseBool(process.env.WATCHER_LOAD_CLEANUP, true);
  const insertChunkSize = parsePositiveInt(process.env.WATCHER_LOAD_INSERT_CHUNK_SIZE, DEFAULT_INSERT_CHUNK_SIZE);
  const warmupCycles = parseNonNegativeInt(process.env.WATCHER_LOAD_WARMUP_CYCLES, 0);

  logger.info("watcher_load_test_started", {
    watchCount,
    cycles,
    warmupCycles,
    batchSize,
    concurrencyLimit,
    targetCycleSeconds,
    cleanup,
    insertChunkSize,
  });

  let dataset = null;

  try {
    await initDb();

    const runId = Date.now();
    dataset = await seedLoadDataset({ watchCount, runId, insertChunkSize });

    logger.info("watcher_load_seed_complete", {
      runId,
      userId: dataset.userId,
      watchCount: dataset.watchCount,
    });

    for (let i = 0; i < warmupCycles; i += 1) {
      await runPriceWatcherIteration({
        stoppedRef: { value: false },
        cooldownMin: 0,
        batchSize,
        concurrencyLimit,
      });
      logger.info("watcher_load_warmup_cycle_complete", { cycle: i + 1 });
    }

    const cycleReports = [];
    let totalProcessed = 0;
    let totalErrors = 0;
    let maxCycleSeconds = 0;
    let peakRssBytes = 0;
    let peakHeapUsedBytes = 0;
    let peakHeapTotalBytes = 0;
    let peakExternalBytes = 0;

    for (let i = 0; i < cycles; i += 1) {
      const cycle = await runMeasuredCycle({ batchSize, concurrencyLimit });
      const cycleSeconds = Number((cycle.durationMs / 1000).toFixed(3));

      totalProcessed += cycle.result.processed;
      totalErrors += cycle.result.errors;
      maxCycleSeconds = Math.max(maxCycleSeconds, cycleSeconds);
      peakRssBytes = Math.max(peakRssBytes, cycle.peakMemory.rss);
      peakHeapUsedBytes = Math.max(peakHeapUsedBytes, cycle.peakMemory.heapUsed);
      peakHeapTotalBytes = Math.max(peakHeapTotalBytes, cycle.peakMemory.heapTotal);
      peakExternalBytes = Math.max(peakExternalBytes, cycle.peakMemory.external);

      const report = {
        cycle: i + 1,
        durationSeconds: cycleSeconds,
        processed: cycle.result.processed,
        errors: cycle.result.errors,
        cpuPercentSingleCore: cycle.cpuPercentSingleCore,
        rssMiBBefore: toMiB(cycle.memoryBefore.rss),
        rssMiBAfter: toMiB(cycle.memoryAfter.rss),
        rssMiBPeak: toMiB(cycle.peakMemory.rss),
        heapUsedMiBPeak: toMiB(cycle.peakMemory.heapUsed),
      };

      cycleReports.push(report);
      logger.info("watcher_load_cycle_complete", report);
    }

    const avgCycleSeconds = Number(
      (cycleReports.reduce((acc, r) => acc + r.durationSeconds, 0) / Math.max(1, cycleReports.length)).toFixed(3)
    );
    const passedByDuration = maxCycleSeconds < targetCycleSeconds;
    const passedByErrors = totalErrors === 0;
    const pass = passedByDuration && passedByErrors;

    const summary = {
      pass,
      targetCycleSeconds,
      watchCount,
      cycles,
      warmupCycles,
      batchSize,
      concurrencyLimit,
      totalProcessed,
      totalErrors,
      maxCycleSeconds: Number(maxCycleSeconds.toFixed(3)),
      avgCycleSeconds,
      peakRssMiB: toMiB(peakRssBytes),
      peakHeapUsedMiB: toMiB(peakHeapUsedBytes),
      peakHeapTotalMiB: toMiB(peakHeapTotalBytes),
      peakExternalMiB: toMiB(peakExternalBytes),
      cycleReports,
    };

    console.log(JSON.stringify({ type: "watcher_load_test_summary", ...summary }, null, 2));

    if (!pass) {
      logger.error("watcher_load_test_failed", summary);
      process.exitCode = 1;
    } else {
      logger.info("watcher_load_test_passed", {
        watchCount,
        cycles,
        maxCycleSeconds: summary.maxCycleSeconds,
        totalErrors,
      });
    }
  } finally {
    if (cleanup && dataset) {
      try {
        await cleanupLoadDataset(dataset);
        logger.info("watcher_load_cleanup_complete", {
          userId: dataset.userId,
          productCount: dataset.productIds.length,
        });
      } catch (cleanupError) {
        captureException(cleanupError, {
          level: "error",
          tags: { source: "watcher_load_test", stage: "cleanup" },
        });
        logger.error("watcher_load_cleanup_failed", {
          message: cleanupError?.message,
          stack: cleanupError?.stack,
        });
        process.exitCode = 1;
      }
    }

    await Promise.allSettled([sequelize.close(), flushErrorTracker(), closeLogger()]);
  }
}

main().catch((error) => {
  captureException(error, {
    level: "fatal",
    tags: { source: "watcher_load_test", stage: "main" },
  });
  logger.error("watcher_load_test_crashed", {
    message: error?.message,
    stack: error?.stack,
  });
  void Promise.allSettled([flushErrorTracker(), closeLogger()]).finally(() => {
    process.exit(1);
  });
});