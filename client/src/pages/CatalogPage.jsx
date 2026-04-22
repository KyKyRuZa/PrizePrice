import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductCardMain from '../components/products/ProductCardMain';
import Filters from '../components/products/Filters';
import SortOptions from '../components/products/SortOptions';
import Pagination from '../components/ui/Pagination';
import { useCatalogPageState } from './CatalogPage.state';
import { ALL_CATEGORY } from '../constants/filters';
import { Filter, X, Home } from 'lucide-react';
import styles from './CatalogPage.module.css';

const CatalogPage = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    searchQuery,
    sortBy,
    filters,
    filteredProducts,
    availableCategories,
    isLoadingProducts,
    productsError,
    categoryCounts,
    pagination,
    currentPage,
    setSortBy,
    handleFilterChange,
    handleClearSearch,
    handleProductClick,
    handlePageChange,
  } = useCatalogPageState();

  const hasParams = !!searchQuery 
    || filters.category !== ALL_CATEGORY 
    || filters.minPrice 
    || filters.maxPrice 
    || (filters.inStock && filters.inStock !== 'all');

  useEffect(() => {
    const title = hasParams
      ? `Результаты поиска: "${searchQuery}" — Каталог | PrizePrice`
      : 'Каталог товаров — сравнение цен | PrizePrice';
    
    const description = hasParams
      ? `Найдено ${filteredProducts.length} товаров по запросу "${searchQuery}". Сравните цены на товары с Wildberries, Ozon и Яндекс Маркета.`
      : 'Сравните цены на товары across Wildberries, Ozon и Яндекс Маркета. Фильтруйте по категориям, сортируйте по цене и находите лучшие предложения.';

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    const canonicalUrl = `https://prizeprise.ru/catalog${hasParams ? location.search : ''}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalUrl;

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (hasParams) {
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.name = 'robots';
        document.head.appendChild(metaRobots);
      }
      metaRobots.content = 'noindex, follow';
    } else if (metaRobots) {
      metaRobots.remove();
    }

    document.head.querySelectorAll('script[data-seo="collectionpage"]').forEach(el => el.remove());

    let collectionScript = null;
    if (!hasParams) {
      collectionScript = document.createElement('script');
      collectionScript.type = 'application/ld+json';
      collectionScript.setAttribute('data-seo', 'collectionpage');
      collectionScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Каталог товаров — PrizePrice",
        "description": "Сравните цены на товары с Wildberries, Ozon и Яндекс Маркета. Фильтруйте по категориям и находите лучшие предложения.",
        "url": "https://prizeprise.ru/catalog"
      });
      document.head.appendChild(collectionScript);
    }

    return () => {
      if (collectionScript) {
        collectionScript.remove();
      }
    };
  }, [searchQuery, filteredProducts.length, hasParams, location.search]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsFiltersOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (isFiltersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFiltersOpen]);

  return (
    <div className={styles.catalogContainer}>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <h1 className={styles.pageTitle}>
              {searchQuery
                ? `Результаты поиска: "${searchQuery}"`
                : filters.category !== ALL_CATEGORY
                  ? `Категория: ${filters.category}`
                  : 'Каталог товаров'
                }
            </h1>
            <button
              className={styles.backToHomeButton}
              onClick={() => navigate('/')}
              title="На главную"
              aria-label="На главную"
            >
              <Home size={20} />
            </button>
          </div>
        </div>

        <button
          className={styles.mobileFilterButton}
          onClick={() => setIsFiltersOpen(true)}
          type="button"
          aria-label="Открыть фильтры"
        >
          <Filter size={20} />
          <span>Фильтры</span>
        </button>

        {isFiltersOpen && (
          <div
            className={styles.filterOverlay}
            onClick={() => setIsFiltersOpen(false)}
            role="presentation"
          />
        )}

        <div className={styles.mainLayout}>
          <div className={`${styles.filtersSection} ${isFiltersOpen ? styles.filtersOpen : ''}`}>
            <div className={styles.filtersHeader}>
              <h3>Фильтры</h3>
              <button
                className={styles.closeFiltersButton}
                onClick={() => setIsFiltersOpen(false)}
                type="button"
                aria-label="Закрыть фильтры"
              >
                <X size={24} />
              </button>
            </div>

            <Filters
              filters={filters}
              onFilterChange={(newFilters) => {
                handleFilterChange(newFilters);
                if (window.innerWidth <= 768) {
                  setIsFiltersOpen(false);
                }
              }}
              categories={availableCategories}
              categoryCounts={categoryCounts}
            />
          </div>

          <div className={styles.productsSection}>
            {searchQuery && (
              <div className={styles.searchResultsInfo}>
                <div className={styles.searchQueryText}>
                  Результаты поиска по запросу: <strong>"{searchQuery}"</strong>
                </div>
                <button className={styles.clearSearchButton} onClick={handleClearSearch}>
                  Очистить поиск
                </button>
              </div>
            )}

            <div className={styles.resultsHeader}>
              <div>
                <h2 className={styles.resultsTitle}>
                  {searchQuery ? 'Найденные товары' : 'Все товары'}
                </h2>
              </div>
              <SortOptions sortBy={sortBy} onSortChange={setSortBy} />
            </div>

            {isLoadingProducts ? (
              <div className={styles.emptyState}>
                <h3>Загрузка товаров...</h3>
              </div>
            ) : productsError ? (
              <div className={styles.emptyState}>
                <h3>Ошибка загрузки товаров</h3>
                <p>{productsError}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={styles.productsGrid}>
                {filteredProducts.map((product) => (
                  <ProductCardMain key={product.id} product={product} onClick={handleProductClick} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры поиска или фильтры</p>
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <Pagination
                page={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
