import React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '../../ui/Input';
import { INPUT_LIMITS } from '../../../utils/validation/inputSanitizers';
import styles from '../AuthModal.module.css';

const PasswordField = ({
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
    <button
      className={styles.togglePasswordVisibility}
      type="button"
      onClick={onToggle}
      aria-label={showValue ? 'Скрыть пароль' : 'Показать пароль'}
    >
      {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
);

export default PasswordField;
