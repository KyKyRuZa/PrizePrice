import React from 'react';
import { SUPPORT_LOGOS, SUPPORT_TEXT } from '../../constants/supportInfo';
import styles from './Footer.module.css';

const Footer = () => {
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
        </div>

        <div className={styles.footerGrid}>
          <div className={styles.footerSection}>
            <h3>Покупателям</h3>
            <ul>
              <li><a href="#">Как сделать заказ</a></li>
              <li><a href="#">Доставка</a></li>
              <li><a href="#">Оплата</a></li>
              <li><a href="#">Возврат товара</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3>Компания</h3>
            <ul>
              <li><a href="#">О нас</a></li>
              <li><a href="#">Контакты</a></li>
              <li><a href="#">Вакансии</a></li>
              <li><a href="#">Партнерство</a></li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h3>Помощь</h3>
            <ul>
              <li><a href="#">Центр поддержки</a></li>
              <li><a href="#">Политика конфиденциальности</a></li>
              <li><a href="#">Пользовательское соглашение</a></li>
              <li><a href="#">Сообщить об ошибке</a></li>
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
