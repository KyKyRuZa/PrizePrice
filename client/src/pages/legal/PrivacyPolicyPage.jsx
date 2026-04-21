import React from 'react';
import styles from './LegalPage.module.css';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.legalPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Политика конфиденциальности</h1>
        <p className={styles.draft}>
          Дата последнего обновления: 21 апреля 2026 г. (Проект в разработке)
        </p>

        <section className={styles.section}>
          <h2>1. Какие данные мы собираем</h2>
          <ul>
            <li>Имя, номер телефона, email (при регистрации)</li>
            <li>История поиска, просмотренные товары, избранное, корзина</li>
            <li>IP-адрес, User-Agent, технические данные (cookies, localStorage)</li>
            <li>Согласия на обработку данных и получение SMS</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Как мы используем ваши данные</h2>
          <ul>
            <li>Предоставление сервиса сравнения цен</li>
            <li>Отправка кодов подтверждения по SMS</li>
            <li>Отправка уведомлений о снижении цен (если включено)</li>
            <li>Улучшение сервиса и персональные рекомендации</li>
            <li>Обеспечение безопасности (защита от мошенничества)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Кому мы передаём ваши данные</h2>
          <p>
            Мы передаём данные только маркетплейсам (Ozon, Wildberries, Яндекс.Маркет) 
            при переходе по ссылке товара. Мы не продаём и не передаём ваши данные 
            третьим лицам в иных целях.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Хранение данных</h2>
          <p>
            Данные хранятся до удаления вашего аккаунта. После удаления аккаунта 
            персональные данные удаляются в течение 30 дней. Анонимизированные данные 
            могут храниться дольше для аналитики.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Ваши права</h2>
          <p>Вы можете:</p>
          <ul>
            <li>Запросить копию ваших персональных данных</li>
            <li>Исправить неточные данные</li>
            <li>Удалить аккаунт и все связанные данные</li>
            <li>Отозвать согласия (в настройках профиля)</li>
            <li>Направить жалобу в Роскомнадзор</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Контакты</h2>
          <p>
            Email: <a href="mailto:support@prizeprise.ru">support@prizeprise.ru</a>
          </p>
        </section>

        <p className={styles.draft}>
          Примечание: данная политика является шаблонной и требует доработки 
          юридическим специалистом.
        </p>
      </div>
    </div>
  );
}
