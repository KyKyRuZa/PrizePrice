import { theme } from '../../styles/theme';
import { formatRubPrice } from '../../utils/price';

const MARKETPLACE_META = {
  yandex: { label: 'Яндекс.Маркет', short: 'Я.М', bg: '#ffdb4d', color: '#111111' },
  ozon: { label: 'Ozon', short: 'OZON', bg: '#005bff', color: '#ffffff' },
  wildberries: { label: 'Wildberries', short: 'WB', bg: '#7b2cbf', color: '#ffffff' },
  other: { label: 'Маркетплейс', short: 'MP', bg: theme.colors.gray, color: '#ffffff' },
};

const MARKETPLACE_ORDER = {
  yandex: 0,
  ozon: 1,
  wildberries: 2,
  other: 99,
};

export function normalizeMarketplace(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('янд') || raw.includes('yandex')) return 'yandex';
  if (raw.includes('ozon')) return 'ozon';
  if (raw.includes('wildberries') || raw.includes('wb')) return 'wildberries';
  return 'other';
}

export function buildMarketplaceRows(prices) {
  const normalizedPrices = Array.isArray(prices) ? prices : [];

  return normalizedPrices
    .map((priceInfo, index) => {
      const key = normalizeMarketplace(priceInfo.marketplace);
      const baseMeta = MARKETPLACE_META[key] || MARKETPLACE_META.other;

      return {
        index,
        key,
        priceInfo,
        order: MARKETPLACE_ORDER[key] ?? MARKETPLACE_ORDER.other,
        meta: {
          ...baseMeta,
          label: key === 'other' ? String(priceInfo.marketplace || baseMeta.label) : baseMeta.label,
        },
      };
    })
    .sort((a, b) => a.order - b.order || a.index - b.index);
}

export function formatProductPrice(price) {
  return formatRubPrice(price, '');
}

export function getMarketplaceRating(priceInfo, fallbackRating) {
  const value = Number(priceInfo?.rating ?? fallbackRating ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}
