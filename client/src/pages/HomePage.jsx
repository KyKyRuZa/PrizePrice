import React, { useState, useEffect } from 'react';
import ProductCardMain from '../components/products/ProductCardMain';
import Filters from '../components/products/Filters';
import SortOptions from '../components/products/SortOptions';
import Pagination from '../components/ui/Pagination';
import { SUPPORT_LOGOS, SUPPORT_TEXT } from '../constants/supportInfo';
import { useHomePageState } from '../hooks/useHomePageState';
import { Filter, X } from 'lucide-react';
import styles from './HomePage.module.css';

const HomePage = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
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
  } = useHomePageState();

  // Закрываем фильтры при изменении размера экрана
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsFiltersOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрываем фильтры при клике на Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Блокируем скролл при открытых фильтрах
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
    <div className={styles.homeContainer}>
      <div className={styles.content}>
        <div className={styles.welcomeSection}>
          <h1>Добро пожаловать в PrizePrice!</h1>
          <p>Находите лучшие цены на популярных маркетплейсах</p>
        </div>

        {/* Mobile filter toggle button */}
        <button
          className={styles.mobileFilterButton}
          onClick={() => setIsFiltersOpen(true)}
          type="button"
          aria-label="Открыть фильтры"
        >
          <Filter size={20} />
          <span>Фильтры</span>
        </button>

        {/* Overlay for mobile filters */}
        {isFiltersOpen && (
          <div
            className={styles.filterOverlay}
            onClick={() => setIsFiltersOpen(false)}
            role="presentation"
          />
        )}

        <div className={styles.mainLayout}>
          <div className={`${styles.filtersSection} ${isFiltersOpen ? styles.filtersOpen : ''}`}>
            {/* Mobile header — показывается только на мобильных */}
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
                // На мобильных закрываем фильтры после выбора
                if (window.innerWidth <= 768) {
                  setIsFiltersOpen(false);
                }
              }}
              categories={availableCategories}
              categoryCounts={categoryCounts}
            />
          </div>

          <div className={styles.productsSection}>
            {searchQuery ? (
              <div className={styles.searchResultsInfo}>
                <div className={styles.searchQueryText}>
                  Результаты поиска по запросу: <strong>"{searchQuery}"</strong>
                </div>
                <button className={styles.clearSearchButton} onClick={handleClearSearch}>Очистить поиск</button>
              </div>
            ) : null}

            <div className={styles.resultsHeader}>
              <div>
                <h2 className={styles.resultsTitle}>{searchQuery ? 'Найденные товары' : (filters.category === 'Все' ? 'Все товары' : filters.category)}</h2>
                <div className={styles.resultsCount}>Найдено товаров: {filteredProducts.length}</div>
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

            {/* Пагинация */}
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

export default HomePage;
