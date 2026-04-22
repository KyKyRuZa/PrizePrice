import React, { useState } from 'react';
import { TrendingUp, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatComparePrice, getCompareOffers } from '../../../services/compareService';
import styles from './CompareTab.module.css';

const ITEMS_PER_PAGE = 5;

const CompareTab = ({ cartCount, cart, removeFromCart, clearCart, openExternalLink }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(cartCount / ITEMS_PER_PAGE);

  if (cartCount <= 0) {
    return (
      <div className={styles.emptyState}>
        <TrendingUp size={64} />
        <h3>Нечего сравнивать</h3>
        <p>Нажимайте «Сравнить цены» на товарах — они появятся здесь</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.sectionTopRow}>
        <h3 className={styles.sectionHeading}>Сравнение цен</h3>
        <button className={styles.clearAllButton} onClick={clearCart} title="Очистить сравнение">
          <X size={16} />
          Очистить
        </button>
      </div>

      <div className={styles.compareList}>
        {cart.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product) => {
          const offers = [...getCompareOffers(product)].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

          return (
            <div
              key={product.id}
              className={styles.compareItem}
              onClick={() => {
                const best = offers[0];
                if (best?.link) {
                  openExternalLink(best.link);
                }
              }}
            >
              <div className={styles.compareProductInfo}>
                {product.image ? (
                  <img src={product.image} alt={product.name} className={styles.compareProductImage} />
                ) : (
                  <div className={styles.compareProductImagePlaceholder}>Фото</div>
                )}
                <div className={styles.compareProductMeta}>
                  <h4 className={styles.compareProductName}>{product.name}</h4>
                  <div className={styles.compareOffersPreview}>
                    {offers.length === 0 ? (
                      <span className={styles.noOffersText}>Нет предложений</span>
                    ) : (
                      <div className={styles.offersPreviewList}>
                        {offers.slice(0, 3).map((offer, idx) => (
                          <span key={idx} className={styles.offerPreviewItem}>
                            {offer.marketplace}: <b>{formatComparePrice(offer.price)}</b>
                          </span>
                        ))}
                        {offers.length > 3 && (
                          <span className={styles.offerMore}>ещё {offers.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                className={styles.removeItemBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(product.id);
                }}
                title="Убрать из сравнения"
              >
                <X size={18} />
              </button>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  );
};

export default CompareTab;
