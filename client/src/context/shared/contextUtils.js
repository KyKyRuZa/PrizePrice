import { useEffect, useRef } from "react";

import { uploadLocalChanges } from "../../utils/user/syncUserData";

export function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function loadStoredArray(storageKey) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];
  const parsed = safeParseJson(saved, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function persistStoredJson(storageKey, value) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

export function useSyncedRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function normalizeIdList(items, toId) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => toId(item))
    .filter((id) => id != null);
}

export function mergeUniqueIds({ primary = [], secondary = [] }) {
  return [...new Set([...primary, ...secondary])];
}

export function syncLocalChangesIfAuthenticated({ isAuthenticated, scope = "context" }) {
  if (!isAuthenticated) return;
  uploadLocalChanges().catch((error) => {
    console.error(`Error syncing ${scope} with server:`, error);
  });
}
