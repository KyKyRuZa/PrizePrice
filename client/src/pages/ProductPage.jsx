import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrowsingHistory } from '../context/BrowsingHistoryContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useProductPage } from './ProductPage.state';
import styles from './ProductDetail.module.css';
import { Heart, ShoppingCart, Star, ExternalLink, TrendingDown } from 'lucide-react';

import { ArrowLeft } from 'lucide-react';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addViewedProduct } = useBrowsingHistory();
  const { addToFavorites, removeFromFavorites, isInFavorites } = useFavorites();
  const { addToCart, isInCart } = useCart();
  const {
    product,
    loading,
    error,
    bestOffer,
    handleFavoriteToggle,
    handleAddToCart,
  } = useProductPage(id, {
    addViewedProduct,
    addToFavorites,
    removeFromFavorites,
    isInFavorites,
    addToCart,
  });

  const offers = useMemo(() => {
    return Array.isArray(product?.prices)
      ? product.prices
      : Array.isArray(product?.offers)
        ? product.offers
        : [];
  }, [product]);

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => a.price - b.price);
  }, [offers]);

  useEffect(() => {
    if (!product) return;

    const offersList = sortedOffers.map(offer => ({
      "@type": "Offer",
      "price": offer.price,
      "priceCurrency": "RUB",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": offer.marketplace
      },
      "url": offer.link
    }));

    const title = `${product.name} — цены и сравнение | PrizePrice`;
    const description = product.description
      ? `${product.description.substring(0, 160)}...`
      : `Сравните цены на ${product.name} на разных маркетплейсах. Лучшие предложения и скидки на ${product.name} на PrizePrice.`;

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    const canonicalUrl = `https://prizeprise.ru/product/${product.id}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalUrl;

    document.head.querySelectorAll('script[data-seo="product"]').forEach(el => el.remove());

    const productScript = document.createElement('script');
    productScript.type = 'application/ld+json';
    productScript.setAttribute('data-seo', 'product');
    productScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "image": product.image ? [product.image] : [],
      "description": product.description || "",
      "category": product.category || "",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": Math.min(...sortedOffers.map(o => o.price)),
        "highPrice": Math.max(...sortedOffers.map(o => o.price)),
        "priceCurrency": "RUB",
        "offerCount": sortedOffers.length,
        "offers": offersList
      },
      "aggregateRating": product.rating ? {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviews || 0
      } : undefined
    });
    document.head.appendChild(productScript);

    return () => {
      document.head.querySelectorAll('script[data-seo="product"]').forEach(el => el.remove());
    };
  }, [product, sortedOffers]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ff4757' }}>
          Ошибка: {error}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          Товар не найден
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        Назад
      </button>

      <div className={styles.productCard}>
        <div className={styles.productImageWrapper}>
          {product.image ? (
            <img src={product.image} alt={product.name} className={styles.productImage} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              color: '#999',
              fontSize: '18px'
            }}>
              Изображение отсутствует
            </div>
          )}
        </div>

        <div className={styles.productInfo}>
          {product.category && (
            <div className={styles.productCategory}>{product.category}</div>
          )}

          <h1 className={styles.productTitle}>{product.name}</h1>

          <div className={styles.ratingRow}>
            <Star fill="#FFD700" stroke="#FFD700" size={18} />
            <span className={styles.productRating}>{product.rating?.toFixed(1) || 'Нет рейтинга'}</span>
            <span className={styles.productReviews}>({product.reviews || 0} отзывов)</span>
          </div>

          {product.description && (
            <p className={styles.productDescription}>{product.description}</p>
          )}

          <div className={styles.priceCard}>
            <div className={styles.priceRow}>
              {bestOffer && (
                <>
                  <span className={styles.currentPrice}>{bestOffer.price.toLocaleString()} ₽</span>
                  {bestOffer.oldPrice && bestOffer.oldPrice > bestOffer.price && (
                    <>
                      <span className={styles.oldPrice}>{bestOffer.oldPrice.toLocaleString()} ₽</span>
                      <span className={styles.discountBadge}>
                        -{Math.round(((bestOffer.oldPrice - bestOffer.price) / bestOffer.oldPrice) * 100)}%
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.button}
                data-primary="true"
                onClick={handleAddToCart}
                disabled={isInCart(product.id)}
              >
                <ShoppingCart size={20} />
                {isInCart(product.id) ? 'В списке сравнения' : 'Добавить в сравнение'}
              </button>

              <button
                className={styles.button}
                data-secondary="true"
                onClick={handleFavoriteToggle}
                data-active={isInFavorites(product.id)}
              >
                <Heart size={20} fill={isInFavorites(product.id) ? '#fff' : 'none'} />
                {isInFavorites(product.id) ? 'В избранном' : 'В избранное'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {sortedOffers.length > 0 ? (
        <section className={styles.offersSection}>
          <div className={styles.offersHeader}>
            <h3>Предложения в магазинах</h3>
            <span className={styles.offersCount}>{sortedOffers.length} предложения</span>
          </div>

          <div className={styles.offersList}>
            {sortedOffers.map((offer, index) => {
              const isBest = bestOffer && offer.price === bestOffer.price;
              return (
                <div key={offer.id || index} className={styles.offerCard}>
                  <div className={styles.offerInfo}>
                    <div className={styles.offerHeader}>
                      <span className={styles.offerMarketplace}>{offer.marketplace}</span>
                      {isBest && <span className={styles.bestPriceBadge}>Лучшая цена</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                      <span className={styles.offerPrice}>{offer.price.toLocaleString()} ₽</span>
                      {offer.oldPrice && offer.oldPrice > offer.price && (
                        <>
                          <span className={styles.offerOldPrice}>{offer.oldPrice.toLocaleString()} ₽</span>
                          <span className={styles.offerDiscount}>
                            -{Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <a
                    className={styles.offerLink}
                    href={offer.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      addViewedProduct(product.id);
                    }}
                  >
                    <ExternalLink size={16} />
                    Перейти
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className={styles.noOffers}>
          <TrendingDown size={48} />
          <h3>Нет предложений</h3>
          <p>По этому товару пока нет цен в магазинах</p>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
