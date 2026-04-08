import React from 'react';
import { AlertCircle, RefreshCcw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './ErrorFallback.module.css';

const ErrorFallback = ({ error }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <AlertCircle className={styles.errorIcon} size={80} />
        
        <h1 className={styles.errorTitle}>Что-то пошло не так</h1>
        
        <p className={styles.errorMessage}>
          Извините, произошла непредвиденная ошибка. Мы уже работаем над решением проблемы.
        </p>

        {import.meta.env.DEV && error && (
          <div className={styles.errorDetails}>
            <h3 className={styles.errorDetailsTitle}>Детали ошибки (только для разработки):</h3>
            <pre className={styles.errorStack}>
              {error.toString()}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className={styles.errorActions}>
          <Button
            variant="primary"
            onClick={handleReload}
            className={styles.retryButton}
          >
            <RefreshCcw size={18} />
            Перезагрузить
          </Button>

          <Button
            variant="secondary"
            onClick={handleGoBack}
          >
            <ArrowLeft size={18} />
            Назад
          </Button>

          <Button
            variant="ghost"
            onClick={handleGoHome}
          >
            <Home size={18} />
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
