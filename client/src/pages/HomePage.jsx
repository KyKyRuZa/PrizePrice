import React from 'react';
import ProductCardMain from '../components/products/ProductCardMain';
import Filters from '../components/products/Filters';
import SortOptions from '../components/products/SortOptions';
import Pagination from '../components/ui/Pagination';
import { SUPPORT_LOGOS, SUPPORT_TEXT } from '../constants/supportInfo';
import { useHomePageState } from '../hooks/useHomePageState';
import styles from './HomePage.module.css';

const HomePage = () => {
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

  return (
    <div className={styles.homeContainer}>
      <div className={styles.content}>
        <div className={styles.welcomeSection}>
          <h1>Добро пожаловать в PrizePrice!</h1>
          <p>Находите лучшие цены на популярных маркетплейсах</p>
        </div>

        <div className={styles.mainLayout}>
          <div className={styles.filtersSection}>
            <Filters 
              filters={filters} 
              onFilterChange={handleFilterChange} 
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
