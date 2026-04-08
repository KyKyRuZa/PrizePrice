import React from 'react';
import styles from './Input.module.css';

export const Input = ({
  label,
  error,
  helperText,
  icon,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={styles.inputWrapper}>
      {label && (
        <label className={styles.inputLabel}>
          {label}
          {required && <span style={{ color: '#ff4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      
      <div className={styles.inputContainer}>
        {icon && <span className={styles.inputIcon}>{icon}</span>}
        <input
          className={`${styles.input} ${error ? styles.inputError : ''} ${className}`}
          disabled={disabled}
          style={{ paddingLeft: icon ? '45px' : '16px' }}
          {...props}
        />
      </div>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      {helperText && !error && <div className={styles.helperText}>{helperText}</div>}
    </div>
  );
};

export default Input;
