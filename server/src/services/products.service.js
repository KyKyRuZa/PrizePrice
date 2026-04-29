import SequelizePkg from "sequelize";
import { Offer, Product, ProductCanonicalGroup } from "../models/index.js";
import { computeBestPrice } from "../utils/index.js";
import { getOrSet, redisGet, redisSet } from "./cache.service.js";

const { Sequelize, Op } = SequelizePkg;

const CACHE_TTL_CATEGORIES = 900;
const CACHE_TTL_SEARCH = 120;

function makeSearchCacheKey(params) {
  const { q, category, sort, page, limit, marketplaces, minPrice, maxPrice, minRating } = params;
  return `search:${[q, category, sort, page, limit, (marketplaces || []).join(","), minPrice, maxPrice, minRating].join(":")}`;
}

function getSortOrder(sort) {
  switch (sort) {
    case "price_asc":
      return [[Sequelize.literal("(SELECT MIN(o.price) FROM offers o WHERE o.product_id = products.id)"), "ASC"]];
    case "price_desc":
      return [[Sequelize.literal("(SELECT MIN(o.price) FROM offers o WHERE o.product_id = products.id)"), "DESC"]];
    case "rating":
      return [["rating", "DESC"]];
    case "discount":
      return [[Sequelize.literal("(SELECT MAX(o.discount) FROM offers o WHERE o.product_id = products.id)"), "DESC"]];
    case "popularity":
    default:
      return [["id", "ASC"]];
  }
}

function mapProductWithOffers(productInstance) {
  const offers = (productInstance.offers || [])
    .map((offer) => offer.toJSON())
    .sort((a, b) => a.price - b.price);

  return {
    id: productInstance.id,
    name: productInstance.name,
    category: productInstance.category,
    image: productInstance.image,
    rating: productInstance.rating,
    reviews: productInstance.reviews,
    isBestPrice: productInstance.isBestPrice,
    prices: offers,
    bestPrice: computeBestPrice(offers),
    canonicalName: null,
  };
}

async function getCanonicalGroupsMap(productIds) {
  // Since product_canonical_groups is small (few dozen groups), fetch all and build map.
  // This avoids array overlap query complexities and ensures correct mapping.
  if (!productIds.length) return new Map();

  const allGroups = await ProductCanonicalGroup.findAll();
  const productToGroup = new Map();
  for (const group of allGroups) {
    const rawPids = group.productIds || [];
    const pids = Array.isArray(rawPids) ? rawPids.map(pid => Number(pid)) : [];
    for (const pid of pids) {
      productToGroup.set(pid, group);
    }
  }
  return productToGroup;
}

