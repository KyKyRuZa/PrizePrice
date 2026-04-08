const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;
const USERNAME_RE = /^[\p{L}\p{N}._-]{3,30}$/u;
const DISPLAY_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,99}$/u;
const PHONE_INPUT_RE = /^\+?[\d\s\-()]{10,32}$/;
const LOGIN_INPUT_RE = /^[^\u0000-\u001F\u007F]{1,256}$/;

export const INPUT_LIMITS = Object.freeze({
  SEARCH_QUERY: 120,
  CATEGORY: 80,
  MARKETPLACE: 40,
  LOGIN: 256,
  PASSWORD: 256,
  USERNAME: 30,
  DISPLAY_NAME: 100,
  EMAIL: 254,
  PHONE_INPUT: 32,
  OTP_CODE: 6,
  USER_DATA_ITEMS: 500,
});

function clampMaxLength(value, maxLength) {
  const limit = Number(maxLength);
  if (!Number.isFinite(limit) || limit <= 0) return value;
  return value.slice(0, limit);
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

export function sanitizeSearchQuery(value, maxLength = 120) {
  return sanitizeTextInput(value, { maxLength, stripHtml: true });
}

export function sanitizeUserName(value, maxLength = 100) {
  return sanitizeTextInput(value, { maxLength, stripHtml: true });
}

export function sanitizeEmail(value) {
  return sanitizeTextInput(value, { maxLength: 254, stripHtml: true }).toLowerCase();
}

export function isValidUsername(value) {
  const normalized = sanitizeUserName(value, 30);
  return USERNAME_RE.test(normalized);
}

export function isValidDisplayName(value) {
  const normalized = sanitizeUserName(value, 100);
  return DISPLAY_NAME_RE.test(normalized);
}

export function isValidPhoneInput(value) {
  const normalized = String(value ?? "").trim();
  return PHONE_INPUT_RE.test(normalized);
}

export function isValidLoginInput(value) {
  const normalized = String(value ?? "").trim();
  return LOGIN_INPUT_RE.test(normalized);
}
