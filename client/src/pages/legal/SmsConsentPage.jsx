import React from 'react';
import styles from './LegalPage.module.css';

export default function SmsConsentPage() {
  return (
    <div className={styles.legalPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Согласие на получение SMS-сообщений</h1>

        <section className={styles.section}>
          <h2>1. Что такое SMS-согласие?</h2>
          <p>
            Давая это согласие, вы разрешаете нам отправлять вам SMS-сообщения, 
            которые могут включать:
          </p>
          <ul>
            <li>Коды подтверждения при входе в аккаунт</li>
            <li>Коды для восстановления пароля</li>
            <li>Уведомления о снижении цен (если вы включили отслеживание)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Как отозвать согласие?</h2>
          <p>
            Вы можете в любой момент отказаться от SMS-сообщений в настройках профиля. 
            После отказа SMS больше не будут отправляться.
          </p>
          <p>
            <strong>Важно:</strong> если вы откажетесь от SMS, вы не сможете 
            восстановить пароль через SMS. Для восстановления необходимо обратиться 
            в поддержку.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Безопасность</h2>
          <p>
            Коды подтверждения предназначены только для вас. Не передавайте их 
            третьим лицам. Никогда не просим сообщать код в телефонном разговоре 
            или по Email.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Контакты</h2>
          <p>
            По вопросам SMS-сообщений: <a href="mailto:support@prizeprise.ru">support@prizeprise.ru</a>
          </p>
        </section>
      </div>
    </div>
  );
}
