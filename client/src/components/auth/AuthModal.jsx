import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Phone, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { INPUT_LIMITS, clampInputValue, sanitizeTextInput } from '../../utils/inputSanitizers';
import { formatPhoneNumber } from '../../utils/phoneMask';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import SmsConsentCheckbox from '../consent/SmsConsentCheckbox';
import {
  extractDebugCode,
  getBackTransition,
  getCooldownErrorMessage,
  getCooldownSeconds,
  getErrorCode,
  getLoginInputError,
  getLoginPasswordErrorMessage,
  getOtpCodeError,
  getPasswordValidationError,
  getRateLimitPayload,
  getRegisterWithCodeErrorMessage,
  getRegistrationErrorMessage,
  getResetPasswordErrorMessage,
  normalizeLoginInputValue,
  normalizeOtpCode,
  validateAndNormalizePhone,
  validateRegistrationPayload,
} from './AuthModal.helpers';
import styles from './AuthModal.module.css';

const STEP_TITLE_MAP = {
  select: 'Войти или зарегистрироваться',
  login: 'Вход в аккаунт',
  register: 'Добро пожаловать! Давайте создадим вашу учетную запись',
  forgot: 'Восстановление пароля',
  'reset-code': 'Введите код подтверждения',
  'reset-new-password': 'Придумайте новый пароль',
};

const BACK_ICON_STYLE = { marginRight: 4 };

