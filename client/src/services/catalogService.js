import { apiGet } from "../utils/apiClient";
import { normalizeSearchQuery } from "../utils/inputSanitizers";
import { categoriesResponseSchema, productListResponseSchema } from "../contracts/apiSchemas";
import { mapMarketplacesToDB } from "../constants/filters";

export function resolveCategoryFilter(category, availableCategories) {
  if (!category) return "";
  if (!Array.isArray(availableCategories) || !availableCategories.includes(category)) return "";
  return category;
}

export function hasMarketplaceFilter(marketplaces = []) {
  return Array.isArray(marketplaces) && marketplaces.length > 0 && marketplaces.length < 3;
}

export async function fetchAvailableCategories() {
  const response = await apiGet("/products/categories", { schema: categoriesResponseSchema });
  return Array.isArray(response?.categories) ? response.categories : [];
}

export async function fetchCategoryCounts() {
  try {
    const response = await apiGet("/products/category-counts");
    return response?.counts || {};
  } catch {
    return {};
  }
}

export async function fetchCatalogProducts({
  searchQuery,
  filters,
  sortBy,
  availableCategories,
  page = 1,
  limit = 20,
}) {
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const normalizedCategory = resolveCategoryFilter(filters?.category, availableCategories);
  const useRecommended =
    !normalizedQuery &&
    !normalizedCategory &&
    !filters?.minPrice &&
    !filters?.maxPrice &&
    !filters?.minRating &&
    !hasMarketplaceFilter(filters?.marketplaces) &&
    sortBy === "popularity";

  if (useRecommended) {
    const response = await apiGet("/products/recommended", { schema: productListResponseSchema });
    return {
      items: Array.isArray(response?.items) ? response.items : [],
      pagination: null,
    };
  }

  const params = new URLSearchParams();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (normalizedCategory) params.set("category", normalizedCategory);
  params.set("sort", sortBy);
  params.set("page", String(page));
  params.set("limit", String(limit));
  
  // Фильтрация по маркетплейсам
  if (filters?.marketplaces && Array.isArray(filters.marketplaces) && filters.marketplaces.length > 0) {
    // Конвертируем отображаемые названия в значения БД
    const dbMarketplaces = mapMarketplacesToDB(filters.marketplaces);
    if (dbMarketplaces.length > 0) {
      params.set("marketplaces", dbMarketplaces.join(","));
    }
  }
  
  // Фильтрация по цене
  if (filters?.minPrice != null && filters.minPrice !== '') {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters?.maxPrice != null && filters.maxPrice !== '') {
    params.set("maxPrice", String(filters.maxPrice));
  }

  const response = await apiGet(`/products/search?${params.toString()}`, {
    schema: productListResponseSchema,
  });
  
  return {
    items: Array.isArray(response?.items) ? response.items : [],
    pagination: response?.pagination || null,
  };
}

