import { STORAGE_AUTH_SESSION, STORAGE_USER } from "./constants";

export function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readStoredSession() {
  const user = safeJsonParse(localStorage.getItem(STORAGE_USER));
  const hasSessionFlag = localStorage.getItem(STORAGE_AUTH_SESSION) === "1";
  return { session: hasSessionFlag, user: user || null };
}

export function saveSessionFlag() {
  localStorage.setItem(STORAGE_AUTH_SESSION, "1");
}

export function removeSessionFlag() {
  localStorage.removeItem(STORAGE_AUTH_SESSION);
}

export function saveUser(user) {
  localStorage.setItem(STORAGE_USER, JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem(STORAGE_USER);
}

export function clearStoredSession() {
  removeSessionFlag();
  removeUser();
}
