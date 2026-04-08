const RUB_PRICE_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
});

export function formatRubPrice(value, fallback = '') {
  if (value == null) return fallback;
  return RUB_PRICE_FORMATTER.format(value);
}
