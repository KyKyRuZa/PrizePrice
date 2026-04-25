export const ALL_CATEGORY = 'Все';

export const DEFAULT_MARKETPLACES = Object.freeze(['Ozon', 'Wildberries', 'Яндекс.Маркет']);

export const MARKETPLACE_DB_MAP = Object.freeze({
  'Ozon': 'ozon',
  'Wildberries': 'wb',
  'Яндекс.Маркет': 'yandex',
});

export const MARKETPLACE_DISPLAY_MAP = Object.freeze({
  'ozon': 'Ozon',
  'wb': 'Wildberries',
  'yandex': 'Яндекс.Маркет',
});

export const RATING_OPTIONS = Object.freeze([5.0, 4.5, 4.0]);
export const DEFAULT_MAX_PRICE = 9999999999;

export const createDefaultFilters = () => ({
  category: ALL_CATEGORY,
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  marketplaces: [...DEFAULT_MARKETPLACES],
});

export function mapMarketplacesToDB(marketplaces = []) {
  return marketplaces.map(mp => MARKETPLACE_DB_MAP[mp] || mp.toLowerCase()).filter(Boolean);
}

export function getEffectivePriceRange(minPrice, maxPrice, fallbackMax = DEFAULT_MAX_PRICE) {
  const effectiveMin = minPrice && minPrice !== '' ? Number(minPrice) : 0;
  const effectiveMax = maxPrice && maxPrice !== '' ? Number(maxPrice) : fallbackMax;
  return { min: effectiveMin, max: effectiveMax };
}
