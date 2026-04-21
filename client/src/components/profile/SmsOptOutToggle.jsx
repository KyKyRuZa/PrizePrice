import React, { useState } from 'react';
import { apiPost } from '../../utils/apiClient';
import styles from './SmsOptOutToggle.module.css';

export default function SmsOptOutToggle({ smsOptOut, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tempValue, setTempValue] = useState(smsOptOut);

  const handleChange = async (checked) => {
    if (checked) {
      setTempValue(true);
      setShowConfirm(true);
      return;
    }
    // Отключение (opt-in) — без подтверждения
    await performOptOut(false);
  };

  const performOptOut = async (shouldOptOut) => {
    setLoading(true);
    try {
      const endpoint = shouldOptOut ? '/api/me/sms-opt-out' : '/api/me/sms-opt-in';
      await apiPost(endpoint);
      if (onSuccess) onSuccess(shouldOptOut);
    } catch (error) {
      console.error('Failed to update SMS preference:', error);
      setTempValue(!shouldOptOut);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const confirmOptOut = () => {
    performOptOut(true);
  };

  const cancelOptOut = () => {
    setShowConfirm(false);
    setTempValue(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={smsOptOut}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={loading}
            className={styles.checkbox}
          />
          <span className={styles.slider}></span>
          <span className={styles.labelText}>
            Отказаться от получения SMS-сообщений (кодов для входа и восстановления пароля)
          </span>
        </label>
      </div>

      {smsOptOut && (
        <div className={styles.warningBanner}>
          <strong>Вы отказались от SMS-сообщений.</strong> 
          Для восстановления пароля напишите в поддержку:{' '}
          <a href="mailto:support@prizeprise.ru">support@prizeprise.ru</a>
        </div>
      )}

      {showConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Внимание!</h3>
            <p className={styles.modalText}>
              Если вы откажетесь от СМС, вы не сможете восстановить пароль, если 
              забудете его, потому что код восстановления приходит по СМС. 
              Пожалуйста, убедитесь, что вы помните пароль, или свяжитесь с поддержкой. 
              Вы уверены, что хотите отказаться?
            </p>
            <div className={styles.modalActions}>
              <button 
                onClick={cancelOptOut} 
                className={styles.btnSecondary}
                disabled={loading}
              >
                Отмена
              </button>
              <button 
                onClick={confirmOptOut} 
                className={styles.btnDanger}
                disabled={loading}
              >
                Да, отказаться
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
