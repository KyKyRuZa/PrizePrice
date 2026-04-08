import { ALL_CATEGORY, MAX_PRICE_VALUE } from '../../constants/filters';

export const DEFAULT_EXPANDED_SECTIONS = Object.freeze({
  category: true,
  price: true,
  rating: true,
  marketplace: true,
});

const CATEGORY_COUNTS = {
  Смартфоны: 2,
  'Игровые консоли': 2,
  Ноутбуки: 2,
  Телевизоры: 1,
  Наушники: 1,
  Гаджеты: 2,
  'Техника для дома': 2,
  [ALL_CATEGORY]: 12,
};

export function sanitizePriceInput(value) {
  const numericValue = String(value ?? '').replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return Number(numericValue) > MAX_PRICE_VALUE ? String(MAX_PRICE_VALUE) : numericValue;
}

export function hasInvalidPriceRange(minPrice, maxPrice) {
  return Boolean(minPrice && maxPrice && Number(minPrice) > Number(maxPrice));
}

export function getNextFiltersForPriceChange(filters, type, rawValue) {
  const processedValue = sanitizePriceInput(rawValue);
  const nextFilters = { ...filters };

  if (type === 'min') {
    nextFilters.minPrice = processedValue;
    if (processedValue && filters.maxPrice && Number(processedValue) > Number(filters.maxPrice)) {
      nextFilters.maxPrice = '';
    }
    return nextFilters;
  }

  nextFilters.maxPrice = processedValue;
  if (processedValue && filters.minPrice && Number(processedValue) < Number(filters.minPrice)) {
    nextFilters.minPrice = '';
  }
  return nextFilters;
}

export function toggleMarketplaceSelection(selectedMarketplaces = [], marketplace) {
  if (!Array.isArray(selectedMarketplaces)) {
    return [marketplace];
  }

  if (selectedMarketplaces.includes(marketplace)) {
    return selectedMarketplaces.filter((item) => item !== marketplace);
  }

  return [...selectedMarketplaces, marketplace];
}

export function getCategoryCount(category) {
  return CATEGORY_COUNTS[category] || 0;
}
