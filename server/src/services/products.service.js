import SequelizePkg from "sequelize";
import { Offer, Product } from "../models/index.js";
import { computeBestPrice } from "../utils/index.js";

const { Sequelize, Op } = SequelizePkg;

function getSortOrder(sort) {
  switch (sort) {
    case "price_asc":
      return [[Sequelize.literal("(SELECT MIN(o.price) FROM offers o WHERE o.product_id = \"Product\".id)"), "ASC"]];
    case "price_desc":
      return [[Sequelize.literal("(SELECT MIN(o.price) FROM offers o WHERE o.product_id = \"Product\".id)"), "DESC"]];
    case "rating":
      return [["rating", "DESC"]];
    case "discount":
      return [[Sequelize.literal("(SELECT MAX(o.discount) FROM offers o WHERE o.product_id = \"Product\".id)"), "DESC"]];
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
  };
}

export async function listCategories() {
  const rows = await Product.findAll({
    attributes: ["category"],
    group: ["category"],
    order: [["category", "ASC"]],
    raw: true,
  });
  return rows.map((r) => r.category);
}

export async function countCategories() {
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
    order: [["id", "ASC"], [{ model: Offer, as: "offers" }, "price", "ASC"]],
  });

  const byId = new Map(rows.map((row) => [row.id, mapProductWithOffers(row)]));
  return normalizedIds.map((id) => byId.get(id)).filter(Boolean);
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
}) {
  const search = String(q || "").trim();
  const where = {};
  if (search) where.name = { [Op.iLike]: `%${search}%` };
  if (category) where.category = category;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const offerWhere = {};
  if (Array.isArray(marketplaces) && marketplaces.length > 0) {
    offerWhere.marketplace = { [Op.in]: marketplaces };
  }
  
  if (minPrice != null && minPrice !== '') {
    offerWhere.price = { ...offerWhere.price, [Op.gte]: Number(minPrice) };
  }
  if (maxPrice != null && maxPrice !== '') {
    offerWhere.price = { ...offerWhere.price, [Op.lte]: Number(maxPrice) };
  }

  const hasOfferFilters = offerWhere.marketplace || offerWhere.price;

  const { count } = await Product.findAndCountAll({
    where,
    distinct: true,
    include: hasOfferFilters ? [{
      model: Offer,
      as: "offers",
      where: offerWhere,
      required: true,
    }] : [],
  });

  const total = Array.isArray(count) ? count.length : count;

  const rows = await Product.findAll({
    where,
    limit: limitNum,
    offset,
    order: getSortOrder(sort),
    include: hasOfferFilters ? [{
      model: Offer,
      as: "offers",
      attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
      where: offerWhere,
      required: true,
    }] : [{
      model: Offer,
      as: "offers",
      attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
      required: false,
    }],
  });

  const result = rows.map(mapProductWithOffers);

  return {
    items: result,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasMore: offset + limitNum < total,
    },
  };
}

export async function recommendedProducts() {
  const topRows = await Product.findAll({
    where: { isBestPrice: true },
    attributes: ["id"],
    order: [["reviews", "DESC"]],
    limit: 12,
    raw: true,
  });

  const ids = topRows.map((row) => row.id);
  if (!ids.length) return [];

  const rows = await Product.findAll({
    where: { id: { [Op.in]: ids } },
    include: [
      {
        model: Offer,
        as: "offers",
        attributes: ["marketplace", "price", "oldPrice", "discount", "link"],
        required: false,
      },
    ],
    order: [["id", "ASC"], [{ model: Offer, as: "offers" }, "price", "ASC"]],
  });

  const byId = new Map(rows.map((row) => [row.id, mapProductWithOffers(row)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
