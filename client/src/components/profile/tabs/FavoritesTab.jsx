import React from 'react';
import { Heart, X } from 'lucide-react';
import ProductCardMain from '../../products/ProductCardMain';
import styles from './FavoritesTab.module.css';

const FavoritesTab = ({
  favoritesCount,
  favorites,
  clearFavorites,
  handleRemoveFavorite,
  handleProductClick,
}) => {
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
      <div className={styles.endAlignedRow}>
        <button className={styles.clearAllButton} onClick={clearFavorites} title="Очистить избранное">
          Очистить избранное
        </button>
      </div>
      <div className={styles.favoritesGrid}>
        {favorites.map((product) => (
          <div key={product.id} className={styles.relativeCard}>
            <button
              className={styles.removeFavoriteButton}
              onClick={(e) => handleRemoveFavorite(e, product.id)}
              title="Удалить из избранного"
            >
              <X size={18} />
            </button>
            <ProductCardMain product={product} onClick={handleProductClick} />
          </div>
        ))}
      </div>
    </>
  );
};

export default FavoritesTab;
