import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/api/apiClient", () => ({
  apiGet: vi.fn(),
}));

import { apiGet } from "../utils/api/apiClient";
import { fetchAvailableCategories, fetchCatalogProducts } from "./catalogService";

describe("catalogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads categories from API", async () => {
    vi.mocked(apiGet).mockResolvedValue({ categories: ["Phones", "Consoles"] });

    const categories = await fetchAvailableCategories();

    expect(categories).toEqual(["Phones", "Consoles"]);
    expect(apiGet).toHaveBeenCalledWith(
      "/products/categories",
      expect.objectContaining({ schema: expect.any(Object) })
    );
  });

  it("loads recommended catalog when filters and query are empty", async () => {
    const items = [{ id: 1, name: "Phone" }];
    vi.mocked(apiGet).mockResolvedValue({ items, pagination: null });

    const result = await fetchCatalogProducts({
      searchQuery: "",
      filters: {
        category: "All",
        minPrice: "",
        maxPrice: "",
        minRating: 0,
        marketplaces: ["Ozon", "Wildberries", "Yandex.Market"],
      },
      sortBy: "popularity",
      availableCategories: [],
    });

    expect(result).toEqual({ items, pagination: null });
    expect(apiGet).toHaveBeenCalledWith(
      "/products/recommended",
      expect.objectContaining({ schema: expect.any(Object) })
    );
  });

  it("loads search catalog when query is provided", async () => {
    const items = [{ id: 2, name: "Laptop" }];
    vi.mocked(apiGet).mockResolvedValue({ items, pagination: null });

    const result = await fetchCatalogProducts({
      searchQuery: "laptop",
      filters: {
        category: "All",
        minPrice: "",
        maxPrice: "",
        minRating: 0,
        marketplaces: ["Ozon", "Wildberries", "Yandex.Market"],
      },
      sortBy: "price_asc",
      availableCategories: ["Phones"],
    });

    expect(result).toEqual({ items, pagination: null });
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining("/products/search"),
      expect.objectContaining({ schema: expect.any(Object) })
    );
  });
});