const AuthModal = ({ onClose }) => {
  const {
    requestCode,
    requestCodeForLogin,
    verifyLoginWithOtp,
    requestCodeForRegistration,
    registerWithCode,
    loginPassword,
    registerWithUsername,
    requestPasswordReset,
    resetPasswordWithOtp,
  } = useAuth();

  const [step, setStep] = useState('select'); // 'select' | 'login' | 'register' | 'forgot' | 'reset-code' | 'reset-new-password' | 'register-code'
  const [verificationPurpose, setVerificationPurpose] = useState(''); // 'login' | 'reset' | 'register'
  const [loginInput, setLoginInput] = useState(''); // может быть телефон или имя пользователя
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsConsentError, setSmsConsentError] = useState('');

  const canResend = cooldown <= 0;

  const subtitle = useMemo(() => {
    if (step === 'login') {
      return 'Введите телефон или логин и пароль для входа.';
    }
    if (step === 'register') {
      return 'Введите данные для регистрации.';
    }
    if (step === 'forgot') {
      return 'Введите номер телефона, чтобы получить код для восстановления пароля.';
    }
    if (step === 'reset-code') {
      return '';
    }
    if (step === 'reset-new-password') {
      return 'Придумайте новый пароль';
    }
    return 'Выберите действие';
  }, [step]);

  const modalTitle = STEP_TITLE_MAP[step] ?? STEP_TITLE_MAP.select;

  const applyDebugCode = (data) => {
    const normalizedCode = extractDebugCode(data);
    if (!normalizedCode) return;
    setDebugCode(normalizedCode);
    setCode(normalizedCode);
  };

  const setVerificationCodeStep = (purpose, data) => {
    setStep('reset-code');
    setVerificationPurpose(purpose);
    setCooldown(getCooldownSeconds(data));
    applyDebugCode(data);
  };

  const handleRateLimitError = (err, messagePrefix) => {
    const rateLimitPayload = getRateLimitPayload(err, messagePrefix);
    if (!rateLimitPayload) return false;
    setCooldown(rateLimitPayload.retryAfter);
    setError(rateLimitPayload.message);
    return true;
  };

  const getNormalizedPhoneOrError = () => {
    const normalizedPhone = validateAndNormalizePhone(phone);
    if (normalizedPhone.error) {
      setError(normalizedPhone.error);
      return '';
    }
    return normalizedPhone.phone;
  };

  const getValidatedLoginOrError = (emptyMessage) => {
    const normalizedLogin = normalizeLoginInputValue(loginInput);
    const loginError = getLoginInputError(normalizedLogin, emptyMessage);
    if (loginError) {
      setError(loginError);
      return null;
    }
    return normalizedLogin;
  };

  const getValidatedCodeOrError = () => {
    const codeError = getOtpCodeError(code);
    if (codeError) {
      setError(codeError);
      return '';
    }
    return normalizeOtpCode(code);
  };

  const clearFlowState = () => {
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const clearVerificationContext = () => {
    setVerificationPurpose('');
    setError('');
  };

  const resetModalState = () => {
    setStep('select');
    setVerificationPurpose('');
    setLoginInput('');
    setPhone('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setError('');
    setDebugCode('');
    setCooldown(0);
  };

  const handleCloseClick = () => {
    resetModalState();
    onClose();
  };

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timerId = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timerId);
  }, [cooldown]);

  const renderPasswordField = ({
    testId,
    label,
    value,
    onChange,
    required = false,
    showValue,
    onToggle,
  }) => (
    <div className={styles.passwordInputContainer}>
      <Input
        data-testid={testId}
        label={label}
        type={showValue ? 'text' : 'password'}
        placeholder="••••••••"
        icon={<Lock size={20} />}
        value={value}
        maxLength={INPUT_LIMITS.PASSWORD}
        onChange={onChange}
        required={required}
      />
      <button className={styles.togglePasswordVisibility} type="button" onClick={onToggle}>
        {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  const renderBackLink = () => (
    <button className={styles.linkBtn} type="button" onClick={handleBack}>
      <ArrowLeft size={14} style={BACK_ICON_STYLE} />
      Назад
    </button>
  );

  const handleRequestCode = async (event) => {
    event?.preventDefault();
    setError('');
    setDebugCode('');

    const formattedPhone = getNormalizedPhoneOrError();
    if (!formattedPhone) return;

    setIsLoading(true);
    try {
      const data = await requestCode(formattedPhone);
      setVerificationCodeStep('reset', data);
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
      setError('Не удалось отправить код. Проверьте, что backend запущен.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestLoginCode = async (event) => {
    event?.preventDefault();
    setError('');
    setDebugCode('');

    const normalizedLogin = getValidatedLoginOrError();
    if (!normalizedLogin) return;

    if (!canResend) {
      setError(getCooldownErrorMessage(cooldown));
      return;
    }

    setIsLoading(true);
    try {
      const data = await requestCodeForLogin(normalizedLogin.login);
      setVerificationCodeStep('login', data);
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
      setError('Не удалось отправить код. Проверьте, что backend запущен.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginWithOtp = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedCode = getValidatedCodeOrError();
    if (!normalizedCode) return;

    const normalizedLogin = getValidatedLoginOrError('Введите телефон или логин');
    if (!normalizedLogin) return;

    setIsLoading(true);
    try {
      await verifyLoginWithOtp(normalizedLogin.login, normalizedCode);
      onClose();
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком много попыток. Попробуйте снова через')) return;
      setError('Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedLogin = getValidatedLoginOrError();
    if (!normalizedLogin) return;

    if (!password) {
      if (!canResend) {
        setError(`Слишком часто. Попробуйте снова через ${cooldown} сек.`);
        return;
      }

      setIsLoading(true);
      try {
        const data = await requestCodeForLogin(normalizedLogin.login);
        setVerificationCodeStep('login', data);
      } catch (err) {
        if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
        setError('Не удалось отправить код. Проверьте, что backend запущен.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      await loginPassword(normalizedLogin.login, password);
      onClose();
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком много попыток. Попробуйте снова через')) return;
      const errorCode = getErrorCode(err);
      setError(getLoginPasswordErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const transition = getBackTransition(step, verificationPurpose);
    setStep(transition.nextStep);

    if (transition.clearVerificationPurpose) {
      setVerificationPurpose('');
    }

    clearFlowState();
  };

  const handleRequestRegistrationCode = async (event) => {
    event.preventDefault();
    setError('');
    setSmsConsentError('');

    const registrationPayload = validateRegistrationPayload({
      username,
      phone,
      password,
      confirmPassword,
      agreedToTerms,
      smsConsent,
    });

    if (registrationPayload.error) {
      if (registrationPayload.error.includes('SMS')) {
        setSmsConsentError(registrationPayload.error);
        return;
      }
      setError(registrationPayload.error);
      return;
    }
    if (registrationPayload.error) {
      setError(registrationPayload.error);
      return;
    }

    const formattedPhone = registrationPayload.phone;

    setIsLoading(true);
    try {
      const data = await requestCodeForRegistration(username, formattedPhone, password, confirmPassword, smsConsent);
      setVerificationCodeStep('register', data);
    } catch (err) {
      const errorCode = getErrorCode(err);
      if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
      setError(getRegistrationErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setSmsConsentError('');

    const registrationPayload = validateRegistrationPayload({
      username,
      phone,
      password,
      confirmPassword,
      agreedToTerms,
      smsConsent,
    });
    if (registrationPayload.error) {
      if (registrationPayload.error.includes('SMS')) {
        setSmsConsentError(registrationPayload.error);
        return;
      }
      setError(registrationPayload.error);
      return;
    }

    const formattedPhone = registrationPayload.phone;

    setIsLoading(true);
    try {
      await registerWithUsername(username, formattedPhone, password, smsConsent);
      onClose();
    } catch (err) {
      const errorCode = getErrorCode(err);
      if (handleRateLimitError(err, 'Слишком много попыток. Попробуйте снова через')) return;
      setError(getRegistrationErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterWithCode = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedCode = getValidatedCodeOrError();
    if (!normalizedCode) return;

    const formattedPhone = getNormalizedPhoneOrError();
    if (!formattedPhone) return;

    setIsLoading(true);
    try {
      await registerWithCode(formattedPhone, normalizedCode);
      onClose();
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком много попыток. Попробуйте снова через')) return;
      const errorCode = getErrorCode(err);
      setError(getRegisterWithCodeErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError('');

    const formattedPhone = getNormalizedPhoneOrError();
    if (!formattedPhone) return;

    setIsLoading(true);
    try {
      const data = await requestPasswordReset(formattedPhone);
      setVerificationCodeStep('reset', data);
      setError('');
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
      setError('Ошибка при отправке кода. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');

    const passwordError = getPasswordValidationError(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const normalizedCode = getValidatedCodeOrError();
    if (!normalizedCode) return;

    const formattedPhone = getNormalizedPhoneOrError();
    if (!formattedPhone) return;

    setIsLoading(true);
    try {
      await resetPasswordWithOtp(formattedPhone, normalizedCode, password);
      setStep('login');
      setVerificationPurpose('');
      clearFlowState();
    } catch (err) {
      if (handleRateLimitError(err, 'Слишком много попыток. Попробуйте снова через')) return;
      const errorCode = getErrorCode(err);
      setError(getResetPasswordErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    setStep('login');
    clearVerificationContext();
  };

  const handleSwitchToRegister = () => {
    setStep('register');
    clearVerificationContext();
    setUsername('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setAgreedToTerms(false);
    setSmsConsent(false);
    setSmsConsentError('');
  };

  const handleSwitchToForgot = () => {
    setStep('forgot');
    clearVerificationContext();
    setCode('');
  };

  const handleResetCodeSubmit = (event) => {
    event.preventDefault();
    if (verificationPurpose === 'login') {
      handleVerifyLoginWithOtp(event);
      return;
    }
    if (verificationPurpose === 'register') {
      handleRegisterWithCode(event);
      return;
    }
    setStep('reset-new-password');
  };

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <button 
          className={styles.closeButton} 
          onClick={handleCloseClick} 
          type="button"
          aria-label="Закрыть модальное окно"
        >
          <X size={22} aria-hidden="true" />
        </button>

        <h2 id="modal-title" className={styles.title} data-testid="auth-modal-title">
          {modalTitle}
        </h2>

        <p id="modal-description" className={styles.subtitle}>
          {subtitle || 'Вход или регистрация в системе'}
        </p>
        {step === 'reset-code' && verificationPurpose === 'login' ? (
          <p className={styles.subtitle}>Введите код подтверждения, который был отправлен на ваш номер телефона для входа в систему</p>
        ) : null}
        {step === 'reset-code' && verificationPurpose === 'reset' ? (
          <p className={styles.subtitle}>{`Введите код, отправленный на ${formatPhoneNumber(phone)}`}</p>
        ) : null}
        {step === 'reset-code' && verificationPurpose === 'register' ? (
          <p className={styles.subtitle}>Введите код подтверждения, который был отправлен на ваш номер телефона для завершения регистрации</p>
        ) : null}

        {error ? <div className={styles.errorMessage} data-testid="auth-error">{error}</div> : null}
        {debugCode ? (
          <div className={styles.hintMessage}>
            Тестовый код (DEBUG): <b>{debugCode}</b>
          </div>
        ) : null}

        {step === 'select' ? (
          <div className={styles.form} role="group" aria-label="Выбор действия">
            <Button data-testid="auth-select-login" type="button" variant="secondary" fullWidth onClick={handleSwitchToLogin}>
              Войти
            </Button>
            <Button
              data-testid="auth-select-register"
              type="button"
              variant="secondary"
              fullWidth
              onClick={handleSwitchToRegister}
            >
              Зарегистрироваться
            </Button>
          </div>
        ) : step === 'login' ? (
          <form className={styles.form} onSubmit={handleLogin} aria-label="Форма входа">
            <Input
              label="Логин"
              type="text"
              placeholder="Введите телефон или логин"
              icon={<Phone size={20} />}
              value={loginInput}
              maxLength={INPUT_LIMITS.LOGIN}
              onChange={(event) => setLoginInput(clampInputValue(event.target.value, INPUT_LIMITS.LOGIN))}
              required
            />

            {renderPasswordField({
              label: 'Пароль',
              value: password,
              onChange: (event) => setPassword(clampInputValue(event.target.value, INPUT_LIMITS.PASSWORD)),
              showValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            <Button data-testid="auth-login-submit" type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>

            <div className={styles.centeredRow}>
              <button className={styles.linkBtn} type="button" onClick={handleRequestLoginCode} disabled={isLoading}>
                Войти по коду подтверждения
              </button>
            </div>

            <div className={styles.centeredRow}>
              <button className={styles.linkBtn} type="button" onClick={handleSwitchToForgot}>
                Забыли пароль?
              </button>
            </div>

            <div className={styles.centeredRow}>
              <button className={styles.linkBtn} data-testid="auth-login-to-register" type="button" onClick={handleSwitchToRegister}>
                Еще нет аккаунта? Зарегистрируйтесь
              </button>
            </div>

            <div className={styles.centeredRow}>{renderBackLink()}</div>
          </form>
        ) : step === 'register' ? (
          <form className={styles.form} onSubmit={handleRequestRegistrationCode}>
            <Input
              data-testid="auth-register-username"
              label="Логин"
              type="text"
              placeholder="Введите логин"
              value={username}
              maxLength={INPUT_LIMITS.USERNAME}
              onChange={(event) =>
                setUsername(sanitizeTextInput(event.target.value, { maxLength: INPUT_LIMITS.USERNAME, stripHtml: true }))
              }
              required
            />

            <Input
              data-testid="auth-register-phone"
              label="Номер телефона"
              type="tel"
              placeholder="+7 (000) 000-00-00"
              icon={<Phone size={20} />}
              value={formatPhoneNumber(phone)}
              maxLength={18}
              onChange={(event) => {
                const rawValue = event.target.value;
                const currentDisplay = formatPhoneNumber(phone);
                const isDelete = rawValue.length < currentDisplay.length;
                
                if (isDelete && phone.length > 0) {
                  setPhone(phone.slice(0, -1));
                } else if (!isDelete) {
                  const digits = rawValue.replace(/\D/g, '');
                  const local = (digits.length > 0 && (digits[0] === '7' || digits[0] === '8'))
                    ? digits.slice(1)
                    : digits;
                  setPhone(local.slice(0, 10));
                }
              }}
              required
            />

            {renderPasswordField({
              testId: 'auth-register-password',
              label: 'Пароль',
              value: password,
              onChange: (event) => setPassword(clampInputValue(event.target.value, INPUT_LIMITS.PASSWORD)),
              required: true,
              showValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            {renderPasswordField({
              testId: 'auth-register-confirm-password',
              label: 'Подтверждение пароля',
              value: confirmPassword,
              onChange: (event) => setConfirmPassword(clampInputValue(event.target.value, INPUT_LIMITS.PASSWORD)),
              required: true,
              showValue: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            <div className={styles.checkboxContainer}>
              <input
                className={styles.styledCheckbox}
                type="checkbox"
                id="terms-agreement"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
              />
              <label htmlFor="terms-agreement">
                Нажимая на кнопку, я соглашаюсь с правилами пользования торговой площадки и политикой конфиденциальности
              </label>
            </div>

            <SmsConsentCheckbox
              checked={smsConsent}
              onChange={(checked) => {
                setSmsConsent(checked);
                setSmsConsentError('');
              }}
              error={smsConsentError}
            />

            <Button data-testid="auth-register-request-code" type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Отправка кода...' : 'Получить код подтверждения'}
            </Button>

            <div className={styles.centeredRow}>
              <button className={styles.linkBtn} type="button" onClick={handleRegister}>
                Зарегистрироваться без подтверждения
              </button>
            </div>

            <div className={styles.centeredRow}>
              <button className={styles.linkBtn} data-testid="auth-register-to-login" type="button" onClick={handleSwitchToLogin}>
                Уже есть аккаунт? Войдите
              </button>
            </div>

            <div className={styles.centeredRow}>{renderBackLink()}</div>
          </form>
        ) : step === 'forgot' ? (
          <form className={styles.form} onSubmit={handleForgotPassword}>
            <Input
              label="Номер телефона"
              type="tel"
              placeholder="+7 (000) 000-00-00"
              icon={<Phone size={20} />}
              value={formatPhoneNumber(phone)}
              maxLength={18}
              onChange={(event) => {
                const rawValue = event.target.value;
                const currentDisplay = formatPhoneNumber(phone);
                const isDelete = rawValue.length < currentDisplay.length;
                
                if (isDelete && phone.length > 0) {
                  setPhone(phone.slice(0, -1));
                } else if (!isDelete) {
                  const digits = rawValue.replace(/\D/g, '');
                  const local = (digits.length > 0 && (digits[0] === '7' || digits[0] === '8'))
                    ? digits.slice(1)
                    : digits;
                  setPhone(local.slice(0, 10));
                }
              }}
              required
            />

            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Отправка...' : 'Получить код'}
            </Button>

            <div className={styles.centeredRow}>{renderBackLink()}</div>
          </form>
        ) : step === 'reset-code' ? (
          <form className={styles.form} onSubmit={handleResetCodeSubmit}>
            <Input
              label="Код из SMS"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="123456"
              icon={<Lock size={20} />}
              value={code}
              maxLength={INPUT_LIMITS.OTP_CODE}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, INPUT_LIMITS.OTP_CODE))}
              required
            />

            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Проверка...' : 'Далее'}
            </Button>

            <div className={styles.row}>
              {renderBackLink()}

              <button
                className={styles.linkBtn}
                type="button"
                onClick={
                  verificationPurpose === 'login'
                    ? handleRequestLoginCode
                    : verificationPurpose === 'register'
                    ? handleRequestRegistrationCode
                    : handleRequestCode
                }
                disabled={!canResend || isLoading}
                style={{ opacity: canResend ? 1 : 0.6, pointerEvents: canResend ? 'auto' : 'none' }}
              >
                {canResend ? 'Отправить код снова' : `Повторить через ${cooldown} сек`}
              </button>
            </div>
          </form>
        ) : step === 'reset-new-password' ? (
          <form className={styles.form} onSubmit={handleResetPassword}>
            {renderPasswordField({
              label: 'Новый пароль',
              value: password,
              onChange: (event) => setPassword(clampInputValue(event.target.value, INPUT_LIMITS.PASSWORD)),
              required: true,
              showValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            {renderPasswordField({
              label: 'Подтверждение нового пароля',
              value: confirmPassword,
              onChange: (event) => setConfirmPassword(clampInputValue(event.target.value, INPUT_LIMITS.PASSWORD)),
              required: true,
              showValue: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить новый пароль'}
            </Button>

            <div className={styles.centeredRow}>{renderBackLink()}</div>
          </form>
        ) : null}
      </div>
    </div>
  );
};

export default AuthModal;

