import { z } from "zod";

import {
  importPriceWatches,
  listPriceWatches,
  removePriceWatch,
  upsertPriceWatch,
} from "../../services/priceWatch.service.js";
import { requireFiniteNumber, requireFiniteParam, validationError } from "./shared.js";

export async function priceWatchList(req, res) {
  const items = await listPriceWatches(req.userId);
  return res.json({ items });
}

export async function priceWatchUpsert(req, res) {
  const schema = z.object({
    productId: z.number(),
    targetPrice: z.number().int().positive().nullable().optional(),
    dropPercent: z.number().int().min(1).max(90).nullable().optional(),
    active: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const productId = requireFiniteNumber(parsed.data.productId, res);
  if (productId === null) return;

  const watch = await upsertPriceWatch(req.userId, productId, {
    targetPrice: parsed.data.targetPrice ?? null,
    dropPercent: parsed.data.dropPercent ?? null,
    active: parsed.data.active ?? true,
  });

  return res.json({ ok: true, watch });
}

export async function priceWatchImport(req, res) {
  const schema = z.object({
    watches: z
      .array(
        z.object({
          productId: z.number(),
          targetPrice: z.number().int().positive().nullable().optional(),
          dropPercent: z.number().int().min(1).max(90).nullable().optional(),
          active: z.boolean().optional(),
        })
      )
      .max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res);

  const items = await importPriceWatches(req.userId, parsed.data.watches);
  return res.json({ ok: true, items });
}

export async function priceWatchRemove(req, res) {
  const productId = requireFiniteParam(req, res, "productId");
  if (productId === null) return;

  await removePriceWatch(req.userId, productId);
  return res.json({ ok: true });
}
