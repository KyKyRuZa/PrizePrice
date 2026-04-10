import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ALL_CATEGORY, createDefaultFilters } from '../constants/filters';
import { useSearchHistory } from '../context/SearchHistoryContext';
import { fetchAvailableCategories, fetchCatalogProducts, fetchCategoryCounts } from '../services/catalogService';
import { normalizeSearchQuery } from '../utils/inputSanitizers';

export function useHomePageState() {
  const location = useLocation();
  const { addQuery } = useSearchHistory();
  const lastRecordedRef = useRef('');

  const searchQueryFromURL = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    return normalizeSearchQuery(queryParams.get('q') || '');
  }, [location.search]);

  const [searchQuery, setSearchQuery] = useState(searchQueryFromURL);
  const [sortBy, setSortBy] = useState('popularity');
  const [filters, setFilters] = useState(() => createDefaultFilters());
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState({});
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const categories = await fetchAvailableCategories();
        if (!isMounted) return;
        setAvailableCategories(categories);
        
        // Загружаем количество товаров по категориям
        const counts = await fetchCategoryCounts();
        if (isMounted && counts) {
          // Считаем общее количество и максимальную цену
          const total = Object.values(counts).reduce((sum, entry) => sum + (entry.count || 0), 0);
          const overallMax = Object.values(counts).reduce((max, entry) => {
            return Math.max(max, entry.maxPrice || 0);
          }, 0);
          setCategoryCounts({ [ALL_CATEGORY]: { count: total, maxPrice: overallMax || null }, ...counts });
        }
      } catch {
        if (!isMounted) return;
        setAvailableCategories([]);
        setCategoryCounts({});
      }
    }

    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoadingProducts(true);
      setProductsError('');

      try {
        const { items, pagination: pag } = await fetchCatalogProducts({
          searchQuery,
          filters,
          sortBy,
          availableCategories,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        
        // API уже возвращает отфильтрованные товары (по цене, маркетплейсам, категории)
        const results = items || [];

        if (!isMounted) return;
        setFilteredProducts(results);
        setPagination(pag);
      } catch (error) {
        if (!isMounted) return;
        setFilteredProducts([]);
        setPagination(null);
        setProductsError(error?.data?.message || 'Failed to load products');
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, filters, sortBy, currentPage]);

  useEffect(() => {
    // Синхронизируем searchQuery только если URL изменился и searchQuery пуст
    if (searchQueryFromURL && searchQuery !== searchQueryFromURL) {
      setSearchQuery(searchQueryFromURL);
    }
  }, [searchQueryFromURL]);

  useEffect(() => {
    const query = normalizeSearchQuery(searchQueryFromURL);
    if (!query) return;

    const key = query.toLowerCase();
    if (lastRecordedRef.current === key) return;
    lastRecordedRef.current = key;
    addQuery(query);
  }, [searchQueryFromURL, addQuery]);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters(createDefaultFilters());
    window.history.pushState({}, '', '/');
    
    // Dispatch custom event to update search input
    window.dispatchEvent(new CustomEvent('clear-search'));
  }, []);

  const handleProductClick = useCallback((product) => {
    console.log('Товар выбран:', product?.name);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
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
  };
}
