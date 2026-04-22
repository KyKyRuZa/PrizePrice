import React, { useState } from 'react';
import { Bell, Settings, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './WatchTab.module.css';

const ITEMS_PER_PAGE = 5;

const WatchTab = ({ watchesCount, watches, setActiveTab, handleProductClick, openWatchModal, removeWatch }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(watchesCount / ITEMS_PER_PAGE);

  if (watchesCount <= 0) {
    return (
      <div className={styles.emptyState}>
        <Bell size={64} />
        <h3>Отслеживание не настроено</h3>
        <p>Нажмите «Следить» на карточке товара — и вы увидите подписки здесь</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.sectionTopRow}>
        <h3 className={styles.sectionHeading}>Отслеживание цены</h3>
        <div className={styles.actionGroup}>
          <button className={styles.smallBtn} onClick={() => setActiveTab('notifications')}>Уведомления</button>
        </div>
      </div>

      <div className={styles.watchesList}>
        {watches.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((it) => {
          const product = it?.product;
          const watch = it?.watch;
          if (!product?.id) return null;

          return (
            <div key={product.id} className={styles.watchItem} onClick={() => handleProductClick(product)}>
              <div className={styles.watchProductInfo}>
                {product.image ? (
                  <img src={product.image} alt={product.name} className={styles.watchProductImage} />
                ) : (
                  <div className={styles.watchProductImagePlaceholder}>Фото</div>
                )}
                <div className={styles.watchProductMeta}>
                  <h4 className={styles.watchProductName}>{product.name}</h4>
                  <div className={styles.watchBadges}>
                    {watch?.targetPrice != null && (
                      <span className={styles.metaBadge}>Цель: {Number(watch.targetPrice)}₽</span>
                    )}
                    {watch?.dropPercent != null && (
                      <span className={styles.metaBadge}>Падение: {Number(watch.dropPercent)}%</span>
                    )}
                    <span className={`${styles.metaBadge} ${watch?.active ? styles.badgeActive : styles.badgePaused}`}>
                      {watch?.active ? 'Активно' : 'Пауза'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.watchActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    openWatchModal(product, watch);
                  }}
                  title="Настроить"
                >
                  <Settings size={18} />
                </button>
                <button
                  className={styles.actionBtnDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWatch(product.id);
                  }}
                  title="Удалить"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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

export default WatchTab;