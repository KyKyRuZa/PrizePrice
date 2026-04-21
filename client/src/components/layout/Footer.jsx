import React from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT_LOGOS, SUPPORT_TEXT } from '../../constants/supportInfo';
import styles from './Footer.module.css';

const Footer = () => {
  const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy';
  const termsUrl = import.meta.env.VITE_TERMS_URL || '/terms';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@prizeprise.ru';

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.brandRow}>
          <div className={styles.brandName}>PrizePrice</div>
          <div className={styles.logosRow}>
            {SUPPORT_LOGOS.map((logo) => (
              <div key={logo.src} className={styles.logoCard}>
                <img className={styles.logoImage} src={logo.src} alt={logo.alt} loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.supportSection}>
          <p>{SUPPORT_TEXT}</p>
          <p style={{ marginTop: '8px' }}>
            По вопросам: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </div>

        <div className={styles.footerGrid}>
          <div className={styles.footerSection}>
            <h3>Компания</h3>
            <ul>
              <li><a href="#">О нас</a></li>
              <li><a href="#">Контакты</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3>Помощь</h3>
            <ul>
              <li><Link to={privacyPolicyUrl}>Политика конфиденциальности</Link></li>
              <li><Link to={termsUrl}>Пользовательское соглашение</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p>© 2025 PrizePrice. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
