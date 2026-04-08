import { randomUUID } from "crypto";

import { runWithRequestContext } from "../runtime/requestContext.js";
import { logger } from "../utils/logger.js";
import { buildRequestLogMeta } from "../utils/requestMeta.js";
import { resolveRouteLabel } from "./metrics.middleware.js";

function createRequestId() {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeIncomingRequestId(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 128);
}

function shouldSkipRequestLog(req) {
  const path = req.path || req.originalUrl || "";
  return path === "/health" || path === "/ready";
}

export function requestIdMiddleware(req, res, next) {
  const incoming = normalizeIncomingRequestId(req.headers["x-request-id"]);
  const requestId = incoming || createRequestId();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  runWithRequestContext({ requestId }, next);
}

export function requestLogMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    if (shouldSkipRequestLog(req)) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info("http_request", {
      ...buildRequestLogMeta(req),
      route: resolveRouteLabel(req),
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
    });
  });

  next();
}
