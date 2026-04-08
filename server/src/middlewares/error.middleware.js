import { logger } from "../utils/logger.js";
import { captureException } from "../observability/errorTracker.js";
import { buildRequestLogMeta } from "../utils/requestMeta.js";

export function errorHandler(err, req, res, _next) {
  const requestMeta = buildRequestLogMeta(req);
  captureException(err, {
    level: "error",
    userId: requestMeta.userId,
    tags: {
      source: "http",
      method: requestMeta.method,
      path: requestMeta.path,
      requestId: requestMeta.requestId,
      code: err?.code || "INTERNAL_ERROR",
    },
    extra: {
      route: req?.route?.path,
      statusCode: Number(err?.status) || 500,
      message: err?.message,
    },
  });

  logger.error("request_error", {
    ...requestMeta,
    code: err?.code,
    message: err?.message,
    stack: err?.stack,
  });

  if (err?.code === "OTP_STORAGE_UNAVAILABLE") {
    const payload = { error: "OTP_UNAVAILABLE" };
    if (req?.requestId) payload.requestId = req.requestId;
    return res.status(503).json(payload);
  }

  if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err?.status === 400)) {
    const payload = { error: "INVALID_JSON" };
    if (req?.requestId) payload.requestId = req.requestId;
    return res.status(400).json(payload);
  }

  if (err?.type === "entity.too.large" || Number(err?.status) === 413) {
    const payload = { error: "PAYLOAD_TOO_LARGE" };
    if (req?.requestId) payload.requestId = req.requestId;
    return res.status(413).json(payload);
  }

  const payload = { error: "INTERNAL_ERROR" };
  if (req?.requestId) payload.requestId = req.requestId;
  res.status(500).json(payload);
}
