import { addToCart, listCart, removeFromCart } from "../../services/user.service.js";
import { buildPaginationResponse, listCollectionProducts, parsePaginationParams, requireFiniteParam } from "./shared.js";

export async function cart(req, res) {
  const pagination = parsePaginationParams(req);
  const result = await listCollectionProducts(req.userId, listCart, pagination);
  return res.json(buildPaginationResponse(result, pagination));
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
