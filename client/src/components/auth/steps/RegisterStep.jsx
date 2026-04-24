import React from 'react';
import { Phone } from 'lucide-react';
import { INPUT_LIMITS, clampInputValue, sanitizeTextInput } from '../../../utils/validation/inputSanitizers';
import { formatPhoneNumber } from '../../../utils/validation/phoneMask';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import PasswordField from './PasswordField';
import styles from '../AuthModal.module.css';

const RegisterStep = ({
  username,
  setUsername,
  phone,
  setPhone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  agreedToTerms,
  setAgreedToTerms,
  smsConsent,
  setSmsConsent,
  smsConsentError,
  setSmsConsentError,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  onRequestCode,
  onRegister,
  onSwitchToLogin,
}) => {
  const handlePhoneChange = (event) => {
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
  };

  return (
    <form className={styles.form} onSubmit={onRequestCode}>
      <Input
        data-testid="auth-register-username"
        label="Логин"
        type="text"
        placeholder="Введите логин"
        value={username}
        maxLength={INPUT_LIMITS.USERNAME}
        onChange={(e) => setUsername(sanitizeTextInput(e.target.value, { maxLength: INPUT_LIMITS.USERNAME, stripHtml: true }))}
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
        onChange={handlePhoneChange}
        required
      />

      <PasswordField
        testId="auth-register-password"
        label="Пароль"
        value={password}
        onChange={(e) => setPassword(clampInputValue(e.target.value, INPUT_LIMITS.PASSWORD))}
        required
        showValue={showPassword}
        onToggle={() => setShowPassword(!showPassword)}
      />

      <PasswordField
        testId="auth-register-confirm-password"
        label="Подтверждение пароля"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(clampInputValue(e.target.value, INPUT_LIMITS.PASSWORD))}
        required
        showValue={showConfirmPassword}
        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      <div className={styles.checkboxContainer}>
        <label className={styles.label}>
          <input
            type="checkbox"
            data-testid="terms-agreement-checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className={styles.checkbox}
          />
          <span className={styles.customCheckbox}></span>
          <span className={styles.text}>
            Нажимая на кнопку, я соглашаюсь с{' '} 
            <a
              href={'/terms'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              пользовательским соглашением
            </a>
            {' '} 
            и {' '}
            <a
              href={'/privacy'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              политикой конфиденциальности
            </a>
          </span>
        </label>
      </div>

      <div className={styles.checkboxContainer}>
        <label className={styles.label}>
          <input
            type="checkbox"
            data-testid="sms-consent-checkbox"
            checked={smsConsent}
            onChange={(e) => {
              setSmsConsent(e.target.checked);
              setSmsConsentError('');
            }}
            required
            className={styles.checkbox}
            aria-describedby="sms-consent-policy-link"
          />
          <span className={styles.customCheckbox}></span>
          <span className={styles.text}>
            Я даю согласие на получение SMS-сообщений от PrizePrice в соответствии с{' '}
            <a
              href={'/privacy'}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              политикой конфиденциальности
            </a>
          </span>
        </label>
        {smsConsentError && <span className={styles.checkboxError}>{smsConsentError}</span>}
      </div>

      <Button data-testid="auth-register-request-code" type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Отправка кода...' : 'Получить код подтверждения'}
      </Button>

      <div className={styles.centeredRow}>
        <button className={styles.linkBtn} type="button" onClick={onRegister}>
          Зарегистрироваться без подтверждения
        </button>
      </div>

      <div className={styles.centeredRow}>
        <button
          className={styles.linkBtn}
          data-testid="auth-register-to-login"
          type="button"
          onClick={onSwitchToLogin}
        >
          Уже есть аккаунт? Войдите
        </button>
      </div>
    </form>
  );
};

export default RegisterStep;
