// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;

export const INPUT_LIMITS = Object.freeze({
  SEARCH_QUERY: 120,
  LOGIN: 256,
  PASSWORD: 256,
  USERNAME: 30,
  DISPLAY_NAME: 100,
  PHONE_INPUT: 32,
  OTP_CODE: 6,
});

function clampMaxLength(value, maxLength) {
  const limit = Number(maxLength);
  if (!Number.isFinite(limit) || limit <= 0) return String(value ?? "");
  return String(value ?? "").slice(0, limit);
}

export function sanitizeTextInput(value, { maxLength = 256, stripHtml = true } = {}) {
  let text = String(value ?? "");
  text = text.normalize("NFKC");
  text = text.replace(CONTROL_CHARS_RE, " ");
  if (stripHtml) {
    text = text.replace(HTML_TAG_RE, " ");
  }
  text = text.replace(/[<>]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return clampMaxLength(text, maxLength);
}

export function normalizeSearchQuery(value) {
  return sanitizeTextInput(value, {
    maxLength: INPUT_LIMITS.SEARCH_QUERY,
    stripHtml: true,
  });
}

export function clampInputValue(value, maxLength) {
  return clampMaxLength(value, maxLength);
}

