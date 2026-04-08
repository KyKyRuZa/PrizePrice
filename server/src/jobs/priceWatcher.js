import SequelizePkg from "sequelize";

import { config } from "../config/index.js";
import {
  watcherCycleDurationSeconds,
  watcherErrorsTotal,
  watcherProcessedWatchesTotal,
} from "./priceWatcher.metrics.js";
import { Offer, PriceWatch, Product } from "../models/index.js";
import { createNotification } from "../services/notifications.service.js";
import { recordPriceHistory } from "../services/priceHistory.service.js";
import { updateWatchRuntime } from "../services/priceWatch.service.js";
import { captureException } from "../observability/errorTracker.js";
import { logger } from "../utils/logger.js";

const { Op } = SequelizePkg;

const DEFAULT_NOTIFY_COOLDOWN_MINUTES = 1440;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_CONCURRENCY_LIMIT = 25;
const DEFAULT_WATCHER_INTERVAL_SECONDS = 60;

function minutesBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return Math.abs(db.getTime() - da.getTime()) / 60000;
}

function resolveCooldownMinutes(value = config.priceWatcherNotifyCooldownMinutes) {
  const raw = value ?? DEFAULT_NOTIFY_COOLDOWN_MINUTES;
  return Math.max(0, Number(raw) || 0);
}

function resolveBatchSize(value = config.priceWatcherBatchSize) {
  const raw = value ?? DEFAULT_BATCH_SIZE;
  return Math.max(1, Number(raw) || 1);
}

function resolveConcurrencyLimit(value = config.priceWatcherConcurrency) {
  const raw = value ?? DEFAULT_CONCURRENCY_LIMIT;
  return Math.max(1, Number(raw) || 1);
}

function captureWatcherError(stage, error) {
  captureException(error, {
    level: "error",
    tags: {
      source: "price_watcher",
      stage,
    },
  });
}

function logWatcherError(eventName, error) {
  logger.error(eventName, {
    message: error?.message,
    stack: error?.stack,
  });
}

function resolveWatchProductId(watch) {
  const rawProductId = watch?.productId ?? watch?.toJSON?.().productId;
  const productId = Number(rawProductId);
  return Number.isFinite(productId) ? productId : null;
}

function collectUniqueWatchProductIds(watches) {
  return Array.from(
    new Set(
      watches
        .map(resolveWatchProductId)
        .filter((value) => Number.isFinite(value))
    )
  );
}

async function fetchBestOfferByProductId(productIds) {
  const bestOfferByProductId = new Map();
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return bestOfferByProductId;
  }

  const offers = await Offer.findAll({
    where: { productId: { [Op.in]: productIds } },
    attributes: ["productId", "marketplace", "price", "link"],
    order: [
      ["productId", "ASC"],
      ["price", "ASC"],
    ],
    raw: true,
  });

  for (const offer of offers) {
    const productId = Number(offer?.productId);
    if (!Number.isFinite(productId) || bestOfferByProductId.has(productId)) continue;
    bestOfferByProductId.set(productId, offer);
  }

  return bestOfferByProductId;
}

function observeIterationMetrics({ iterationStartedAt, processed, errorCounts }) {
  const durationSeconds = Number(process.hrtime.bigint() - iterationStartedAt) / 1e9;
  watcherCycleDurationSeconds.observe(durationSeconds);

  if (processed > 0) {
    watcherProcessedWatchesTotal.inc(processed);
  }

  if (errorCounts.history > 0) {
    watcherErrorsTotal.labels("history").inc(errorCounts.history);
  }
  if (errorCounts.watch > 0) {
    watcherErrorsTotal.labels("watch").inc(errorCounts.watch);
  }
  if (errorCounts.iteration > 0) {
    watcherErrorsTotal.labels("iteration").inc(errorCounts.iteration);
  }
}