function groupProducts(products, productToGroupMap) {
  const groups = new Map();

  for (const product of products) {
    const group = productToGroupMap.get(product.id);
    const canonicalName = group ? group.canonicalName : null;
    const key = canonicalName || `__id__${product.id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        rating: product.rating,
        reviews: product.reviews,
        isBestPrice: product.isBestPrice,
        offersMap: new Map(),
      });
    }

    const groupData = groups.get(key);
    const offers = product.offers || [];

    for (const offer of offers) {
      const oJson = offer.toJSON();
      const mp = oJson.marketplace;
      const existing = groupData.offersMap.get(mp);
      if (!existing || oJson.price < existing.price) {
        groupData.offersMap.set(mp, oJson);
      }
    }

    if (product.reviews > groupData.reviews) {
      groupData.rating = product.rating;
      groupData.reviews = product.reviews;
    }
  }

  const result = [];
  for (const [key, data] of groups.entries()) {
    const offers = Array.from(data.offersMap.values()).sort((a, b) => a.price - b.price);
    result.push({
      id: data.id,
      name: data.name,
      category: data.category,
      image: data.image,
      rating: data.rating,
      reviews: data.reviews,
      isBestPrice: offers.some((o) => o.discount && o.discount > 0),
      prices: offers,
      bestPrice: computeBestPrice(offers),
      canonicalName: key.startsWith("__id__") ? null : key,
    });
  }

  return result;
}

function sortGroupedProducts(products, sort) {
  const sorted = [...products];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.bestPrice - b.bestPrice);
    case "price_desc":
      return sorted.sort((a, b) => b.bestPrice - a.bestPrice);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "discount":
      return sorted.sort((a, b) => {
        const aMax = Math.max(...a.prices.map((p) => p.discount || 0));
        const bMax = Math.max(...b.prices.map((p) => p.discount || 0));
        return bMax - aMax;
      });
    case "popularity":
    default:
      return sorted.sort((a, b) => a.id - b.id);
  }
}

export async function listCategories() {
  return getOrSet(
    "categories:list",
    async () => {
      const rows = await Product.findAll({
        attributes: ["category"],
        group: ["category"],
        order: [["category", "ASC"]],
        raw: true,
      });
      return rows.map((r) => r.category);
    },
    CACHE_TTL_CATEGORIES
  );
}

export async function countCategories() {
  return getOrSet(
    "categories:count",
    async () => {
      const rows = await Product.findAll({
        attributes: [
          "category",
          [Sequelize.fn("COUNT", Sequelize.col("Product.id")), "count"],
          [Sequelize.fn("MAX", Sequelize.col("offers.price")), "maxPrice"],
        ],
        include: [
          {
            model: Offer,
            as: "offers",
            attributes: [],
            required: false,
          },
        ],
        group: ["category"],
        order: [["category", "ASC"]],
        raw: true,
      });

      const result = {};
      rows.forEach((row) => {
        result[row.category] = {
          count: Number(row.count),
          maxPrice: row.maxPrice ? Number(row.maxPrice) : null,
        };
      });
      return result;
    },
    CACHE_TTL_CATEGORIES
  );
}

export async function getProductById(id) {
  const p = await Product.findByPk(id, {
    include: [
      {
        model: Offer,
        as: "offers",
        attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
        required: false,
      },
    ],
  });
  if (!p) return null;

  const groups = await ProductCanonicalGroup.findAll({
    where: { productIds: { [Op.overlap]: [id] } },
  });

  if (groups.length > 0) {
    const group = groups[0];
    const rawPids = group.productIds || [];
    const pids = Array.isArray(rawPids) ? rawPids.map(pid => Number(pid)) : [];
    const allProducts = await Product.findAll({
      where: { id: { [Op.in]: pids } },
      include: [
        {
          model: Offer,
          as: "offers",
          attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
          required: false,
        },
      ],
    });
    const productToGroup = new Map();
    for (const pid of pids) {
      productToGroup.set(pid, group);
    }
    const grouped = groupProducts(allProducts, productToGroup);
    return grouped[0] || null;
  }

  return mapProductWithOffers(p);
}

export async function getProductsByIds(ids = []) {
  const normalizedIds = (Array.isArray(ids) ? ids : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  if (!normalizedIds.length) return [];

  const uniqueIds = Array.from(new Set(normalizedIds));
  const rows = await Product.findAll({
    where: { id: { [Op.in]: uniqueIds } },
    include: [
      {
        model: Offer,
        as: "offers",
        attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
        required: false,
      },
    ],
  });

  const productToGroup = await getCanonicalGroupsMap(rows.map((p) => p.id));
  const grouped = groupProducts(rows, productToGroup);

  return grouped;
}

export async function searchProducts({
  q = "",
  category = "",
  sort = "popularity",
  page = 1,
  limit = 20,
  marketplaces = [],
  minPrice,
  maxPrice,
  minRating,
}) {
  const searchParams = { q, category, sort, page, limit, marketplaces, minPrice, maxPrice, minRating };
  const cacheKey = makeSearchCacheKey(searchParams);

  const cached = await redisGet(cacheKey);
  if (cached) return cached;

  const search = String(q || "").trim();
  const where = {};
  if (search) where.name = { [Op.iLike]: `%${search}%` };
  if (category) where.category = category;
  if (minRating != null && minRating !== "" && Number(minRating) > 0) {
    where.rating = { [Op.gte]: Number(minRating) };
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const offerWhere = {};
  if (Array.isArray(marketplaces) && marketplaces.length > 0) {
    offerWhere.marketplace = { [Op.in]: marketplaces };
  }

  if (minPrice != null && minPrice !== "") {
    offerWhere.price = { ...offerWhere.price, [Op.gte]: Number(minPrice) };
  }
  if (maxPrice != null && maxPrice !== "") {
    offerWhere.price = { ...offerWhere.price, [Op.lte]: Number(maxPrice) };
  }

  const hasOfferFilters = offerWhere.marketplace || offerWhere.price;

  const rows = await Product.findAll({
    where,
    include: hasOfferFilters
      ? [
          {
            model: Offer,
            as: "offers",
            where: offerWhere,
            required: true,
            attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
          },
        ]
      : [
          {
            model: Offer,
            as: "offers",
            required: false,
            attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
          },
        ],
  });

   const productToGroup = await getCanonicalGroupsMap(rows.map((p) => p.id));
   let grouped = groupProducts(rows, productToGroup);
   const sorted = sortGroupedProducts(grouped, sort);
   const total = sorted.length;
   const start = (pageNum - 1) * limitNum;
   const paginated = sorted.slice(start, start + limitNum);

   const items = paginated.map((p) => ({
     id: p.id,
     name: p.name,
     category: p.category,
     image: p.image,
     rating: p.rating,
     reviews: p.reviews,
     isBestPrice: p.isBestPrice,
     prices: p.prices,
     bestPrice: p.bestPrice,
     canonicalName: p.canonicalName,
   }));

   const response = {
     items,
     pagination: {
       page: pageNum,
       limit: limitNum,
       total,
       totalPages: Math.ceil(total / limitNum),
       hasMore: start + limitNum < total,
     },
   };

  await redisSet(cacheKey, response, CACHE_TTL_SEARCH);
  return response;
}

export async function recommendedProducts() {
  const rows = await Product.findAll({
    where: { isBestPrice: true },
    include: [
      {
        model: Offer,
        as: "offers",
        attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
        required: false,
      },
    ],
    order: [["reviews", "DESC"]],
    limit: 50,
  });

  const productToGroup = await getCanonicalGroupsMap(rows.map((p) => p.id));
  const grouped = groupProducts(rows, productToGroup);
  const sorted = sortGroupedProducts(grouped, "popularity");
  return sorted.slice(0, 12);
}
