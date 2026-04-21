import React from 'react';
import styles from './ConsentCheckbox.module.css';

export default function SmsConsentCheckbox({ checked, onChange, error }) {
  const policyUrl = import.meta.env.VITE_SMS_CONSENT_POLICY_URL || '/sms-consent';

  return (
    <div className={styles.consentCheckbox}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          className={styles.checkbox}
          aria-describedby="sms-consent-policy-link"
        />
        <span className={styles.customCheckbox}></span>
        <span className={styles.text}>
          Я даю согласие на получение SMS-сообщений от PrizePrice (в том числе кодов 
          подтверждения при восстановлении пароля) в соответствии с{' '}
          <a href={policyUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Политикой конфиденциальности
          </a>
        </span>
      </label>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
