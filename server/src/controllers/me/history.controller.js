import { z } from "zod";

import {
  addSearchHistory,
  clearSearchHistory,
  deleteHistoryItem,
  getSearchHistory,
} from "../../services/user.service.js";
import { INPUT_LIMITS, sanitizeSearchQuery } from "../../utils/sanitize.js";
import { requireFiniteParam, validationError } from "./shared.js";

export async function history(req, res) {
  const items = await getSearchHistory(req.userId);
  return res.json({ items });
}

export async function importHistory(req, res) {
  const schema = z.object({
    queries: z.array(z.string().trim().max(INPUT_LIMITS.SEARCH_QUERY)).max(50),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const queries = parsed.data.queries
    .map((query) => sanitizeSearchQuery(query, INPUT_LIMITS.SEARCH_QUERY))
    .filter(Boolean);
  await Promise.all(queries.map((query) => addSearchHistory(req.userId, query)));

  const items = await getSearchHistory(req.userId);
  return res.json({ ok: true, items });
}

export async function clearHistory(req, res) {
  await clearSearchHistory(req.userId);
  return res.json({ ok: true });
}

export async function deleteHistory(req, res) {
  const id = requireFiniteParam(req, res, "id");
  if (id === null) return;

  await deleteHistoryItem(req.userId, id);
  return res.json({ ok: true });
}
