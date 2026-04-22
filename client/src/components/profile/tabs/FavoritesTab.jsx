import React, { useState } from 'react';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatComparePrice, getCompareOffers } from '../../../services/compareService';
import styles from './FavoritesTab.module.css';

const ITEMS_PER_PAGE = 5;

const FavoritesTab = ({
  favoritesCount,
  favorites,
  clearFavorites,
  handleRemoveFavorite,
  handleProductClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(favoritesCount / ITEMS_PER_PAGE);

  if (favoritesCount <= 0) {
    return (
      <div className={styles.emptyState}>
        <Heart size={64} />
        <h3>Избранное пусто</h3>
        <p>Добавляйте товары в избранное, чтобы видеть их здесь</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.sectionTopRow}>
        <h3 className={styles.sectionHeading}>Избранное</h3>
        <button className={styles.clearAllButton} onClick={clearFavorites} title="Очистить избранное">
          <X size={16} />
          Очистить
        </button>
      </div>

      <div className={styles.favoritesList}>
        {favorites.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product) => {
          const offers = [...getCompareOffers(product)].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
          const best = offers[0];

          return (
            <div key={product.id} className={styles.favoriteItem} onClick={() => handleProductClick(product)}>
              <div className={styles.favoriteProductInfo}>
                {product.image ? (
                  <img src={product.image} alt={product.name} className={styles.favoriteProductImage} />
                ) : (
                  <div className={styles.favoriteProductImagePlaceholder}>Фото</div>
                )}
                <div className={styles.favoriteProductMeta}>
                  <h4 className={styles.favoriteProductName}>{product.name}</h4>
                  {product.description && (
                    <p className={styles.favoriteProductDesc}>{product.description}</p>
                  )}
                  {best?.price != null ? (
                    <p className={styles.favoriteBestPrice}>
                      от <b>{formatComparePrice(best.price)}</b> {best.marketplace}
                    </p>
                  ) : (
                    <p className={styles.favoriteNoPrice}>Нет предложений</p>
                  )}
                </div>
              </div>

              <button
                className={styles.removeFavoriteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(e, product.id);
                }}
                title="Удалить из избранного"
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

export default FavoritesTab;