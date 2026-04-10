import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet } from '../utils/apiClient';
import { getProductRefId, hydrateProductRefs } from '../utils/productHydration';
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

export const [FavoritesContext, useFavorites] = createStrictContext({
  name: 'FavoritesProvider',
  hookName: 'useFavorites',
});

const STORAGE_KEY = 'prizeprice_favorites';

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const favoritesRef = useSyncedRef(favorites);

  // Initialize from localStorage only once
  useEffect(() => {
    const parsed = loadStoredArray(STORAGE_KEY);
    if (parsed.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavorites(hydrateProductRefs(parsed));
    }
  }, []);

  useEffect(() => {
    persistStoredJson(STORAGE_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      try {
        const userData = await apiGet('/auth/user-data', { schema: userDataPayloadSchema });
        const serverFavorites = Array.isArray(userData?.favorites) ? userData.favorites : [];

        const localItems = normalizeIdList(favoritesRef.current, (item) => getProductRefId(item));
        const serverItems = normalizeIdList(serverFavorites, (item) => getProductRefId(item));
        const allFavorites = mergeUniqueIds({ primary: localItems, secondary: serverItems });

        if (!cancelled) {
          setFavorites(hydrateProductRefs(allFavorites, favoritesRef.current));
        }
      } catch {
        // ignore sync errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, favoritesRef]);

  const addToFavorites = (product) => {
    if (!product?.id) return;

    setFavorites((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      const next = [...prev, { ...product, addedAt: new Date().toISOString() }];
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });

    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'favorites' });
  };

  const removeFromFavorites = (productId) => {
    setFavorites((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'favorites' });
  };

  const clearFavorites = () => {
    setFavorites([]);
    persistStoredJson(STORAGE_KEY, []);
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'favorites' });
  };

  const isInFavorites = (productId) => {
    const normalizedId = Number(productId);
    if (!Number.isFinite(normalizedId)) return false;
    return favorites.some((p) => Number(p?.id) === normalizedId);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    favorites,
    favoritesCount: favorites.length,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isInFavorites,
  }), [favorites, isAuthenticated, addToFavorites, removeFromFavorites, clearFavorites, isInFavorites]);

  return React.createElement(FavoritesContext.Provider, { value }, children);
};

export default { FavoritesProvider, useFavorites, FavoritesContext };
