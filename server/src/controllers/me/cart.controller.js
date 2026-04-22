import { addToCart, listCart, removeFromCart } from "../../services/user.service.js";
import { listCollectionProducts, parsePaginationParams, requireFiniteParam } from "./shared.js";

export async function cart(req, res) {
  const pagination = parsePaginationParams(req);
  const result = await listCollectionProducts(req.userId, listCart, pagination);
  return res.json({
    items: result.items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pagination.limit),
    },
  });
}

export async function addCart(req, res) {
  const productId = requireFiniteParam(req, res, "productId");
  if (productId === null) return;

  await addToCart(req.userId, productId);
  return res.json({ ok: true });
}

export async function removeCart(req, res) {
  const productId = requireFiniteParam(req, res, "productId");
  if (productId === null) return;

  await removeFromCart(req.userId, productId);
  return res.json({ ok: true });
}
