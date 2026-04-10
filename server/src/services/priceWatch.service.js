import SequelizePkg from "sequelize";
import { Offer, PriceWatch, Product } from "../models/index.js";

const { Op } = SequelizePkg;

export async function listPriceWatches(userId) {
  const watches = await PriceWatch.findAll({
    where: { userId },
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "name", "category", "image", "rating", "reviews", "isBestPrice"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  const productIds = watches.map((w) => w.productId).filter((x) => Number.isFinite(Number(x)));
  const bestByProduct = new Map();
  if (productIds.length) {
    const offers = await Offer.findAll({
      where: { productId: { [Op.in]: productIds } },
      attributes: ["productId", "marketplace", "price", "link"],
      order: [["productId", "ASC"], ["price", "ASC"]],
      raw: true,
    });
    for (const o of offers) {
      if (!bestByProduct.has(o.productId)) {
        bestByProduct.set(o.productId, {
          marketplace: o.marketplace,
          price: o.price,
          link: o.link,
        });
      }
    }
  }

  return watches.map((w) => {
    const row = w.toJSON();
    const p = row.product;
    const bestOffer = bestByProduct.get(row.productId) || null;
    return {
      watch: {
        id: row.id,
        productId: row.productId,
        targetPrice: row.targetPrice,
        dropPercent: row.dropPercent,
        active: row.active,
        lastSeenPrice: row.lastSeenPrice,
        lastCheckedAt: row.lastCheckedAt,
        lastNotifiedAt: row.lastNotifiedAt,
        lastNotifiedPrice: row.lastNotifiedPrice,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      product: {
        id: p.id,
        name: p.name,
        category: p.category,
        image: p.image,
        rating: p.rating,
        reviews: p.reviews,
        isBestPrice: p.isBestPrice,
        bestOffer,
      },
    };
  });
}

export async function upsertPriceWatch(userId, productId, { targetPrice = null, dropPercent = null, active = true } = {}) {
  const tp = targetPrice == null || targetPrice === "" ? null : Number(targetPrice);
  const dp = dropPercent == null || dropPercent === "" ? null : Number(dropPercent);
  const act = Boolean(active);

  const [instance] = await PriceWatch.upsert(
    {
      userId,
      productId,
      targetPrice: tp,
      dropPercent: dp,
      active: act,
    },
    { returning: true }
  );

  // Some dialect/driver combos may not return full instance from upsert.
  const row = instance?.toJSON?.() || (await PriceWatch.findOne({ where: { userId, productId } }))?.toJSON?.();
  return row || null;
}

export async function removePriceWatch(userId, productId) {
  await PriceWatch.destroy({ where: { userId, productId } });
}

export async function clearPriceWatches(userId) {
  await PriceWatch.destroy({ where: { userId } });
}

export async function importPriceWatches(userId, watches = []) {
  const list = Array.isArray(watches) ? watches : [];
  for (const w of list) {
    const productId = Number(w?.productId);
    if (!Number.isFinite(productId)) continue;
    await upsertPriceWatch(userId, productId, {
      targetPrice: w?.targetPrice ?? null,
      dropPercent: w?.dropPercent ?? null,
      active: w?.active ?? true,
    });
  }

  return listPriceWatches(userId);
}

export async function updateWatchRuntime(productId, userId, patch = {}) {
  const update = {};
  if (Object.prototype.hasOwnProperty.call(patch, "lastSeenPrice")) update.lastSeenPrice = patch.lastSeenPrice;
  if (Object.prototype.hasOwnProperty.call(patch, "lastCheckedAt")) update.lastCheckedAt = patch.lastCheckedAt;
  if (Object.prototype.hasOwnProperty.call(patch, "lastNotifiedAt")) update.lastNotifiedAt = patch.lastNotifiedAt;
  if (Object.prototype.hasOwnProperty.call(patch, "lastNotifiedPrice")) update.lastNotifiedPrice = patch.lastNotifiedPrice;
  if (!Object.keys(update).length) return;

  await PriceWatch.update(update, { where: { userId, productId } });
}
