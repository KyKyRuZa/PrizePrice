import React from 'react';
import { ShoppingBag, TrendingUp, X } from 'lucide-react';
import { formatComparePrice, getCompareOffers } from '../../services/compareService';
import styles from './CompareTab.module.css';

const CompareTab = ({ cartCount, cart, removeFromCart, clearCart, openExternalLink }) => {
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
        <div className={styles.actionGroup}>
          <button className={styles.smallBtn} onClick={clearCart} title="Очистить сравнение">
            <X size={16} />
            Очистить
          </button>
        </div>
      </div>

      <div className={styles.compareList}>
        {cart.map((product) => {
          const offers = [...getCompareOffers(product)].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
          const best = offers[0];

          return (
            <div key={product.id} className={styles.compareItem}>
              <div className={styles.compareProductInfo}>
                {product.image ? (
                  <img src={product.image} alt={product.name} className={styles.compareProductImage} />
                ) : (
                  <div className={styles.compareProductImagePlaceholder}>Фото</div>
                )}
                <div className={styles.compareProductMeta}>
                  <h4 className={styles.compareProductName}>{product.name}</h4>
                  {best?.price != null ? (
                    <p className={styles.compareBestPrice}>
                      Лучшая: <b>{formatComparePrice(best.price)}</b> на {best.marketplace}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={styles.compareOffers}>
                {offers.length === 0 ? (
                  <p className={styles.noOffers}>Нет предложений</p>
                ) : (
                  offers.map((offer, idx) => (
                    <div key={`${product.id}-${idx}`} className={styles.compareOffer}>
                      <span className={styles.offerMarketplace}>{offer.marketplace}</span>
                      <span className={styles.offerPrice}>{formatComparePrice(offer.price)}</span>
                      {offer.discount ? (
                        <span className={styles.offerDiscount}>-{offer.discount}%</span>
                      ) : null}
                      {offer.link ? (
                        <button className={styles.offerLinkBtn} onClick={() => openExternalLink(offer.link)}>
                          <ShoppingBag size={14} />
                        </button>
                      ) : null}
                      <button className={styles.removeOfferBtn} onClick={() => removeFromCart(product.id)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CompareTab;
