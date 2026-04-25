import { z } from "zod";

import { searchProducts, getProductById, listCategories, recommendedProducts, countCategories } from "../services/products.service.js";
import { addSearchHistory } from "../services/user.service.js";
import { listPriceHistory } from "../services/priceHistory.service.js";
import { INPUT_LIMITS, sanitizeSearchQuery, sanitizeTextInput } from "../utils/sanitize.js";

const SEARCH_SORTS = new Set(["popularity", "price_asc", "price_desc", "rating", "discount"]);

export async function categories(_req, res) {
  const categories = await listCategories();
  return res.json({ categories });
}

export async function categoryCounts(_req, res) {
  const counts = await countCategories();
  return res.json({ counts });
}

export async function recommended(_req, res) {
  const items = await recommendedProducts();
  return res.json({ items });
}

export async function search(req, res) {
  const q = sanitizeSearchQuery(req.query.q, INPUT_LIMITS.SEARCH_QUERY);
  const category = sanitizeTextInput(req.query.category, {
    maxLength: INPUT_LIMITS.CATEGORY,
    stripHtml: true,
  });
  const requestedSort = sanitizeTextInput(req.query.sort || "popularity", {
    maxLength: 20,
    stripHtml: true,
  }).toLowerCase();
  const sort = SEARCH_SORTS.has(requestedSort) ? requestedSort : "popularity";
  
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  
  const marketplacesParam = req.query.marketplaces || "";
  const marketplaces = marketplacesParam
    ? String(marketplacesParam).split(",").map(m => m.trim()).filter(Boolean)
    : [];
  
  const minPrice = req.query.minPrice !== undefined ? req.query.minPrice : undefined;
  const maxPrice = req.query.maxPrice !== undefined ? req.query.maxPrice : undefined;
  const minRating = req.query.minRating !== undefined ? req.query.minRating : undefined;

  const { items, pagination } = await searchProducts({ 
    q, 
    category, 
    sort, 
    page, 
    limit, 
    marketplaces,
    minPrice,
    maxPrice,
    minRating,
  });

  if (req.userId && q) {
    await addSearchHistory(req.userId, q);
  }

  return res.json({ items, pagination });
}

export async function byId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "VALIDATION_ERROR" });
  const item = await getProductById(id);
  if (!item) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json({ item });
}

export async function priceHistory(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const limit = Number(req.query.limit || 30);
  const marketplace = sanitizeTextInput(req.query.marketplace || "best", {
    maxLength: INPUT_LIMITS.MARKETPLACE,
    stripHtml: true,
  });

  const schema = z.object({ limit: z.number().int().min(1).max(365) });
  const parsed = schema.safeParse({ limit });
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  const items = await listPriceHistory(id, { marketplace, limit });
  return res.json({ items });
}
