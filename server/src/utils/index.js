import { z } from "zod";
import { INPUT_LIMITS, isValidPhoneInput } from "./sanitize.js";

export const phoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(INPUT_LIMITS.PHONE_INPUT)
  .refine((v) => isValidPhoneInput(v), {
    message: "INVALID_PHONE_FORMAT",
  })
  .transform((v) => normalizePhone(v))
  .refine((v) => v.length > 0, {
    message: "INVALID_PHONE_FORMAT",
  });

export function normalizePhone(raw) {
  const input = String(raw ?? "").trim();
  if (!input || !isValidPhoneInput(input)) {
    return "";
  }

  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${digits.slice(1)}`;
  }
  return "";
}

export function computeBestPrice(offers) {
  if (!offers?.length) return null;
  return offers.reduce((min, o) => (o.price < min.price ? o : min), offers[0]);
}

export function sortProducts(products, sort) {
  const copy = [...products];

  const priceOf = (p) => (p?.bestPrice?.price ?? Number.POSITIVE_INFINITY);
  const discountOf = (p) => (p?.bestPrice?.discount ?? 0);

  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => priceOf(a) - priceOf(b));
    case "price_desc":
      return copy.sort((a, b) => priceOf(b) - priceOf(a));
    case "rating":
      return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "discount":
      return copy.sort((a, b) => discountOf(b) - discountOf(a));
    case "popularity":
    default:
      return copy.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  }
}
