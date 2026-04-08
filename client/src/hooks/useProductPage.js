import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "../utils/apiClient";
import { productItemResponseSchema } from "../contracts/apiSchemas";

export function useProductPage(
  id,
  {
    addViewedProduct,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,
    addToCart,
  }
) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      if (!id) {
        setProduct(null);
        setLoading(false);
        setError("Product not found");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiGet(`/products/${id}`, { schema: productItemResponseSchema });
        if (cancelled) return;

        if (response?.item) {
          setProduct(response.item);
          addViewedProduct(Number(id));
          return;
        }

        setProduct(null);
        setError("Product not found");
      } catch (err) {
        if (cancelled) return;
        setProduct(null);
        setError(err?.message || "Error loading product");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [id, addViewedProduct]);

  const bestOffer = useMemo(() => {
    const offers = Array.isArray(product?.prices)
      ? product.prices
      : Array.isArray(product?.offers)
        ? product.offers
        : [];

    if (!offers.length) return null;
    return offers.reduce((best, current) => {
      return !best || current.price < best.price ? current : best;
    }, null);
  }, [product]);

  const handleFavoriteToggle = useCallback(() => {
    if (!product) return;
    if (isInFavorites(product.id)) {
      removeFromFavorites(product.id);
      return;
    }
    addToFavorites(product);
  }, [product, isInFavorites, removeFromFavorites, addToFavorites]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart(product);
  }, [product, addToCart]);

  return {
    product,
    loading,
    error,
    bestOffer,
    handleFavoriteToggle,
    handleAddToCart,
  };
}
