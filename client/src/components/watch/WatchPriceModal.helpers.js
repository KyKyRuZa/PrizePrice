import { formatRubPrice } from '../../utils/price';

export function formatWatchPrice(price) {
  return formatRubPrice(price, '');
}

export function getBestWatchPrice(product) {
  const offers = product?.prices || product?.offers || [];
  const list = Array.isArray(offers) ? offers : [];
  const best = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
  return best?.price ?? null;
}

export function normalizeWatchNumericInput(value, maxLength) {
  return String(value ?? '')
    .replace(/[^0-9]/g, '')
    .slice(0, maxLength);
}

export function toNullableNumber(value) {
  return String(value).trim() === '' ? null : Number(value);
}

export function hasAnyWatchRule(targetPrice, dropPercent) {
  return String(targetPrice || '').trim() !== '' || String(dropPercent || '').trim() !== '';
}
