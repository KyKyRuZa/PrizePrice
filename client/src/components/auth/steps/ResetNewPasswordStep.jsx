import React from 'react';
import { clampInputValue, INPUT_LIMITS } from '../../../utils/validation/inputSanitizers';
import PasswordField from './PasswordField';
import { Button } from '../../ui/Button';
import styles from '../AuthModal.module.css';

const ResetNewPasswordStep = ({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  onResetPassword,
}) => (
  <form className={styles.form} onSubmit={onResetPassword}>
    <p className={styles.subtitle}>Придумайте новый пароль</p>

    <PasswordField
      label="Новый пароль"
      value={password}
      onChange={(e) => setPassword(clampInputValue(e.target.value, INPUT_LIMITS.PASSWORD))}
      required
      showValue={showPassword}
      onToggle={() => setShowPassword(!showPassword)}
    />

    <PasswordField
      label="Подтверждение нового пароля"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(clampInputValue(e.target.value, INPUT_LIMITS.PASSWORD))}
      required
      showValue={showConfirmPassword}
      onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
    />

    <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
      {isLoading ? 'Сохранение...' : 'Сохранить новый пароль'}
    </Button>
  </form>
);

export default ResetNewPasswordStep;
