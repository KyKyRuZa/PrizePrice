import React, { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { formatPhoneNumber } from '../../utils/validation/phoneMask';
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
import {
  SelectStep,
  LoginStep,
  RegisterStep,
  ForgotStep,
  ResetCodeStep,
  ResetNewPasswordStep,
} from './steps';
import styles from './AuthModal.module.css';

const STEP_TITLE_MAP = {
  select: 'Войти или зарегистрироваться',
  login: 'Вход в аккаунт',
  register: 'Добро пожаловать! Давайте создадим вашу учетную запись',
  forgot: 'Восстановление пароля',
  'reset-code': 'Введите код подтверждения',
  'reset-new-password': 'Придумайте новый пароль',
};

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

  const [step, setStep] = useState('select');
  const [verificationPurpose, setVerificationPurpose] = useState('');
  const [loginInput, setLoginInput] = useState('');
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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAgreedToTerms(false);
    setSmsConsent(false);
    setSmsConsentError('');
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

  const handleRequestCode = async (event) => {
    event?.preventDefault();
    setError('');
    setDebugCode('');

    const formattedPhone = getNormalizedPhoneOrError();
    if (!formattedPhone) return;

    setIsLoading(true);
    try {
      const data = await requestCode(formattedPhone);
      setVerificationCodeStep('register', data);
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
      const errorCode = getErrorCode(err);
      if (errorCode === 'SMS_OPT_OUT') {
        setError('Вы отказались от SMS. Войдите по паролю или напишите: prizeprise@gmail.com');
        return;
      }
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

   const validateRegistrationData = () => {
     const registrationPayload = validateRegistrationPayload({
       username,
       phone,
       password,
       confirmPassword,
       pdConsent: agreedToTerms,
       smsConsent,
     });

     if (registrationPayload.error) {
       if (registrationPayload.error.includes('SMS')) {
         setSmsConsentError(registrationPayload.error);
       } else {
         setError(registrationPayload.error);
       }
       return null;
     }

     return registrationPayload.phone;
   };

   const handleRequestRegistrationCode = async (event) => {
     event.preventDefault();
     setError('');
     setSmsConsentError('');

     const formattedPhone = validateRegistrationData();
     if (!formattedPhone) return;

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

     const formattedPhone = validateRegistrationData();
     if (!formattedPhone) return;

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
       const errorCode = getErrorCode(err);
       if (errorCode === 'SMS_OPT_OUT') {
         const supportEmail = err?.data?.supportEmail || 'prizeprise@gmail.com';
         setError(`Вы отказались от SMS. Восстановление пароля невозможно. Обратитесь: ${supportEmail}`);
         return;
       }
       setError('Ошибка при отправке кода. Попробуйте еще раз.');
     } finally {
       setIsLoading(false);
     }
   };

   const handleRequestPasswordResetCode = async (event) => {
     event?.preventDefault();
     setError('');
     setDebugCode('');

     const formattedPhone = getNormalizedPhoneOrError();
     if (!formattedPhone) return;

     setIsLoading(true);
     try {
       const data = await requestPasswordReset(formattedPhone);
       setVerificationCodeStep('reset', data);
     } catch (err) {
       if (handleRateLimitError(err, 'Слишком часто. Попробуйте снова через')) return;
       const errorCode = getErrorCode(err);
       if (errorCode === 'SMS_OPT_OUT') {
         const supportEmail = err?.data?.supportEmail || 'prizeprise@gmail.com';
         setError(`Вы отказались от SMS. Восстановление пароля невозможно. Обратитесь: ${supportEmail}`);
         return;
       }
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

   const handleSwitchToLogin = () => {
     setStep('login');
     clearVerificationContext();
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

   const handleResendCode = () => {
     if (verificationPurpose === 'login') {
       handleRequestLoginCode({ preventDefault: () => {} });
     } else if (verificationPurpose === 'register') {
       handleRequestRegistrationCode({ preventDefault: () => {} });
     } else if (verificationPurpose === 'reset') {
       handleRequestPasswordResetCode({ preventDefault: () => {} });
     } else {
       handleRequestCode({ preventDefault: () => {} });
     }
   };

  const getSubtitle = () => {
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
      if (verificationPurpose === 'login') {
        return 'Введите код подтверждения, который был отправлен на ваш номер телефона для входа в систему';
      }
      if (verificationPurpose === 'reset') {
        return `Введите код, отправленный на ${formatPhoneNumber(phone)}`;
      }
      if (verificationPurpose === 'register') {
        return 'Введите код подтверждения, который был отправлен на ваш номер телефона для завершения регистрации';
      }
    }
    if (step === 'reset-new-password') {
      return 'Придумайте новый пароль';
    }
    return 'Выберите действие';
  };

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <SelectStep
            onLogin={handleSwitchToLogin}
            onRegister={handleSwitchToRegister}
          />
        );
      case 'login':
        return (
          <LoginStep
            loginInput={loginInput}
            setLoginInput={setLoginInput}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isLoading={isLoading}
            canResend={canResend}
            cooldown={cooldown}
            onLogin={handleLogin}
            onRequestLoginCode={handleRequestLoginCode}
            onSwitchToForgot={handleSwitchToForgot}
            onSwitchToRegister={handleSwitchToRegister}
          />
        );
      case 'register':
        return (
          <RegisterStep
            username={username}
            setUsername={setUsername}
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            agreedToTerms={agreedToTerms}
            setAgreedToTerms={setAgreedToTerms}
            smsConsent={smsConsent}
            setSmsConsent={setSmsConsent}
            smsConsentError={smsConsentError}
            setSmsConsentError={setSmsConsentError}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            isLoading={isLoading}
            onRequestCode={handleRequestRegistrationCode}
            onRegister={handleRegister}
            onSwitchToLogin={handleSwitchToLogin}
          />
        );
      case 'forgot':
        return (
          <ForgotStep
            phone={phone}
            setPhone={setPhone}
            isLoading={isLoading}
            onForgotPassword={handleForgotPassword}
          />
        );
      case 'reset-code':
        return (
          <ResetCodeStep
            phone={phone}
            code={code}
            setCode={setCode}
            verificationPurpose={verificationPurpose}
            cooldown={cooldown}
            canResend={canResend}
            isLoading={isLoading}
            onSubmit={handleResetCodeSubmit}
            onResend={handleResendCode}
          />
        );
      case 'reset-new-password':
        return (
          <ResetNewPasswordStep
            password={password}
            setPassword={setPassword}
            confirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            isLoading={isLoading}
            onResetPassword={handleResetPassword}
          />
        );
      default:
        return null;
    }
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
        {step !== 'select' && (
          <button
            className={styles.backButton}
            onClick={handleBack}
            type="button"
            aria-label="Назад"
          >
            <ArrowLeft size={14} />
            Назад
          </button>
        )}

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
          {getSubtitle()}
        </p>

        {error && <div className={styles.errorMessage} data-testid="auth-error">{error}</div>}
        {debugCode && (
          <div className={styles.hintMessage}>
            Тестовый код (DEBUG): <b>{debugCode}</b>
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
};

export default AuthModal;