async function recordPriceHistorySnapshots(bestOfferByProductId, { stoppedRef }) {
  if (stoppedRef?.value) return { attempted: 0, errors: 0 };
  const entries = Array.from(bestOfferByProductId?.entries?.() || []);
  if (!entries.length) return { attempted: 0, errors: 0 };

  const historyTasks = [];
  for (const [productId, best] of entries) {
    const currentPrice = Number(best?.price);
    if (!Number.isFinite(currentPrice)) continue;

    historyTasks.push(recordPriceHistory(productId, "best", currentPrice));
    if (best?.marketplace) {
      historyTasks.push(recordPriceHistory(productId, String(best.marketplace), currentPrice));
    }
  }

  if (!historyTasks.length) return { attempted: 0, errors: 0 };
  const results = await Promise.allSettled(historyTasks);
  let errors = 0;

  for (const result of results) {
    if (result.status !== "rejected") continue;
    errors += 1;
    captureWatcherError("history", result.reason);
    logWatcherError("watcher_history_record_failed", result.reason);
  }

  return {
    attempted: historyTasks.length,
    errors,
  };
}

function splitIntoBatches(items, batchSize) {
  if (!Array.isArray(items) || !items.length) return [];
  const size = Math.max(1, Number(batchSize) || 1);
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

async function processBatchWithConcurrency(batch, { stoppedRef, concurrencyLimit, worker }) {
  if (!Array.isArray(batch) || !batch.length) {
    return { processed: 0, errors: 0 };
  }

  const effectiveLimit = Math.max(1, Math.min(Number(concurrencyLimit) || 1, batch.length));
  let cursor = 0;
  let processed = 0;
  let errors = 0;

  async function runWorker() {
    while (!stoppedRef?.value) {
      if (cursor >= batch.length) return;
      const currentIndex = cursor;
      cursor += 1;

      try {
        await worker(batch[currentIndex]);
        processed += 1;
      } catch (error) {
        errors += 1;
        captureWatcherError("watch", error);
        logWatcherError("watcher_record_failed", error);
      }
    }
  }

  await Promise.all(Array.from({ length: effectiveLimit }, () => runWorker()));
  return { processed, errors };
}

async function processWatchRecord(wInst, { stoppedRef, cooldownMin, bestOfferByProductId }) {
  if (stoppedRef?.value) return;

  const w = wInst.toJSON();
  const productId = Number(w.productId);
  const userId = Number(w.userId);

  const best = bestOfferByProductId?.get?.(productId) || null;

  const now = new Date();

  if (!best) {
    await updateWatchRuntime(productId, userId, { lastCheckedAt: now });
    return;
  }

  const name = w.product?.name || "Product";
  const currentPrice = Number(best.price);
  const prevSeen = w.lastSeenPrice != null ? Number(w.lastSeenPrice) : null;

  const minsSinceNotified = w.lastNotifiedAt ? minutesBetween(w.lastNotifiedAt, now) : null;
  const inCooldown = minsSinceNotified != null && minsSinceNotified < cooldownMin;

  const targetPrice = w.targetPrice != null ? Number(w.targetPrice) : null;
  const dropPercent = w.dropPercent != null ? Number(w.dropPercent) : null;
  const lastNotifiedPrice = w.lastNotifiedPrice != null ? Number(w.lastNotifiedPrice) : null;

  let shouldNotify = false;
  let title = "";
  let body = "";

  if (!inCooldown && targetPrice != null && Number.isFinite(targetPrice)) {
    if (prevSeen == null) {
      if (currentPrice <= targetPrice) {
        shouldNotify = true;
        title = "Target price reached";
        body = `${name}: current ${currentPrice} <= target ${targetPrice} (${best.marketplace})`;
      }
    } else {
      const crossed = prevSeen > targetPrice && currentPrice <= targetPrice;
      if (crossed) {
        shouldNotify = true;
        title = "Price crossed target";
        body = `${name}: dropped to ${currentPrice} (target ${targetPrice}) on ${best.marketplace}`;
      }
    }
  }

  if (!shouldNotify && !inCooldown && dropPercent != null && Number.isFinite(dropPercent) && dropPercent > 0) {
    if (prevSeen != null && prevSeen > 0) {
      const drop = ((prevSeen - currentPrice) / prevSeen) * 100;
      if (drop >= dropPercent) {
        shouldNotify = true;
        title = "Price dropped";
        body = `${name}: down ${Math.round(drop)}% to ${currentPrice} on ${best.marketplace}`;
      }
    }
  }

  if (shouldNotify && lastNotifiedPrice != null && currentPrice >= lastNotifiedPrice) {
    shouldNotify = false;
  }

  if (shouldNotify) {
    await createNotification(userId, {
      type: "PRICE",
      productId,
      title,
      body,
      link: best.link || "",
    });
    logger.info("watcher_notification_created", {
      userId,
      productId,
      price: currentPrice,
      marketplace: best.marketplace || null,
    });
  }

  const runtimePatch = {
    lastSeenPrice: currentPrice,
    lastCheckedAt: now,
  };
  if (shouldNotify) {
    runtimePatch.lastNotifiedAt = now;
    runtimePatch.lastNotifiedPrice = currentPrice;
  }

  await updateWatchRuntime(productId, userId, runtimePatch);
}

export async function runPriceWatcherIteration({
  stoppedRef = { value: false },
  cooldownMin,
  batchSize,
  concurrencyLimit,
} = {}) {
  const iterationStartedAt = process.hrtime.bigint();
  const effectiveCooldownMin = resolveCooldownMinutes(cooldownMin);
  const effectiveBatchSize = resolveBatchSize(batchSize);
  const effectiveConcurrencyLimit = resolveConcurrencyLimit(concurrencyLimit);

  let processed = 0;
  let total = 0;
  const errorCounts = { history: 0, watch: 0, iteration: 0 };

  try {
    const watches = await PriceWatch.findAll({
      where: { active: true },
      include: [{ model: Product, as: "product", attributes: ["id", "name"] }],
    });

    total = watches.length;
    const productIds = collectUniqueWatchProductIds(watches);
    const bestOfferByProductId = await fetchBestOfferByProductId(productIds);

    const historyStats = await recordPriceHistorySnapshots(bestOfferByProductId, { stoppedRef });
    errorCounts.history += historyStats.errors;

    const batches = splitIntoBatches(watches, effectiveBatchSize);
    for (const batch of batches) {
      if (stoppedRef.value) break;

      const batchStats = await processBatchWithConcurrency(batch, {
        stoppedRef,
        concurrencyLimit: effectiveConcurrencyLimit,
        worker: (wInst) =>
          processWatchRecord(wInst, {
            stoppedRef,
            cooldownMin: effectiveCooldownMin,
            bestOfferByProductId,
          }),
      });

      processed += batchStats.processed;
      errorCounts.watch += batchStats.errors;
    }

    return {
      total,
      processed,
      errors: errorCounts.history + errorCounts.watch + errorCounts.iteration,
      batchSize: effectiveBatchSize,
      concurrencyLimit: effectiveConcurrencyLimit,
    };
  } catch (error) {
    errorCounts.iteration += 1;
    captureWatcherError("iteration", error);
    throw error;
  } finally {
    observeIterationMetrics({ iterationStartedAt, processed, errorCounts });
  }
}

export function startPriceWatcher() {
  if (!config.priceWatcherEnabled) {
    logger.info("watcher_disabled", { reason: "PRICE_WATCHER_ENABLED=false" });
    return { stop: () => {} };
  }

  const intervalMs = Math.max(5, Number(config.priceWatcherIntervalSeconds || DEFAULT_WATCHER_INTERVAL_SECONDS)) * 1000;
  const cooldownMin = resolveCooldownMinutes();
  const batchSize = resolveBatchSize();
  const concurrencyLimit = resolveConcurrencyLimit();
  const stoppedRef = { value: false };

  let running = false;

  const runOnce = async () => {
    if (stoppedRef.value || running) return;
    running = true;

    try {
      await runPriceWatcherIteration({ stoppedRef, cooldownMin, batchSize, concurrencyLimit });
    } catch (error) {
      captureWatcherError("run_loop", error);
      logWatcherError("watcher_run_failed", error);
    } finally {
      running = false;
    }
  };

  const bootTimer = setTimeout(() => void runOnce(), 1500);
  const timer = setInterval(() => void runOnce(), intervalMs);

  logger.info("watcher_started", {
    intervalSeconds: Math.round(intervalMs / 1000),
    cooldownMinutes: cooldownMin,
    batchSize,
    concurrencyLimit,
  });

  return {
    stop: () => {
      stoppedRef.value = true;
      clearTimeout(bootTimer);
      clearInterval(timer);
    },
  };
}