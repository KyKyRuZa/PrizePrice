import {
  addFavorite,
  clearFavorites,
  listFavorites,
  removeFavorite,
} from "../../services/user.service.js";
import { buildPaginationResponse, listCollectionProducts, parsePaginationParams, requireFiniteParam } from "./shared.js";

export async function favorites(req, res) {
  const pagination = parsePaginationParams(req);
  const result = await listCollectionProducts(req.userId, listFavorites, pagination);
  return res.json(buildPaginationResponse(result, pagination));
}

export async function addFav(req, res) {
  const productId = requireFiniteParam(req, res, "productId");
  if (productId === null) return;

  await addFavorite(req.userId, productId);
  return res.json({ ok: true });
}

export async function removeFav(req, res) {
  const productId = requireFiniteParam(req, res, "productId");
  if (productId === null) return;

  await removeFavorite(req.userId, productId);
  return res.json({ ok: true });
}

export async function clearFav(req, res) {
  await clearFavorites(req.userId);
  return res.json({ ok: true });
}
