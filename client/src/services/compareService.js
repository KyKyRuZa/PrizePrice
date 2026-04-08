import { formatRubPrice } from '../utils/price';

export function formatComparePrice(price) {
  return formatRubPrice(price, '');
}

export function getCompareOffers(product) {
  const offers = product?.prices || product?.offers || [];
  return Array.isArray(offers) ? offers : [];
}

export function sortCompareItems(cart = []) {
  const items = Array.isArray(cart) ? cart : [];
  return [...items].sort((a, b) => new Date(b?.addedAt || 0) - new Date(a?.addedAt || 0));
}

export function downloadCompareCsv(cart = []) {
  const rows = [['productId', 'productName', 'marketplace', 'price', 'oldPrice', 'discount', 'link']];

  cart.forEach((product) => {
    const offers = getCompareOffers(product);
    offers.forEach((offer) => {
      rows.push([
        product?.id,
        String(product?.name || ''),
        String(offer?.marketplace || ''),
        offer?.price ?? '',
        offer?.oldPrice ?? '',
        offer?.discount ?? '',
        String(offer?.link || ''),
      ]);
    });
  });

  const escape = (value) => {
    const stringValue = String(value ?? '');
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replaceAll('"', '""')}"`;
    }
    return stringValue;
  };

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'prizeprice-compare.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openExternalLink(link) {
  if (!link) return;
  window.open(link, '_blank', 'noopener,noreferrer');
}
