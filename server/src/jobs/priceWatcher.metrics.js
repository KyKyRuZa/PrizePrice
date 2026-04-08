import client from "prom-client";

import { register } from "../middlewares/metrics.middleware.js";

function getOrCreateMetric(metricName, factory) {
  const existing = register.getSingleMetric(metricName);
  if (existing) return existing;

  const metric = factory();
  register.registerMetric(metric);
  return metric;
}

export const watcherCycleDurationSeconds = getOrCreateMetric(
  "price_watcher_cycle_duration_seconds",
  () =>
    new client.Histogram({
      name: "price_watcher_cycle_duration_seconds",
      help: "Price watcher iteration duration in seconds",
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
    })
);

export const watcherProcessedWatchesTotal = getOrCreateMetric(
  "price_watcher_processed_watches_total",
  () =>
    new client.Counter({
      name: "price_watcher_processed_watches_total",
      help: "Number of watch records processed successfully by price watcher",
    })
);

export const watcherErrorsTotal = getOrCreateMetric(
  "price_watcher_errors_total",
  () =>
    new client.Counter({
      name: "price_watcher_errors_total",
      help: "Number of price watcher errors grouped by processing stage",
      labelNames: ["stage"],
    })
);
