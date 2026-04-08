export function resolveRequestUserId(req) {
  return req?.userId ?? req?.user?.id;
}

export function buildRequestLogMeta(req, extra = {}) {
  return {
    requestId: req?.requestId,
    userId: resolveRequestUserId(req),
    method: req?.method,
    path: req?.originalUrl || req?.url,
    ...extra,
  };
}
