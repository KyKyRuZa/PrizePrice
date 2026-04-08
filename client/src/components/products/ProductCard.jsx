import React from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';

import { useFavorites } from '../../context/FavoritesContext';
import { theme } from '../../styles/theme';
import { formatRubPrice } from '../../utils/price';
import styles from './ProductCard.module.css';
import { Button } from '../ui/Button';

const ProductCard = ({ product }) => {
  const { addToFavorites, removeFromFavorites, isInFavorites } = useFavorites();
  const isFavorite = isInFavorites(product.id);

  const handleFavoriteClick = () => {
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  return (
    <div className={styles.card} role="article" aria-label={`Товар: ${product.name}`}>
      {product.isBestPrice ? <div className={styles.bestPriceBadge} role="status">Лучшая цена</div> : null}

      <button
        className={styles.favoriteButton}
        data-is-favorite={isFavorite}
        onClick={handleFavoriteClick}
        type="button"
        aria-label={isFavorite ? `Удалить ${product.name} из избранного` : `Добавить ${product.name} в избранное`}
        aria-pressed={isFavorite}
      >
        <Heart size={20} fill={isFavorite ? '#ff4444' : 'none'} />
      </button>

      <div className={styles.productImage}>
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" /> : <span>Фото товара</span>}
      </div>

      <div className={styles.category}>{product.category}</div>
      <h3 className={styles.title}>{product.name}</h3>

      <div className={styles.ratingContainer} aria-label={`Рейтинг ${product.rating} из 5 звёзд`}>
        <div className={styles.rating} aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={14}
              fill={index < Math.floor(product.rating) ? theme.colors.rating : 'none'}
              color={theme.colors.rating}
            />
          ))}
        </div>
        <span className={styles.reviewsCount}>({product.reviews} отзывов)</span>
      </div>

      {product.prices.map((priceInfo, index) => (
        <div key={index} className={styles.priceRow}>
          <div className={styles.priceInfo}>
            <div className={styles.marketplaceLogo}>
              <span>{priceInfo.marketplace}</span>
            </div>
            <div>
              <span className={styles.price}>{formatRubPrice(priceInfo.price, '')}</span>
              {priceInfo.oldPrice ? (
                <>
                  <span className={styles.oldPrice}>{formatRubPrice(priceInfo.oldPrice, '')}</span>
                  <span className={styles.discount}>-{priceInfo.discount}%</span>
                </>
              ) : null}
            </div>
          </div>
          <Button
            className={styles.buyButton}
            variant="secondary"
            size="small"
            onClick={() => window.open(priceInfo.link, '_blank')}
          >
            <ShoppingBag size={16} />
            Купить на {priceInfo.marketplace}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default React.memo(ProductCard);
