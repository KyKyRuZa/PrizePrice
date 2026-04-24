import React, { useEffect } from 'react';
import { Phone } from 'lucide-react';
import { clampInputValue, INPUT_LIMITS } from '../../../utils/validation/inputSanitizers';
import { formatPhoneNumber, createPhoneInputHandler, normalizeToRawDigits } from '../../../utils/validation/phoneMask';
import { detectLoginInputType } from '../AuthModal.helpers';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import PasswordField from './PasswordField';
import styles from '../AuthModal.module.css';

const LoginStep = ({
  loginInput,
  setLoginInput,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  onLogin,
  onRequestLoginCode,
  onSwitchToForgot,
  onSwitchToRegister,
}) => {
  const loginInputType = detectLoginInputType(loginInput);
  const isPhone = loginInputType === 'phone';

  const handlePhoneChange = createPhoneInputHandler(loginInput, setLoginInput);

  const handleLoginChange = (e) => {
    const value = e.target.value;
    setLoginInput(value.slice(0, INPUT_LIMITS.LOGIN));
  };

  const handleChange = isPhone ? handlePhoneChange : handleLoginChange;

  useEffect(() => {
    if (isPhone) {
      const rawDigits = normalizeToRawDigits(loginInput);
      if (rawDigits !== loginInput) {
        setLoginInput(rawDigits);
      }
    }
  }, [isPhone, loginInput, setLoginInput]);

  return (
    <form className={styles.form} onSubmit={onLogin} aria-label="Форма входа">
      <Input
        label={isPhone ? 'Телефон' : 'Логин'}
        type="text"
        placeholder={isPhone ? '+7 (999) 999-99-99' : 'Введите телефон или логин'}
        icon={<Phone size={20} />}
        value={isPhone ? formatPhoneNumber(loginInput) : loginInput}
        maxLength={isPhone ? 18 : INPUT_LIMITS.LOGIN}
        inputMode={isPhone ? 'tel' : 'text'}
        autoComplete={isPhone ? 'tel' : 'username'}
        onChange={handleChange}
        required
      />

      <PasswordField
        testId="auth-login-password"
        label="Пароль"
        value={password}
        onChange={(e) => setPassword(clampInputValue(e.target.value, INPUT_LIMITS.PASSWORD))}
        showValue={showPassword}
        onToggle={() => setShowPassword(!showPassword)}
      />

      <Button data-testid="auth-login-submit" type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Вход...' : 'Войти'}
      </Button>

      <div className={styles.centeredRow}>
        <button
          className={styles.linkBtn}
          type="button"
          onClick={onRequestLoginCode}
          disabled={isLoading}
        >
          Войти по коду подтверждения
        </button>
      </div>

      <div className={styles.centeredRow}>
        <button className={styles.linkBtn} type="button" onClick={onSwitchToForgot}>
          Забыли пароль?
        </button>
      </div>

      <div className={styles.centeredRow}>
        <button
          className={styles.linkBtn}
          data-testid="auth-login-to-register"
          type="button"
          onClick={onSwitchToRegister}
        >
          Еще нет аккаунта? Зарегистрируйтесь
        </button>
      </div>
    </form>
  );
};

export default LoginStep;
