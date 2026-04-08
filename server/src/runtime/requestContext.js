import { AsyncLocalStorage } from "async_hooks";

const requestContextStorage = new AsyncLocalStorage();

export function runWithRequestContext(initialContext, callback) {
  return requestContextStorage.run({ ...(initialContext || {}) }, callback);
}

export function getRequestContext() {
  return requestContextStorage.getStore() || null;
}

export function setRequestContextValue(key, value) {
  const store = requestContextStorage.getStore();
  if (!store) return;
  store[key] = value;
}
