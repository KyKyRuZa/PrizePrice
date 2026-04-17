import React, { useEffect } from 'react';
import { ArrowLeft, Bell, ShoppingBag, Trash2, TrendingUp, X } from 'lucide-react';
import WatchPriceModal from '../components/watch/WatchPriceModal';
import { useComparePage } from '../hooks/useComparePage';
import { formatComparePrice, getCompareOffers } from '../services/compareService';
import styles from './ComparePage.module.css';

const ComparePage = () => {
  const {
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
  } = useComparePage();

  // SEO для страницы сравнения
  useEffect(() => {
    document.title = 'Сравнение цен — PrizePrice';
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Сравнивайте цены на товары across маркетплейсов. Смотрите различия в ценах, скидках и выбирайте лучшее предложение.');

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = 'https://prizeprise.ru/compare';
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <TrendingUp size={22} color="#002870" />
            <div>
              <h1 className={styles.title}>Сравнение цен</h1>
              <p className={styles.subtitle}>Товаров в сравнении: {cartCount}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.actionBtn} onClick={handleNavigateHome} title="Вернуться на главную">
              <ArrowLeft size={18} />
              Добавить ещё
            </button>
            {cartCount > 0 ? (
              <>
                <button className={styles.actionBtn} onClick={handleDownloadCsv} title="Скачать CSV">
                  Скачать CSV
                </button>
                <button className={styles.dangerBtn} onClick={clearCart} title="Очистить сравнение">
                  <Trash2 size={18} />
                  Очистить
                </button>
              </>
            ) : null}
          </div>
        </header>

        {cartCount === 0 ? (
          <div className={styles.empty}>
            <TrendingUp size={56} color="#999" />
            <h3>Пока нечего сравнивать</h3>
            <p>Нажимайте «Сравнить цены» на товарах — они появятся здесь.</p>
            <button className={styles.primaryBtn} onClick={handleNavigateHome}>Перейти к товарам</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((product) => {
              const existingWatch = getExistingWatch(product.id);
              const offers = [...getCompareOffers(product)].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
              const best = offers[0];
              const bestKey = best ? `${best.marketplace}-${best.price}-${best.link}` : null;

              return (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.productTop}>
                    <div className={styles.productImg}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <span className={styles.placeholderText}>Фото</span>
                      )}
                    </div>

                    <div className={styles.productMeta}>
                      <h2 className={styles.productName}>{product.name}</h2>
                      <p className={styles.productHint}>
                        {product.category ? `Категория: ${product.category}` : 'Категория не указана'}
                      </p>
                      {best?.price != null ? (
                        <p className={styles.productHint}>
                          Лучшая цена: <b>{formatComparePrice(best.price)}</b> на <b>{best.marketplace}</b>
                        </p>
                      ) : null}
                    </div>

                    <div className={styles.productActions}>
                      {best?.link ? (
                        <button className={styles.buyBestBtn} onClick={() => handleOpenLink(best.link)} title="Открыть лучшее предложение">
                          <ShoppingBag size={16} />
                          Купить выгодно
                        </button>
                      ) : null}
                      <button className={styles.watchBtn} onClick={() => handleOpenWatchModal(product)} title="Отслеживать цену">
                        <Bell size={16} />
                        {existingWatch ? 'Следите' : 'Следить'}
                      </button>
                      <button className={styles.removeBtn} onClick={() => removeFromCart(product.id)} title="Удалить из сравнения">
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <table className={styles.offersTable}>
                    <thead>
                      <tr>
                        <th>Маркетплейс</th>
                        <th>Цена</th>
                        <th>Скидка</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.length === 0 ? (
                        <tr>
                          <td className={styles.emptyOffersCell} colSpan={4}>Нет предложений для сравнения</td>
                        </tr>
                      ) : (
                        offers.map((offer, idx) => {
                          const rowKey = `${offer.marketplace}-${offer.price}-${offer.link}-${idx}`;
                          const isBest =
                            !!bestKey &&
                            String(offer.marketplace) === String(best.marketplace) &&
                            Number(offer.price) === Number(best.price) &&
                            String(offer.link || '') === String(best.link || '');

                          return (
                            <tr key={rowKey} className={isBest ? styles.bestRow : ''}>
                              <td>{offer.marketplace}</td>
                              <td>
                                <span className={styles.price}>{formatComparePrice(offer.price)}</span>
                                {offer.oldPrice ? <span className={styles.oldPrice}>{formatComparePrice(offer.oldPrice)}</span> : null}
                              </td>
                              <td>
                                {offer.discount ? <span className={styles.discount}>-{offer.discount}%</span> : <span className={styles.mutedText}>—</span>}
                              </td>
                              <td className={styles.rightAlignedCell}>
                                {offer.link ? (
                                  <button className={styles.linkBtn} onClick={() => handleOpenLink(offer.link)} title={`Открыть ${offer.marketplace}`}>
                                    <ShoppingBag size={16} />
                                    Перейти
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {watchProduct ? (
        <WatchPriceModal
          product={watchProduct.product}
          initialWatch={watchProduct.existingWatch?.watch || watchProduct.existingWatch}
          onClose={handleCloseWatchModal}
        />
      ) : null}
    </div>
  );
};

export default ComparePage;
