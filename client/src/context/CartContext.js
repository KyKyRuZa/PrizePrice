import React, { useEffect, useMemo, useCallback, useState } from 'react';

import { useAuth } from './AuthContext';
import { apiGet } from '../utils/apiClient';
import { getProductRefId, hydrateProductRefs } from '../utils/productHydration';
import { productItemResponseSchema, userDataPayloadSchema } from '../contracts/apiSchemas';
import { createStrictContext } from './createStrictContext';
import {
  loadStoredArray,
  mergeUniqueIds,
  normalizeIdList,
  persistStoredJson,
  syncLocalChangesIfAuthenticated,
  useSyncedRef,
} from './shared/contextUtils';

export const [CartContext, useCart] = createStrictContext({
  name: 'CartProvider',
  hookName: 'useCart',
});

const STORAGE_KEY = 'prizeprice_cart';

const needsProductHydration = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const id = Number(item.id);
  if (!Number.isFinite(id)) return false;

  const hasName = typeof item.name === 'string' && item.name.trim().length > 0;
  const hasOffers = Array.isArray(item.prices) || Array.isArray(item.offers);
  return !hasName || !hasOffers;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const parsed = loadStoredArray(STORAGE_KEY);
    return parsed.length ? hydrateProductRefs(parsed) : [];
  });
  const { isAuthenticated } = useAuth();
  const cartRef = useSyncedRef(cart);

  useEffect(() => {
    persistStoredJson(STORAGE_KEY, cart);
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return undefined;

    (async () => {
      try {
        const userData = await apiGet('/auth/user-data', { schema: userDataPayloadSchema });
        const serverCart = Array.isArray(userData?.cart) ? userData.cart : [];

        const localItems = normalizeIdList(cartRef.current, (item) => getProductRefId(item));
        const serverItems = normalizeIdList(serverCart, (item) => getProductRefId(item));
        const allCart = mergeUniqueIds({ primary: localItems, secondary: serverItems });

        if (!cancelled) {
          setCart(hydrateProductRefs(allCart, cartRef.current));
        }
      } catch {
        // ignore sync errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, cartRef]);

  useEffect(() => {
    const targets = Array.isArray(cart) ? cart.filter(needsProductHydration) : [];
    if (!targets.length) return undefined;

    let cancelled = false;
    const ids = [...new Set(targets.map((item) => Number(item.id)).filter((id) => Number.isFinite(id)))];
    if (!ids.length) return undefined;

    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await apiGet(`/products/${id}`, { schema: productItemResponseSchema });
            if (!data?.item || typeof data.item !== 'object') return null;
            return [id, data.item];
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const byId = new Map(entries.filter(Boolean));
      if (!byId.size) return;

      setCart((prev) =>
        prev.map((item) => {
          const id = getProductRefId(item);
          const hydrated = byId.get(id);
          if (id == null || !hydrated) return item;

          const base = item && typeof item === 'object' && !Array.isArray(item) ? item : { id };
          return {
            ...base,
            ...hydrated,
            id,
            addedAt: base.addedAt || hydrated.addedAt,
          };
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [cart]);

  const addToCart = useCallback((product) => {
    if (!product?.id) return;

    setCart((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      const next = [...prev, { ...product, addedAt: new Date().toISOString() }];
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });

    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'cart' });
  }, [isAuthenticated]);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      persistStoredJson(STORAGE_KEY, next);
      return next;
    });
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'cart' });
  }, [isAuthenticated]);

  const clearCart = useCallback(() => {
    setCart([]);
    persistStoredJson(STORAGE_KEY, []);
    syncLocalChangesIfAuthenticated({ isAuthenticated, scope: 'cart' });
  }, [isAuthenticated]);

  const isInCart = useCallback((productId) => {
    const normalizedId = Number(productId);
    if (!Number.isFinite(normalizedId)) return false;
    return cart.some((p) => Number(p?.id) === normalizedId);
  }, [cart]);

   const value = useMemo(() => ({
     cart,
     cartCount: cart.length,
     addToCart,
     removeFromCart,
     clearCart,
     isInCart,
   }), [cart, addToCart, removeFromCart, clearCart, isInCart]);

  return React.createElement(CartContext.Provider, { value }, children);
};

export default { CartProvider, useCart, CartContext };
