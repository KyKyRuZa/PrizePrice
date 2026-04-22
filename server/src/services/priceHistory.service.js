import SequelizePkg from "sequelize";
import { PriceHistory } from "../models/index.js";

const { Op } = SequelizePkg;

export async function recordPriceHistory(productId, marketplace, price) {
  if (!productId || !marketplace || price == null) return;

  const last = await PriceHistory.findOne({
    where: { productId, marketplace },
    attributes: ["price"],
    order: [["createdAt", "DESC"]],
    raw: true,
  });

  if (last?.price != null && Number(last.price) === Number(price)) return;

  await PriceHistory.create({ productId, marketplace: String(marketplace), price: Number(price) });

  const excess = await PriceHistory.findAll({
    where: { productId, marketplace },
    attributes: ["id"],
    order: [["createdAt", "DESC"]],
    offset: 200,
    raw: true,
  });
  if (excess.length) {
    await PriceHistory.destroy({
      where: { id: { [Op.in]: excess.map((x) => x.id) } },
    });
  }
}

export async function listPriceHistory(productId, { marketplace = "best", limit = 30 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 30, 1), 200);
  const mp = String(marketplace || "best");

  const rows = await PriceHistory.findAll({
    where: { productId, marketplace: mp },
    attributes: ["id", "productId", "marketplace", "price", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: lim,
    raw: true,
  });

  return rows.map((r) => ({
    id: r.id,
    product_id: r.productId,
    marketplace: r.marketplace,
    price: r.price,
    created_at: r.createdAt,
  }));
}
