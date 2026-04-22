import { z } from "zod";

import {
  addBrowsingHistory,
  addFavorite,
  addSearchHistory,
  addToCart,
  clearBrowsingHistory,
  clearFavorites,
  clearSearchHistory,
  clearCart,
  getBrowsingHistory,
  getSearchHistory,
  listCart,
  listFavorites,
} from "../../services/user.service.js";
import {
  clearPriceWatches,
  importPriceWatches,
  listPriceWatches,
} from "../../services/priceWatch.service.js";
import { buildRequestLogMeta } from "../../utils/requestMeta.js";
import { INPUT_LIMITS, sanitizeSearchQuery } from "../../utils/sanitize.js";
import { logger } from "../../utils/logger.js";
import { sendInternalError } from "../auth.errors.js";
import { Product } from "../../models/index.js";

const userDataSchema = z
  .object({
    favorites: z.array(z.number().int().positive()).max(INPUT_LIMITS.USER_DATA_ITEMS).optional(),
    cart: z.array(z.number().int().positive()).max(INPUT_LIMITS.USER_DATA_ITEMS).optional(),
    searchHistory: z
      .array(
        z.union([
          z.string().trim().max(INPUT_LIMITS.SEARCH_QUERY),
          z.object({
            query: z.string().trim().max(INPUT_LIMITS.SEARCH_QUERY),
          }),
        ])
      )
      .max(INPUT_LIMITS.USER_DATA_ITEMS)
      .optional(),
    browsingHistory: z
      .array(
        z.union([
          z.number().int().positive(),
          z.object({
            productId: z.number().int().positive(),
          }),
        ])
      )
      .max(INPUT_LIMITS.USER_DATA_ITEMS)
      .optional(),
    priceWatch: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          targetPrice: z.number().int().nullable().optional(),
          dropPercent: z.number().int().nullable().optional(),
          active: z.boolean().optional(),
        })
      )
      .max(INPUT_LIMITS.USER_DATA_ITEMS)
      .optional(),
  })
  .strict();

function extractSearchQuery(historyItem) {
  if (typeof historyItem === "object" && historyItem?.query) {
    return historyItem.query;
  }

  if (typeof historyItem === "string") {
    return historyItem;
  }

  return null;
}

function extractBrowsingProductId(historyItem) {
  if (typeof historyItem === "object" && historyItem?.productId) {
    return historyItem.productId;
  }

  if (typeof historyItem === "number") {
    return historyItem;
  }

  return null;
}

function toPositiveIntegerOrNull(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

async function resolveExistingProductIdSet({ favorites, cart, browsingHistory }) {
  const candidateIds = [
    ...favorites,
    ...cart,
    ...browsingHistory.map((item) => extractBrowsingProductId(item)),
  ]
    .map((value) => toPositiveIntegerOrNull(value))
    .filter((value) => value != null);

  if (!candidateIds.length) {
    return new Set();
  }

  const uniqueIds = [...new Set(candidateIds)];
  const rows = await Product.findAll({
    where: { id: uniqueIds },
    attributes: ["id"],
    raw: true,
  });

  return new Set(rows.map((row) => Number(row.id)));
}

function keepExistingProductId(productId, existingProductIds) {
  const normalizedId = toPositiveIntegerOrNull(productId);
  if (normalizedId == null) {
    return null;
  }

  return existingProductIds.has(normalizedId) ? normalizedId : null;
}

async function replaceCollection({ userId, clearFn, addFn, items, mapItem }) {
  await clearFn(userId);

  for (const item of items) {
    const value = mapItem(item);
    if (value == null) {
      continue;
    }

    await addFn(userId, value);
  }
}

export const getUserData = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const favorites = await listFavorites(user.id);
    const cart = await listCart(user.id);
    const searchHistory = await getSearchHistory(user.id);
    const browsingHistory = await getBrowsingHistory(user.id);
    const priceWatch = await listPriceWatches(user.id);

    return res.json({
      favorites,
      cart,
      searchHistory,
      browsingHistory,
      priceWatch,
    });
  } catch (error) {
    logger.error("get_user_data_failed", {
      ...buildRequestLogMeta(req),
      message: error?.message,
      stack: error?.stack,
    });
    return sendInternalError(res, req);
  }
};

export const updateUserData = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const parsed = userDataSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }

    const {
      favorites = [],
      cart = [],
      searchHistory = [],
      browsingHistory = [],
      priceWatch = [],
    } = parsed.data;

    const existingProductIds = await resolveExistingProductIdSet({
      favorites,
      cart,
      browsingHistory,
    });

    await replaceCollection({
      userId: user.id,
      clearFn: clearFavorites,
      addFn: addFavorite,
      items: favorites,
      mapItem: (productId) => keepExistingProductId(productId, existingProductIds),
    });

    await replaceCollection({
      userId: user.id,
      clearFn: clearCart,
      addFn: addToCart,
      items: cart,
      mapItem: (productId) => keepExistingProductId(productId, existingProductIds),
    });

    await replaceCollection({
      userId: user.id,
      clearFn: clearSearchHistory,
      addFn: addSearchHistory,
      items: searchHistory,
      mapItem: (historyItem) => {
        const rawQuery = extractSearchQuery(historyItem);
        return sanitizeSearchQuery(rawQuery, INPUT_LIMITS.SEARCH_QUERY);
      },
    });

    await replaceCollection({
      userId: user.id,
      clearFn: clearBrowsingHistory,
      addFn: addBrowsingHistory,
      items: browsingHistory,
      mapItem: (historyItem) => keepExistingProductId(extractBrowsingProductId(historyItem), existingProductIds),
    });

    await clearPriceWatches(user.id);
    const validWatches = priceWatch.filter((w) => w?.productId != null);
    if (validWatches.length > 0) {
      await importPriceWatches(user.id, validWatches);
    }

    return res.json({ ok: true });
  } catch (error) {
    logger.error("update_user_data_failed", {
      ...buildRequestLogMeta(req),
      message: error?.message,
      stack: error?.stack,
    });
    return sendInternalError(res, req);
  }
};
