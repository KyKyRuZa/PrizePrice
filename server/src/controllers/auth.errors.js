export const AUTH_ERRORS = Object.freeze({
  INVALID_OTP: "INVALID_OTP",
  INVALID_AUTH_FLOW: "INVALID_AUTH_FLOW",
  PHONE_EXISTS: "PHONE_EXISTS",
  USERNAME_EXISTS: "USERNAME_EXISTS",
});

export function sendAuthError(res, error, status = 400) {
  return res.status(status).json({ error });
}

export function sendInvalidOtp(res) {
  return sendAuthError(res, AUTH_ERRORS.INVALID_OTP);
}

export function sendInvalidAuthFlow(res) {
  return sendAuthError(res, AUTH_ERRORS.INVALID_AUTH_FLOW);
}

export function sendInternalError(res, req, status = 500) {
  const payload = { error: "INTERNAL_ERROR" };
  if (req?.requestId) payload.requestId = req.requestId;
  return res.status(status).json(payload);
}

export function sendTooManyRequests(res, req, retryAfterSeconds, message) {
  const parsed = Number(retryAfterSeconds);
  const seconds = Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 0;
  if (seconds > 0) {
    res.setHeader?.("Retry-After", String(seconds));
  }

  const payload = {
    error: "TOO_MANY_REQUESTS",
    retryAfterSeconds: seconds,
  };
  if (message) payload.message = message;
  if (req?.requestId) payload.requestId = req.requestId;

  return res.status(429).json(payload);
}

function extractUniqueFieldHints(error) {
  const hints = new Set();

  for (const key of Object.keys(error?.fields || {})) {
    hints.add(String(key).toLowerCase());
  }

  for (const item of Array.isArray(error?.errors) ? error.errors : []) {
    if (item?.path) hints.add(String(item.path).toLowerCase());
  }

  const constraint = String(error?.parent?.constraint || error?.constraint || "").toLowerCase();
  if (constraint.includes("phone")) hints.add("phone");
  if (constraint.includes("name") || constraint.includes("username")) hints.add("name");

  return hints;
}

export function sendUserUniqueConflict(res, error, status = 409) {
  const isUniqueError =
    error?.name === "SequelizeUniqueConstraintError" ||
    String(error?.parent?.code || "") === "23505";

  if (!isUniqueError) return false;

  const hints = extractUniqueFieldHints(error);
  if (hints.has("phone")) {
    sendAuthError(res, AUTH_ERRORS.PHONE_EXISTS, status);
    return true;
  }

  if (hints.has("name") || hints.has("username")) {
    sendAuthError(res, AUTH_ERRORS.USERNAME_EXISTS, status);
    return true;
  }

  return false;
}
