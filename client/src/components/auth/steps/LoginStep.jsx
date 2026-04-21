import React from 'react';
import { Phone } from 'lucide-react';
import { clampInputValue, INPUT_LIMITS } from '../../../utils/validation/inputSanitizers';
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
  canResend,
  cooldown,
  onLogin,
  onRequestLoginCode,
  onSwitchToForgot,
  onSwitchToRegister,
}) => {
  return (
    <form className={styles.form} onSubmit={onLogin} aria-label="Форма входа">
      <Input
        label="Логин"
        type="text"
        placeholder="Введите телефон или логин"
        icon={<Phone size={20} />}
        value={loginInput}
        maxLength={INPUT_LIMITS.LOGIN}
        onChange={(e) => setLoginInput(clampInputValue(e.target.value, INPUT_LIMITS.LOGIN))}
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
