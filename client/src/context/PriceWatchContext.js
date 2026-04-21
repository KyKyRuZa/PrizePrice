import React, { useEffect, useMemo, useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet, apiPost } from '../utils/api/apiClient';
import {
  okPriceWatchListResponseSchema,
  priceWatchListResponseSchema,
} from '../contracts/apiSchemas';
import { createStrictContext } from './createStrictContext';
import {
  loadStoredArray,
  persistStoredJson,
  syncLocalChangesIfAuthenticated,
  useSyncedRef,
} from './shared/contextUtils';

export const [PriceWatchContext, usePriceWatch] = createStrictContext({
  name: 'PriceWatchProvider',
  hookName: 'usePriceWatch',
});

const STORAGE_KEY = 'prizeprice_price_watch';

const normalizeWatchPayload = (item) => {
  const productId = Number(item?.watch?.productId ?? item?.productId);
  if (!Number.isFinite(productId)) return null;
  return {
    productId,
    targetPrice: item?.watch?.targetPrice ?? item?.targetPrice ?? null,
    dropPercent: item?.watch?.dropPercent ?? item?.dropPercent ?? null,
    active: item?.watch?.active ?? item?.active ?? true,
  };
};

export const PriceWatchProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [watches, setWatches] = useState(() => {
    const parsed = loadStoredArray(STORAGE_KEY);
    return parsed.length ? parsed : [];
  });
  const watchesRef = useSyncedRef(watches);

  useEffect(() => {
    persistStoredJson(STORAGE_KEY, watches);
  }, [watches]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      try {
        const server = await apiGet('/me/price-watch', { schema: priceWatchListResponseSchema });
        const serverItems = Array.isArray(server?.items) ? server.items : [];

        const localItems = Array.isArray(watchesRef.current) ? watchesRef.current : [];
        const localPayloads = localItems.map(normalizeWatchPayload).filter(Boolean);

        const serverIds = new Set(
          serverItems
            .map((it) => Number(it?.watch?.productId))
            .filter((id) => Number.isFinite(id))
        );
        const missing = localPayloads.filter((w) => !serverIds.has(w.productId));

        if (missing.length) {
          await apiPost(
            '/me/price-watch/import',
            { watches: missing.slice(0, 100) },
            { schema: okPriceWatchListResponseSchema }
          );
        }

        const server2 = await apiGet('/me/price-watch', { schema: priceWatchListResponseSchema });
        const server2Items = Array.isArray(server2?.items) ? server2.items : serverItems;

        if (!cancelled) {
          setWatches(server2Items);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore sync errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, watchesRef]);

  const getWatch = useCallback((productId) => {
    const pid = Number(productId);
    return watches.find((it) => Number(it?.watch?.productId ?? it?.productId) === pid) || null;
  }, [watches]);

  const upsert = useCallback(async (product, { targetPrice = null, dropPercent = null, active = true } = {}) => {
    if (!product?.id) return;
    const pid = Number(product.id);
    if (!Number.isFinite(pid)) return;

    const nextItem = {
      product,
      watch: {
        productId: pid,
        targetPrice: targetPrice === '' ? null : targetPrice,
        dropPercent: dropPercent === '' ? null : dropPercent,
        active: active ?? true,
        updatedAt: new Date().toISOString(),
      },
    };

    setWatches((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const filtered = arr.filter((it) => Number(it?.watch?.productId ?? it?.productId) !== pid);
      const next = [nextItem, ...filtered];
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });

    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'price watch' });
  }, [isAuthenticated]);

  const remove = useCallback(async (productId) => {
    const pid = Number(productId);
    if (!Number.isFinite(pid)) return;

    setWatches((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const next = arr.filter((it) => Number(it?.watch?.productId ?? it?.productId) !== pid);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });

    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'price watch' });
  }, [isAuthenticated]);

   const value = useMemo(() => ({
     watches,
     watchesCount: watches.length,
     getWatch,
     upsert,
     remove,
   }), [watches, getWatch, upsert, remove]);

  return React.createElement(PriceWatchContext.Provider, { value }, children);
};

export default { PriceWatchProvider, usePriceWatch, PriceWatchContext };
