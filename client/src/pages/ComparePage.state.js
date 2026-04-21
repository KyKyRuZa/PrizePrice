import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { usePriceWatch } from "../context/PriceWatchContext";
import { downloadCompareCsv, openExternalLink, sortCompareItems } from "../services/compareService";

export function useComparePage() {
  const navigate = useNavigate();
  const { cart, cartCount, removeFromCart, clearCart } = useCart();
  const { getWatch } = usePriceWatch();
  const [watchProduct, setWatchProduct] = useState(null);

  const items = useMemo(() => sortCompareItems(cart), [cart]);

  const handleOpenLink = useCallback((link) => {
    openExternalLink(link);
  }, []);

  const handleDownloadCsv = useCallback(() => {
    downloadCompareCsv(items);
  }, [items]);

  const handleOpenWatchModal = useCallback(
    (product) => {
      if (!product?.id) return;
      setWatchProduct({ product, existingWatch: getWatch(product.id) });
    },
    [getWatch]
  );

  const handleCloseWatchModal = useCallback(() => {
    setWatchProduct(null);
  }, []);

  const handleNavigateHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const getExistingWatch = useCallback(
    (productId) => getWatch(productId),
    [getWatch]
  );

  return {
    items,
    cartCount,
    removeFromCart,
    clearCart,
    watchProduct,
    handleOpenLink,
    handleDownloadCsv,
    handleOpenWatchModal,
    handleCloseWatchModal,
    handleNavigateHome,
    getExistingWatch,
  };
}
