import React, { useEffect, useMemo, useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet } from '../utils/api/apiClient';
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

export const [BrowsingHistoryContext, useBrowsingHistory] = createStrictContext({
  name: 'BrowsingHistoryProvider',
  hookName: 'useBrowsingHistory',
});

const STORAGE_KEY = 'prizeprice_browsing_history';
const MAX_LOCAL = 50;

const normalizeProductId = (id) => Number(id);

const upsertLocal = (items, productId) => {
  const pid = normalizeProductId(productId);
  if (!pid) return items;

  const next = [...(Array.isArray(items) ? items : [])].filter((it) => it.productId !== pid);
  next.unshift({
    id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: pid,
    viewedAt: new Date().toISOString(),
  });

  return next.slice(0, MAX_LOCAL);
};

function toHistoryRecord(productId, index, prefix = 'local') {
  return {
    id: `${prefix}_${Date.now()}_${index}`,
    productId,
    viewedAt: new Date().toISOString(),
  };
}

export const BrowsingHistoryProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [history, setHistory] = useState(() => {
    const parsed = loadStoredArray(STORAGE_KEY);
    return parsed.length ? parsed : [];
  });
  const historyRef = useSyncedRef(history);

  useEffect(() => {
    persistStoredJson(STORAGE_KEY, history);
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      try {
        const userData = await apiGet('/auth/user-data', { schema: userDataPayloadSchema });
        const serverHistory = Array.isArray(userData?.browsingHistory) ? userData.browsingHistory : [];

        const serverItems = normalizeIdList(serverHistory, (item) => item?.productId);
        const localItems = normalizeIdList(historyRef.current, (item) => item?.productId);
        const allHistory = mergeUniqueIds({ primary: serverItems, secondary: localItems });

        if (!cancelled) {
          setHistory(allHistory.map((productId, index) => toHistoryRecord(productId, index, 'server')));
        }
      } catch {
        // ignore sync errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, historyRef]);

  const addViewedProduct = useCallback(async (productId) => {
    const pid = normalizeProductId(productId);
    if (!pid) return;

    setHistory((prev) => {
      const next = upsertLocal(prev, pid);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'browsing history' });
  }, [isAuthenticated]);

  const clear = useCallback(async () => {
    setHistory([]);
    persistStoredJson(STORAGE_KEY, []);
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'browsing history' });
  }, [isAuthenticated]);

  const remove = useCallback(async (id) => {
    setHistory((prev) => {
      const next = prev.filter((it) => it?.id !== id);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'browsing history' });
  }, [isAuthenticated]);

   const value = useMemo(() => ({
     history,
     historyCount: history.length,
     addViewedProduct,
     clear,
     remove,
   }), [history, addViewedProduct, clear, remove]);

  return React.createElement(BrowsingHistoryContext.Provider, { value }, children);
};

export default { BrowsingHistoryProvider, useBrowsingHistory, BrowsingHistoryContext };
