import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ALL_CATEGORY, createDefaultFilters, DEFAULT_MARKETPLACES } from '../constants/filters';
import { useSearchHistory } from '../context/SearchHistoryContext';
import { fetchAvailableCategories, fetchCatalogProducts, fetchCategoryCounts } from '../services/catalogService';
import { normalizeSearchQuery } from '../utils/validation/inputSanitizers';
import useDebounce from '../hooks/useDebounce';

function parseQueryParams(search) {
  const params = new URLSearchParams(search);
  const query = normalizeSearchQuery(params.get('q') || '');
  const category = params.get('category') || ALL_CATEGORY;
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const minRating = params.get('minRating') || '0';
  const inStock = params.get('inStock') || 'all';
  const sort = params.get('sort') || 'popularity';
  const page = parseInt(params.get('page') || '1', 10);
  return { searchQuery: query, category, minPrice, maxPrice, minRating, inStock, sort, page };
}

export function useCatalogPageState() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addQuery } = useSearchHistory();
  const lastRecordedRef = useRef('');

  const initialParams = useMemo(() => parseQueryParams(location.search), [location.search]);

  const [searchQuery, setSearchQuery] = useState(initialParams.searchQuery);
  const [filters, setFilters] = useState({
    category: initialParams.category,
    minPrice: initialParams.minPrice,
    maxPrice: initialParams.maxPrice,
    minRating: initialParams.minRating || 0,
    inStock: initialParams.inStock,
    marketplaces: [...DEFAULT_MARKETPLACES],
  });
  const [sortBy, setSortBy] = useState(initialParams.sort);
  const [currentPage, setCurrentPage] = useState(initialParams.page);

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const ITEMS_PER_PAGE = 20;

  const filterParams = useMemo(() => ({
    searchQuery,
    filters,
    sortBy,
  }), [searchQuery, filters, sortBy]);

  const debouncedParams = useDebounce(filterParams, 250);

  useEffect(() => {
    const { searchQuery: q, category, minPrice, maxPrice, minRating, inStock, sort, page } = parseQueryParams(location.search);
    setSearchQuery(q);
    setFilters({
      category,
      minPrice,
      maxPrice,
      minRating: Number(minRating),
      inStock,
      marketplaces: [...DEFAULT_MARKETPLACES],
    });
    setSortBy(sort);
    setCurrentPage(page);
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const [categories, counts] = await Promise.all([
          fetchAvailableCategories({ signal: controller.signal }),
          fetchCategoryCounts({ signal: controller.signal })
        ]);
        
        if (!isMounted) return;
        setAvailableCategories(categories);

        if (isMounted && counts) {
          const total = Object.values(counts).reduce((sum, entry) => sum + (entry.count || 0), 0);
          const overallMax = Object.values(counts).reduce((max, entry) => Math.max(max, entry.maxPrice || 0), 0);
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
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let controller = new AbortController();
    let requestId = 0;

    async function loadProducts() {
      const currentRequestId = ++requestId;
      setIsLoadingProducts(true);
      setProductsError('');

      try {
        const { items, pagination: pag } = await fetchCatalogProducts({
          searchQuery: debouncedParams.searchQuery,
          filters: debouncedParams.filters,
          sortBy: debouncedParams.sortBy,
          availableCategories,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          signal: controller.signal,
        });

        if (!isMounted || currentRequestId !== requestId) return;
        setFilteredProducts(items || []);
        setPagination(pag);
      } catch (error) {
        if (!isMounted || currentRequestId !== requestId) return;
        if (error.name === 'AbortError') {
          return;
        }
        setFilteredProducts([]);
        setPagination(null);
        setProductsError(error?.data?.message || 'Не удалось загрузить товары');
      } finally {
        if (isMounted && currentRequestId === requestId) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
      if (controller) {
        controller.abort();
      }
    };
  }, [debouncedParams, currentPage, availableCategories]);

  useEffect(() => {
    const query = normalizeSearchQuery(searchQuery);
    if (!query) return;

    const key = query.toLowerCase();
    if (lastRecordedRef.current === key) return;
    lastRecordedRef.current = key;
    addQuery(query);
  }, [searchQuery, addQuery]);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters(createDefaultFilters());
    setCurrentPage(1);
    navigate('/catalog', { replace: true });
    window.dispatchEvent(new CustomEvent('clear-search'));
  }, [navigate]);

  const handleProductClick = useCallback((product) => {
    if (product?.id) {
      navigate(`/product/${product.id}`);
    }
  }, [navigate]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.category && filters.category !== ALL_CATEGORY) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minRating && Number(filters.minRating) > 0) params.set('minRating', String(filters.minRating));
    if (filters.inStock && filters.inStock !== 'all') params.set('inStock', filters.inStock);
    if (sortBy !== 'popularity') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', String(currentPage));

    const newSearch = params.toString();
    const currentSearch = location.search.slice(1);
    if (newSearch !== currentSearch) {
      navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, sortBy, currentPage, navigate]);

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
    setSortBy: handleSortChange,
    handleFilterChange,
    handleClearSearch,
    handleProductClick,
    handlePageChange,
  };
}
