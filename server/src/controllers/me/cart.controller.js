import { addToCart, listCart, removeFromCart } from "../../services/user.service.js";
import { listCollectionProducts, requireFiniteParam } from "./shared.js";

export async function cart(req, res) {
  const items = await listCollectionProducts(req.userId, listCart);
  return res.json({ items });
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
