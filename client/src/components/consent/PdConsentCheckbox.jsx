import React from 'react';
import styles from './ConsentCheckbox.module.css';

export default function PdConsentCheckbox({ checked, onChange, error }) {
  const policyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy';

  return (
    <div className={styles.consentCheckbox}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          className={styles.checkbox}
          aria-describedby="privacy-policy-link"
        />
        <span className={styles.customCheckbox}></span>
        <span className={styles.text}>
          Я даю согласие на обработку моих персональных данных (имя, телефон, email, 
          история поиска, избранное и др.) в соответствии с{' '}
          <a href={policyUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Политикой конфиденциальности
          </a>
        </span>
      </label>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
