import { z } from "zod";

const timestampSchema = z.string().min(1);

export const okResponseSchema = z
  .object({
    ok: z.boolean(),
  })
  .passthrough();

export const errorResponseSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
    requestId: z.string().optional(),
    retryAfterSeconds: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const userSchema = z
  .object({
    id: z.number().int().positive(),
    phone: z.string(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    createdAt: timestampSchema.optional(),
    hasPassword: z.boolean(),
    passwordUpdatedAt: timestampSchema.nullable().optional(),
    sms_opt_out: z.boolean().optional(),
  })
  .passthrough();

export const authSuccessSchema = z
  .object({
    user: userSchema,
  })
  .passthrough();

export const userResponseSchema = z
  .object({
    user: userSchema.nullable(),
  })
  .passthrough();

export const resetPasswordSuccessSchema = z
  .object({
    ok: z.literal(true),
    user: userSchema,
  })
  .passthrough();

export const otpRequestedSchema = z
  .object({
    ok: z.literal(true),
    cooldownSeconds: z.number().int().nonnegative(),
    message: z.string().optional(),
    debugCode: z.string().regex(/^\d{6}$/).optional(),
  })
  .passthrough();

export const searchHistoryItemSchema = z
  .object({
    id: z.number().int().positive(),
    query: z.string(),
    created_at: timestampSchema,
  })
  .passthrough();

export const browsingHistoryItemSchema = z
  .object({
    id: z.number().int().positive(),
    productId: z.number().int().positive(),
    viewed_at: timestampSchema,
  })
  .passthrough();

export const userDataPayloadSchema = z
  .object({
    favorites: z.array(z.number().int().positive()),
    cart: z.array(z.number().int().positive()),
    searchHistory: z.array(searchHistoryItemSchema),
    browsingHistory: z.array(browsingHistoryItemSchema),
  })
  .passthrough();

export const priceEntrySchema = z
  .object({
    marketplace: z.string(),
    price: z.number().int().nonnegative(),
    oldPrice: z.number().int().nonnegative().nullable().optional(),
    discount: z.number().int().nullable().optional(),
    link: z.string(),
  })
  .passthrough();

export const productSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string(),
    image: z.string().optional(),
    rating: z.number().optional(),
    reviews: z.number().int().optional(),
    isBestPrice: z.boolean().optional(),
    prices: z.array(priceEntrySchema),
    bestPrice: priceEntrySchema.nullable(),
  })
  .passthrough();

export const productListResponseSchema = z
  .object({
    items: z.array(productSchema),
  })
  .passthrough();

export const productItemResponseSchema = z
  .object({
    item: productSchema,
  })
  .passthrough();

export const categoriesResponseSchema = z
  .object({
    categories: z.array(z.string()),
  })
  .passthrough();

export const meCollectionProductsResponseSchema = z
  .object({
    items: z.array(productSchema),
  })
  .passthrough();

export const bestOfferSchema = z
  .object({
    marketplace: z.string(),
    price: z.number().int().nonnegative(),
    link: z.string(),
  })
  .passthrough();

export const priceWatchRecordSchema = z
  .object({
    id: z.number().int().positive().optional(),
    productId: z.number().int().positive(),
    targetPrice: z.number().int().positive().nullable().optional(),
    dropPercent: z.number().int().min(1).max(90).nullable().optional(),
    active: z.boolean(),
    lastSeenPrice: z.number().int().nonnegative().nullable().optional(),
    lastCheckedAt: timestampSchema.nullable().optional(),
    lastNotifiedAt: timestampSchema.nullable().optional(),
    lastNotifiedPrice: z.number().int().nonnegative().nullable().optional(),
    createdAt: timestampSchema.nullable().optional(),
    updatedAt: timestampSchema.nullable().optional(),
  })
  .passthrough();

export const priceWatchProductSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    category: z.string().optional(),
    image: z.string().optional(),
    rating: z.number().optional(),
    reviews: z.number().int().optional(),
    isBestPrice: z.boolean().optional(),
    bestOffer: bestOfferSchema.nullable(),
  })
  .passthrough();

export const priceWatchListItemSchema = z
  .object({
    watch: priceWatchRecordSchema,
    product: priceWatchProductSchema,
  })
  .passthrough();

export const priceWatchListResponseSchema = z
  .object({
    items: z.array(priceWatchListItemSchema),
  })
  .passthrough();

export const priceWatchUpsertResponseSchema = z
  .object({
    ok: z.literal(true),
    watch: priceWatchRecordSchema,
  })
  .passthrough();

export const okPriceWatchListResponseSchema = z
  .object({
    ok: z.literal(true),
    items: z.array(priceWatchListItemSchema),
  })
  .passthrough();

export const notificationItemSchema = z
  .object({
    id: z.number().int().positive(),
    type: z.string(),
    product_id: z.number().int().positive().nullable().optional(),
    title: z.string(),
    body: z.string(),
    link: z.string(),
    read: z.boolean(),
    created_at: timestampSchema,
  })
  .passthrough();

export const notificationsResponseSchema = z
  .object({
    items: z.array(notificationItemSchema),
    unreadCount: z.number().int().nonnegative(),
  })
  .passthrough();

export function formatZodIssues(error) {
  const issues = Array.isArray(error?.issues) ? error.issues : [];
  return issues
    .map((issue) => {
      const path = Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
