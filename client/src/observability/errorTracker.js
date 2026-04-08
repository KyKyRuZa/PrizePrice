// Error tracker заглушка (Sentry удалён)
// Если понадобится tracking — подключить Highlight.io или другой сервис

function normalizeError(value) {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

export function initClientErrorTracker() {
  // Tracker отключён
  return { enabled: false, provider: "none" };
}

export function captureClientException(error, context = {}) {
  const normalized = normalizeError(error);

  if (import.meta.env.DEV) {
    console.error("client_exception", normalized, context);
  }
  // В production ошибки не отправляются (нет трекера)
}

export function captureClientMessage(message, context = {}) {
  if (!message) return;

  if (import.meta.env.DEV) {
    console.warn("client_message", message, context);
  }
}
