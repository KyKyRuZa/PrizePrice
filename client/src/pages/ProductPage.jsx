import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBrowsingHistory } from '../context/BrowsingHistoryContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useProductPage } from './ProductPage.state';
import styles from '../components/products/ProductDetail.module.css';
import { Heart, ShoppingCart, TrendingDown, Star } from 'lucide-react';

const ProductPage = () => {
  const { id } = useParams();
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

  // SEO: обновляем мета-теги и structured data
  useEffect(() => {
    if (!product) return;

    const offersList = offers.map(offer => ({
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
      : `Сравните цены на ${product.name} across маркетплейсов. Лучшие предложения и скидки на ${product.name} на PrizePrice.`;

    document.title = title;

    // meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // canonical
    const canonicalUrl = `https://prizeprise.ru/product/${product.id}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalUrl;

    // Structured Data: Product
    // Удаляем старые скрипты Product
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
        "lowPrice": Math.min(...offers.map(o => o.price)),
        "highPrice": Math.max(...offers.map(o => o.price)),
        "priceCurrency": "RUB",
        "offerCount": offers.length,
        "offers": offersList
      },
      "aggregateRating": product.rating ? {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviews || 0
      } : undefined
     });
    document.head.appendChild(productScript);

    // Cleanup
    return () => {
      // Удаляем продукт-скрипт
      document.head.querySelectorAll('script[data-seo="product"]').forEach(el => el.remove());
    };
  }, [product, offers]);

  if (loading) {
    return <div className={styles.container}><div>Loading...</div></div>;
  }

  if (error) {
    return <div className={styles.container}><div>Error: {error}</div></div>;
  }

  if (!product) {
    return <div className={styles.container}><div>Product not found</div></div>;
  }

  return (
    <div className={styles.container}>
      <img className={styles.productImage} src={product.image} alt={product.name} />

      <div className={styles.productInfo}>
        <h1 className={styles.productTitle}>{product.name}</h1>
        <p className={styles.productCategory}>{product.category}</p>

        <div className={styles.ratingContainer}>
          <Star fill="#FFD700" stroke="#FFD700" style={{ marginRight: '8px' }} />
          <span className={styles.productRating}>{product.rating}</span>
          <span className={styles.productReviews}>({product.reviews} reviews)</span>
        </div>

        {product.description && (
          <p className={styles.productDescription}>{product.description}</p>
        )}

        <div className={styles.priceSection}>
          {bestOffer && (
            <>
              <span className={styles.currentPrice}>{bestOffer.price.toLocaleString()} ₽</span>
              {bestOffer.oldPrice && bestOffer.oldPrice > bestOffer.price && (
                <>
                  <span className={styles.oldPrice}>{bestOffer.oldPrice.toLocaleString()} ₽</span>
                  <span className={styles.discountBadge}>-{Math.round(((bestOffer.oldPrice - bestOffer.price) / bestOffer.oldPrice) * 100)}%</span>
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
            <ShoppingCart size={18} />
            {isInCart(product.id) ? 'In Compare List' : 'Add to Compare'}
          </button>

          <button
            className={styles.button}
            data-secondary="true"
            onClick={handleFavoriteToggle}
            data-active={isInFavorites(product.id)}
          >
            <Heart size={18} fill={isInFavorites(product.id) ? '#ff4757' : 'none'} />
            {isInFavorites(product.id) ? 'In Favorites' : 'Add to Favorites'}
          </button>
        </div>

        {offers.length > 0 && (
          <div className={styles.offersList}>
            <h3>Prices across marketplaces:</h3>
            {[...offers]
              .sort((a, b) => a.price - b.price)
              .map((offer, index) => (
                <div key={offer.id || index} className={styles.offerItem}>
                  <div>
                    <div className={styles.offerMarketplace}>
                      {offer.marketplace}
                      {bestOffer && offer.price === bestOffer.price && (
                        <span className={styles.bestPriceBadge}>Best Price</span>
                      )}
                    </div>
                    <span className={styles.offerPrice}>{offer.price.toLocaleString()} ₽</span>
                    {offer.oldPrice && offer.oldPrice > offer.price && (
                      <div>
                        <span style={{ textDecoration: 'line-through', color: '#999' }}>
                          {offer.oldPrice.toLocaleString()} ₽
                        </span>
                        <span style={{ color: '#2ecc71', marginLeft: '8px' }}>
                          -{Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <a className={styles.offerLink} href={offer.link} target="_blank" rel="noopener noreferrer">
                    Go to store
                  </a>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
