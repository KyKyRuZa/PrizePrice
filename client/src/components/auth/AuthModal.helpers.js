import { INPUT_LIMITS, sanitizeTextInput } from '../../utils/validation/inputSanitizers';
import { isPhoneLikeInput, normalizePhoneInput, validatePhoneNumber } from '../../utils/validation/phoneMask';

const INVALID_PHONE_FORMAT_MESSAGE = 'Invalid phone format. Use +7 (999) 999-99-99';

export const normalizeLoginInputValue = (rawLogin) => {
  const login = sanitizeTextInput(rawLogin, {
    maxLength: INPUT_LIMITS.LOGIN,
    stripHtml: true,
  });
  const looksLikePhone = isPhoneLikeInput(login);
  if (!looksLikePhone) {
    return { login, isPhoneLike: false, isValid: login.length > 0 };
  }

  const normalizedPhone = normalizePhoneInput(login);
  return { login: normalizedPhone || login, isPhoneLike: true, isValid: Boolean(normalizedPhone) };
};

export const getLoginInputError = (normalizedLogin, emptyMessage = 'Пожалуйста, введите email, телефон или логин') => {
  if (!normalizedLogin.login) {
    return emptyMessage;
  }
  if (normalizedLogin.isPhoneLike && !normalizedLogin.isValid) {
    return INVALID_PHONE_FORMAT_MESSAGE;
  }
  return '';
};

export const getErrorCode = (err) => err?.data?.error || err?.response?.data?.error || '';

export const getErrorStatus = (err) => err?.status ?? err?.response?.status;

export const getRetryAfterSeconds = (err) => {
  const rawRetry = err?.data?.retryAfterSeconds ?? err?.response?.data?.retryAfterSeconds;
  const parsedRetry = Number(rawRetry);
  if (!Number.isFinite(parsedRetry) || parsedRetry <= 0) return 60;
  return Math.max(1, Math.ceil(parsedRetry));
};

export const isRateLimitError = (err) => {
  if (getErrorStatus(err) === 429) return true;
  const message = err?.message;
  return typeof message === 'string' && /\b429\b/.test(message);
};

export const getRateLimitPayload = (err, messagePrefix) => {
  if (!isRateLimitError(err)) return null;
  const retryAfter = getRetryAfterSeconds(err);
  return {
    retryAfter,
    message: `${messagePrefix} ${retryAfter} сек.`,
  };
};

export const getCooldownSeconds = (data, fallback = 60) => Number(data?.cooldownSeconds ?? fallback);

export const getCooldownErrorMessage = (seconds) => `Слишком часто. Попробуйте снова через ${seconds} сек.`;

export const extractDebugCode = (data) => {
  const rawCode = data?.debugCode;
  if (rawCode == null) return '';
  const normalizedCode = String(rawCode).replace(/\D/g, '').slice(0, 6);
  return normalizedCode || '';
};

export const normalizeOtpCode = (rawCode) => String(rawCode).trim();

export const getOtpCodeError = (rawCode) => {
  const normalizedCode = normalizeOtpCode(rawCode);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return 'Введите 6-значный код из SMS';
  }
  return '';
};

export const getPasswordValidationError = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return 'Пароли не совпадают';
  }
  if (password.length < 8) {
    return 'Пароль должен содержать не менее 8 символов';
  }
  return '';
};

export const validateAndNormalizePhone = (phone) => {
  if (!validatePhoneNumber(phone)) {
    return { error: 'Введите номер в формате +7 (000) 000-00-00', phone: '' };
  }

  const normalizedPhone = normalizePhoneInput(phone);
  if (!normalizedPhone) {
    return { error: INVALID_PHONE_FORMAT_MESSAGE, phone: '' };
  }

  return { error: '', phone: normalizedPhone };
};

export const validateRegistrationPayload = ({
  username,
  phone,
  password,
  confirmPassword,
  pdConsent,
  smsConsent,
}) => {
  if (!username || !phone || !password || !confirmPassword) {
    return { error: 'Пожалуйста, заполните все поля', phone: '' };
  }

  const normalizedPhone = validateAndNormalizePhone(phone);
  if (normalizedPhone.error) {
    return normalizedPhone;
  }

  if (!pdConsent) {
    return {
      error: 'Необходимо дать согласие на обработку персональных данных',
      phone: '',
    };
  }

  if (!smsConsent) {
    return {
      error: 'Необходимо дать согласие на получение SMS-сообщений',
      phone: '',
    };
  }

  const passwordError = getPasswordValidationError(password, confirmPassword);
  if (passwordError) {
    return { error: passwordError, phone: '' };
  }

  return { error: '', phone: normalizedPhone.phone };
};

export const getLoginPasswordErrorMessage = (errorCode) => {
  if (errorCode === 'INVALID_AUTH_FLOW') {
    return 'Неверный логин/пароль или для аккаунта не задан пароль. Попробуйте вход по коду подтверждения.';
  }
  if (errorCode === 'VALIDATION_ERROR') {
    return 'Проверьте формат логина и пароля.';
  }
  return 'Неверный логин или пароль';
};

export const getRegistrationErrorMessage = (errorCode) => {
  if (errorCode === 'PHONE_EXISTS') {
    return 'Пользователь с таким номером телефона уже существует.';
  }
  if (errorCode === 'USERNAME_EXISTS') {
    return 'Пользователь с таким логином уже существует.';
  }
  return 'Ошибка регистрации. Возможно, данные уже используются.';
};

export const getRegisterWithCodeErrorMessage = (errorCode) => {
  if (errorCode === 'INVALID_OTP') {
    return 'Неверный или просроченный код подтверждения.';
  }
  if (errorCode === 'REGISTRATION_DATA_EXPIRED') {
    return 'Сессия регистрации истекла. Запросите код повторно.';
  }
  if (errorCode === 'PHONE_EXISTS') {
    return 'Пользователь с таким номером уже существует. Попробуйте войти.';
  }
  if (errorCode === 'USERNAME_EXISTS') {
    return 'Логин уже занят. Укажите другой логин и запросите код заново.';
  }
  if (errorCode === 'VALIDATION_ERROR') {
    return 'Проверьте номер телефона и код подтверждения.';
  }
  return 'Не удалось завершить регистрацию. Попробуйте запросить код заново.';
};

export const getResetPasswordErrorMessage = (errorCode) => {
  if (errorCode === 'INVALID_OTP') {
    return 'Неверный или просроченный код. Также проверьте, что аккаунт с этим телефоном уже существует.';
  }
  if (errorCode === 'VALIDATION_ERROR') {
    return 'Проверьте номер телефона, код и новый пароль.';
  }
  if (typeof errorCode === 'string' && errorCode.startsWith('PASSWORD_')) {
    return 'Новый пароль не соответствует требованиям.';
  }
  return 'Ошибка при сбросе пароля. Проверьте код и попробуйте снова.';
};

export const getBackTransition = (step, verificationPurpose) => {
  if (step === 'reset-code') {
    if (verificationPurpose === 'reset') {
      return { nextStep: 'forgot', clearVerificationPurpose: true };
    }
    if (verificationPurpose === 'login') {
      return { nextStep: 'login', clearVerificationPurpose: true };
    }
    if (verificationPurpose === 'register') {
      return { nextStep: 'register', clearVerificationPurpose: true };
    }
    return { nextStep: 'select', clearVerificationPurpose: true };
  }

  if (step === 'reset-new-password') {
    return { nextStep: 'reset-code', clearVerificationPurpose: false };
  }

  return { nextStep: 'select', clearVerificationPurpose: false };
};
