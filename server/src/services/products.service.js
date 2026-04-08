import SequelizePkg from "sequelize";
import { Offer, Product } from "../models/index.js";
import { computeBestPrice, sortProducts } from "../utils/index.js";

const { Sequelize, Op } = SequelizePkg;

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
      [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
    ],
    group: ["category"],
    order: [["category", "ASC"]],
    raw: true,
  });
  
  const counts = {};
  rows.forEach((row) => {
    counts[row.category] = Number(row.count);
  });
  return counts;
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

  // Пагинация
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  // Фильтрация по маркетплейсам и цене
  const offerWhere = {};
  if (Array.isArray(marketplaces) && marketplaces.length > 0) {
    offerWhere.marketplace = { [Op.in]: marketplaces };
  }
  
  // Фильтрация по цене (минимальная цена среди offers)
  if (minPrice != null && minPrice !== '') {
    offerWhere.price = { ...offerWhere.price, [Op.gte]: Number(minPrice) };
  }
  if (maxPrice != null && maxPrice !== '') {
    offerWhere.price = { ...offerWhere.price, [Op.lte]: Number(maxPrice) };
  }

  const hasOfferFilters = offerWhere.marketplace || offerWhere.price;

  // Получаем общее количество товаров для пагинации
  const { count } = await Product.findAndCountAll({ 
    where,
    include: hasOfferFilters ? [{
      model: Offer,
      as: "offers",
      where: offerWhere,
      required: true,
    }] : [],
  });

  const rows = await Product.findAll({
    where,
    limit: limitNum,
    offset,
    order: [["id", "ASC"], [{ model: Offer, as: "offers" }, "price", "ASC"]],
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
    items: sortProducts(result, sort),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum),
      hasMore: offset + limitNum < count,
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
