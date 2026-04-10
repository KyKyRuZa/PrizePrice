import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet } from '../utils/apiClient';
import { normalizeSearchQuery } from '../utils/inputSanitizers';
import { userDataPayloadSchema } from '../contracts/apiSchemas';
import { createStrictContext } from './createStrictContext';
import {
  loadStoredArray,
  mergeUniqueIds,
  normalizeIdList,
  persistStoredJson,
  syncLocalChangesIfAuthenticated,
  useSyncedRef,
} from './shared/contextUtils';

export const [SearchHistoryContext, useSearchHistory] = createStrictContext({
  name: 'SearchHistoryProvider',
  hookName: 'useSearchHistory',
});

const STORAGE_KEY = 'prizeprice_search_history';
const MAX_LOCAL = 50;

const normalizeQuery = (q) => normalizeSearchQuery(q);
const normalizeKey = (q) => normalizeQuery(q).toLowerCase();

const upsertLocal = (items, query) => {
  const q = normalizeQuery(query);
  if (!q) return items;
  const key = normalizeKey(q);
  const now = new Date().toISOString();

  const next = [...(Array.isArray(items) ? items : [])].filter((it) => normalizeKey(it?.query) !== key);
  next.unshift({ id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`, query: q, createdAt: now });
  return next.slice(0, MAX_LOCAL);
};

function toSearchRecord(query, index) {
  return {
    id: `local_${Date.now()}_${index}`,
    query,
    createdAt: new Date().toISOString(),
  };
}

export const SearchHistoryProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState([]);
  const historyRef = useSyncedRef(history);

  // Initialize from localStorage only once
  useEffect(() => {
    const parsed = loadStoredArray(STORAGE_KEY);
    if (parsed.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(parsed);
    }
  }, []);

  useEffect(() => {
    persistStoredJson(STORAGE_KEY, history);
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      try {
        const userData = await apiGet('/auth/user-data', { schema: userDataPayloadSchema });
        const serverHistory = Array.isArray(userData?.searchHistory) ? userData.searchHistory : [];

        const localItems = normalizeIdList(historyRef.current, (item) => item?.query);
        const serverItems = normalizeIdList(serverHistory, (item) => item?.query || item);
        const allHistory = mergeUniqueIds({ primary: localItems, secondary: serverItems });

        if (!cancelled) {
          setHistory(allHistory.map((query, index) => toSearchRecord(query, index)));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, historyRef]);

  const addQuery = async (query) => {
    const q = normalizeQuery(query);
    if (!q) return;

    setHistory((prev) => {
      const next = upsertLocal(prev, q);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'search history' });
  };

  const clear = async () => {
    setHistory([]);
    persistStoredJson(STORAGE_KEY, []);
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'search history' });
  };

  const remove = async (id) => {
    setHistory((prev) => {
      const next = prev.filter((it) => it?.id !== id);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'search history' });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    history,
    historyCount: history.length,
    addQuery,
    clear,
    remove,
  }), [history, isAuthenticated, addQuery, clear, remove]);

  return React.createElement(SearchHistoryContext.Provider, { value }, children);
};

export default { SearchHistoryProvider, useSearchHistory, SearchHistoryContext };
