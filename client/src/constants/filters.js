export const ALL_CATEGORY = 'Все';

// Отображаемые названия маркетплейсов
export const DEFAULT_MARKETPLACES = Object.freeze(['Ozon', 'Wildberries', 'Яндекс.Маркет']);

// Маппинг отображаемых названий в значения БД
export const MARKETPLACE_DB_MAP = Object.freeze({
  'Ozon': 'ozon',
  'Wildberries': 'wb',
  'Яндекс.Маркет': 'yandex',
});

// Обратный маппинг (БД -> отображение)
export const MARKETPLACE_DISPLAY_MAP = Object.freeze({
  'ozon': 'Ozon',
  'wb': 'Wildberries',
  'yandex': 'Яндекс.Маркет',
});

export const RATING_OPTIONS = Object.freeze([4.5, 4.0, 3.5, 3.0]);
export const DEFAULT_MAX_PRICE = 9999999999;

export const createDefaultFilters = () => ({
  category: ALL_CATEGORY,
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  marketplaces: [...DEFAULT_MARKETPLACES],
});

// Конвертация отображаемых названий в значения БД
export function mapMarketplacesToDB(marketplaces = []) {
  return marketplaces.map(mp => MARKETPLACE_DB_MAP[mp] || mp.toLowerCase()).filter(Boolean);
}

// Получение эффективных значений цены для фильтрации (используется на сервере)
export function getEffectivePriceRange(minPrice, maxPrice, fallbackMax = DEFAULT_MAX_PRICE) {
  const effectiveMin = minPrice && minPrice !== '' ? Number(minPrice) : 0;
  const effectiveMax = maxPrice && maxPrice !== '' ? Number(maxPrice) : fallbackMax;
  return { min: effectiveMin, max: effectiveMax };
}
