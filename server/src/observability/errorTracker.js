import * as Sentry from "@sentry/node";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

let trackerInitialized = false;
let trackerEnabled = false;

function normalizeException(value) {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

export function initErrorTracker() {
  if (trackerInitialized) {
    return { enabled: trackerEnabled, provider: trackerEnabled ? "sentry" : "none" };
  }

  trackerInitialized = true;

  if (!config.sentryDsn) {
    logger.info("error_tracker_disabled", {
      reason: "SENTRY_DSN not set",
      provider: "sentry",
    });
    return { enabled: false, provider: "none" };
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.sentryEnvironment,
    release: config.sentryRelease || undefined,
    tracesSampleRate: config.sentryTracesSampleRate,
  });

  trackerEnabled = true;
  logger.info("error_tracker_enabled", {
    provider: "sentry",
    environment: config.sentryEnvironment,
    tracesSampleRate: config.sentryTracesSampleRate,
  });

  return { enabled: true, provider: "sentry" };
}

function applyContext(scope, context = {}) {
  if (!scope || !context || typeof context !== "object") return;

  const level = context.level || context.severity;
  if (level) scope.setLevel(level);

  const tags = context.tags || {};
  for (const [key, value] of Object.entries(tags)) {
    if (value !== undefined && value !== null) {
      scope.setTag(key, String(value));
    }
  }

  const extra = context.extra || {};
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) {
      scope.setExtra(key, value);
    }
  }

  if (context.userId != null) {
    scope.setUser({ id: String(context.userId) });
  }
}

export function captureException(error, context = {}) {
  if (!trackerEnabled) return;
  const normalizedError = normalizeException(error);

  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureException(normalizedError);
  });
}

export function captureMessage(message, context = {}) {
  if (!trackerEnabled || !message) return;

  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureMessage(String(message));
  });
}

export async function flushErrorTracker(timeoutMs = 2000) {
  if (!trackerEnabled) return;
  await Sentry.flush(timeoutMs);
}
