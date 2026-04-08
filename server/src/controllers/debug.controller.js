import { z } from "zod";

import { config } from "../config/index.js";
import { Offer } from "../models/index.js";
import { INPUT_LIMITS, sanitizeTextInput } from "../utils/sanitize.js";

export async function setOfferPrice(req, res) {
  if (!config.debugAdmin) return res.status(404).json({ error: "NOT_FOUND" });

  const schema = z.object({
    productId: z.number(),
    marketplace: z.string().trim().min(1).max(INPUT_LIMITS.MARKETPLACE),
    price: z.number().int().positive(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });

  await Offer.update(
    { price: parsed.data.price },
    {
      where: {
        productId: parsed.data.productId,
        marketplace: sanitizeTextInput(parsed.data.marketplace, {
          maxLength: INPUT_LIMITS.MARKETPLACE,
          stripHtml: true,
        }),
      },
    }
  );

  return res.json({ ok: true });
}
