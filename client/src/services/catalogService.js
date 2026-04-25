import { apiGet } from "../utils/api/apiClient";
import { normalizeSearchQuery } from "../utils/validation/inputSanitizers";
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

export async function fetchAvailableCategories({ signal } = {}) {
  const response = await apiGet("/products/categories", { schema: categoriesResponseSchema, signal });
  return Array.isArray(response?.categories) ? response.categories : [];
}

export async function fetchCategoryCounts({ signal } = {}) {
  try {
    const response = await apiGet("/products/category-counts", { signal });
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
  signal,
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
    const response = await apiGet("/products/recommended", { schema: productListResponseSchema, signal });
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

  if (filters?.marketplaces && Array.isArray(filters.marketplaces) && filters.marketplaces.length > 0) {
    const dbMarketplaces = mapMarketplacesToDB(filters.marketplaces);
    if (dbMarketplaces.length > 0) {
      params.set("marketplaces", dbMarketplaces.join(","));
    }
  }

  if (filters?.minPrice != null && filters.minPrice !== '') {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters?.maxPrice != null && filters.maxPrice !== '') {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters?.minRating != null && Number(filters.minRating) > 0) {
    params.set("minRating", String(filters.minRating));
  }

  const response = await apiGet(`/products/search?${params.toString()}`, {
    schema: productListResponseSchema,
    signal,
  });

  return {
    items: Array.isArray(response?.items) ? response.items : [],
    pagination: response?.pagination || null,
  };
}

