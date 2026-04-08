import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet } from '../utils/apiClient';
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
  const { isAuthenticated, token } = useAuth();
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
    if (!isAuthenticated || !token) return undefined;

    (async () => {
      try {
        const userData = await apiGet('/auth/user-data', { token, schema: userDataPayloadSchema });
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
  }, [isAuthenticated, token, historyRef]);

  const addViewedProduct = async (productId) => {
    const pid = normalizeProductId(productId);
    if (!pid) return;

    setHistory((prev) => upsertLocal(prev, pid));
    syncLocalChangesIfAuthenticated({ isAuthenticated, token, scope: 'browsing history' });
  };

  const clear = async () => {
    setHistory([]);
    syncLocalChangesIfAuthenticated({ isAuthenticated, token, scope: 'browsing history' });
  };

  const remove = async (id) => {
    setHistory((prev) => prev.filter((it) => it?.id !== id));
    syncLocalChangesIfAuthenticated({ isAuthenticated, token, scope: 'browsing history' });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    history,
    historyCount: history.length,
    addViewedProduct,
    clear,
    remove,
  }), [history, isAuthenticated, token, addViewedProduct, clear, remove]);

  return React.createElement(BrowsingHistoryContext.Provider, { value }, children);
};

export default { BrowsingHistoryProvider, useBrowsingHistory, BrowsingHistoryContext };
