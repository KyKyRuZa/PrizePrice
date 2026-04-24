import React, { useMemo, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, Star, TrendingUp } from 'lucide-react';

import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { usePriceWatch } from '../../context/PriceWatchContext';
import {
  buildMarketplaceRows,
  formatProductPrice,
  getMarketplaceRating,
} from './ProductCardMain.helpers';
import styles from './ProductCardMain.module.css';

const WatchPriceModal = React.lazy(() => import('../watch/WatchPriceModal'));

const STAR_COUNT = 5;

const ProductCardMain = ({ product, onClick }) => {
  const { addToFavorites, removeFromFavorites, isInFavorites } = useFavorites();
  const { addToCart, isInCart } = useCart();
  const { watches } = usePriceWatch();
  const navigate = useNavigate();

  const isFavorite = isInFavorites(product.id);
  const inCart = isInCart(product.id);
  const existingWatch = useMemo(() => {
    const pid = Number(product.id);
    return watches.find((it) => Number(it?.watch?.productId ?? it?.productId) === pid) || null;
  }, [product.id, watches]);
  const [showWatch, setShowWatch] = useState(false);

  const marketplaceRows = useMemo(() => buildMarketplaceRows(product.prices), [product.prices]);
  const productStars = Math.floor(Number(product.rating));

  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  const handleFavoriteClick = (event) => {
    event.stopPropagation();
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  const handleCompareClick = (event) => {
    event.stopPropagation();
    if (!inCart) {
      addToCart(product);
    }
    navigate('/profile?tab=compare');
  };

  const handleWatchClick = (event) => {
    event.stopPropagation();
    setShowWatch(true);
  };

  return (
    <>
      <div className={styles.card} onClick={handleCardClick}>
        <button
          className={styles.favoriteButton}
          data-is-favorite={isFavorite}
          onClick={handleFavoriteClick}
          type="button"
        >
          <Heart size={20} fill={isFavorite ? '#ff4444' : 'none'} />
        </button>

        <div className={styles.imageContainer}>
          {product.image ? <img src={product.image} alt={product.name} /> : <span className={styles.emptyImageText}>Фото товара</span>}
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.title}>{product.name}</h3>

          <div className={styles.actionsRow}>
            <button className={styles.watchBtn} onClick={handleWatchClick} title="Отслеживать цену" type="button">
              <Bell size={14} />
              {existingWatch ? 'Следите' : 'Следить'}
            </button>

            <button
              className={styles.compareButton}
              data-active={inCart}
              onClick={handleCompareClick}
              type="button"
            >
              <TrendingUp size={14} />
              {inCart ? 'В сравнении' : 'Сравнить цены'}
            </button>
          </div>

          <div className={styles.ratingContainer}>
            <div className={styles.rating}>
              {Array.from({ length: STAR_COUNT }, (_, index) => (
                <Star
                  key={index}
                  size={14}
                  fill={index < productStars ? '#ffb400' : 'none'}
                  color="#ffb400"
                />
              ))}
            </div>
            <span className={styles.reviewsCount}>({product.reviews} отзывов)</span>
          </div>

          <div className={styles.marketplaceRows}>
            {marketplaceRows.length > 0 ? (
              marketplaceRows.map(({ meta, priceInfo, key, index }) => {
                const stars = getMarketplaceRating(priceInfo, product.rating);

                return (
                  <div key={`${product.id}-${key}-${index}`} className={styles.marketplaceRow}>
                    <div className={styles.marketplaceIdentity}>
                      <span
                        className={styles.marketplaceLogo}
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.short}
                      </span>
                      <span className={styles.marketplaceName}>{meta.label}</span>
                    </div>

                    <span className={styles.marketplacePrice}>{formatProductPrice(priceInfo.price)}</span>

                    <div className={styles.marketplaceStars} aria-label={`Рейтинг ${meta.label}`}>
                      {Array.from({ length: STAR_COUNT }, (_, starIndex) => (
                        <Star
                          key={starIndex}
                          size={11}
                          fill={starIndex < stars ? '#ffb400' : 'none'}
                          color="#ffb400"
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <span className={styles.emptyMarketplace}>Нет данных по маркетплейсам</span>
            )}
          </div>
        </div>
      </div>

      {showWatch ? (
        <Suspense fallback={<div>Загрузка...</div>}>
          <WatchPriceModal
            product={product}
            initialWatch={existingWatch?.watch || existingWatch}
            onClose={() => setShowWatch(false)}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export default React.memo(ProductCardMain);
