import React from 'react';
import { Bell } from 'lucide-react';
import ProductCardMain from '../../products/ProductCardMain';
import WatchPriceModal from '../../watch/WatchPriceModal';
import styles from './WatchTab.module.css';

const WatchTab = ({ watchesCount, watches, setActiveTab, handleProductClick, openWatchModal, removeWatch }) => {
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

      <div className={styles.watchesGrid}>
        {watches.map((it) => {
          const product = it?.product;
          const watch = it?.watch;
          if (!product?.id) return null;

          return (
            <div key={product.id} className={styles.relativeCard}>
              <ProductCardMain product={product} onClick={handleProductClick} />
              <div className={styles.watchMeta}>
                {watch?.targetPrice != null ? (
                  <span className={styles.metaBadge}>Цель: {Number(watch.targetPrice)}₽</span>
                ) : null}
                {watch?.dropPercent != null ? (
                  <span className={styles.metaBadge}>Падение: {Number(watch.dropPercent)}%</span>
                ) : null}
                <span className={styles.metaBadge}>{watch?.active ? 'Активно' : 'Пауза'}</span>
                <span className={styles.watchActions}>
                  <button className={styles.smallBtn} onClick={() => openWatchModal(product, watch)}>Настроить</button>
                  <button className={styles.smallBtn} onClick={() => removeWatch(product.id)}>Удалить</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default WatchTab;
