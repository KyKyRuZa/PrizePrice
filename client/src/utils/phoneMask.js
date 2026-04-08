import { INPUT_LIMITS } from './inputSanitizers';

const PHONE_INPUT_RE = /^\+?[\d\s\-()]{10,32}$/;

/**
 * Форматирует цифры локальной части номера в формат +7 (XXX) XXX-XX-XX
 * digits — только цифры номера БЕЗ кода страны (до 10 цифр)
 * НЕ добавляет и НЕ убирает цифры автоматически
 */
export const formatPhoneNumber = (digits) => {
  const clean = String(digits ?? '').replace(/\D/g, '').slice(0, 10);

  if (clean.length === 0) {
    return '';
  }

  let result = '+7';

  if (clean.length >= 1) {
    result += ' (' + clean.slice(0, 3);
  }
  if (clean.length >= 4) {
    result += ') ' + clean.slice(3, 6);
  } else if (clean.length === 3) {
    result += ')';
  }
  if (clean.length >= 7) {
    result += '-' + clean.slice(6, 8);
  }
  if (clean.length >= 9) {
    result += '-' + clean.slice(8, 10);
  }

  return result;
};

export const normalizePhoneInput = (value) => {
  const input = String(value ?? '').trim();
  
  // Только цифры
  if (/^\d+$/.test(input)) {
    if (input.length === 10) return `+7${input}`;
    if (input.length === 11 && (input[0] === '7' || input[0] === '8')) {
      return `+7${input.slice(1)}`;
    }
    return '';
  }
  
  if (!input || input.length > INPUT_LIMITS.PHONE_INPUT) {
    return '';
  }
  if (!PHONE_INPUT_RE.test(input)) {
    return '';
  }

  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  return '';
};

export const isPhoneLikeInput = (value) => /^[+\d\s\-()]+$/.test(String(value ?? '').trim());

export const validatePhoneNumber = (phone) => {
  const input = String(phone ?? '').trim();
  
  // Только цифры — ровно 10
  if (/^\d{10}$/.test(input)) return true;
  
  // 11 цифр с 7 или 8
  if (/^\d{11}$/.test(input) && (input[0] === '7' || input[0] === '8')) return true;
  
  // Форматированный
  return Boolean(normalizePhoneInput(phone));
};
