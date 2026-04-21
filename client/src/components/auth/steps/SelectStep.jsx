import React from 'react';
import { Button } from '../../ui/Button';
import styles from '../AuthModal.module.css';

const SelectStep = ({ onLogin, onRegister }) => (
  <div className={styles.form} role="group" aria-label="Выбор действия">
    <Button data-testid="auth-select-login" type="button" variant="secondary" fullWidth onClick={onLogin}>
      Войти
    </Button>
    <Button
      data-testid="auth-select-register"
      type="button"
      variant="secondary"
      fullWidth
      onClick={onRegister}
    >
      Зарегистрироваться
    </Button>
  </div>
);

export default SelectStep;
