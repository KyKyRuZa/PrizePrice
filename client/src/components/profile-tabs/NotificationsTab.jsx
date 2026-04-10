import React from 'react';
import { Bell } from 'lucide-react';
import styles from './NotificationsTab.module.css';

const NotificationsTab = ({
  notifications,
  refreshNotifications,
  markNotificationRead,
  markAllNotifications,
  removeNotification,
  openExternalLink,
}) => (
  <>
    <div className={styles.sectionTopRow}>
      <div className={styles.actionGroup}>
        <button className={styles.smallBtn} onClick={() => refreshNotifications({ limit: 100, unreadOnly: false })}>
          Обновить
        </button>
        <button className={styles.smallBtn} onClick={markAllNotifications}>Прочитать все</button>
      </div>
    </div>

    {!notifications || notifications.length === 0 ? (
      <div className={styles.emptyState}>
        <Bell size={64} />
        <h3>Пока нет уведомлений</h3>
        <p>Добавьте товары в «Отслеживание цены» — и уведомления появятся здесь</p>
      </div>
    ) : (
      <div className={styles.notificationsList}>
        {notifications.map((notification) => (
          <div key={notification.id} className={styles.notificationItem} data-unread={!notification.read}>
            <div className={styles.notificationTitle}>{notification.title}</div>
            <div className={styles.notificationBody}>{notification.body}</div>
            <div className={styles.notificationFooter}>
              <span className={styles.notificationActions}>
                {!notification.read ? (
                  <button className={styles.smallBtn} onClick={() => markNotificationRead(notification.id)}>Прочитано</button>
                ) : null}
                {notification.link ? (
                  <button className={styles.smallBtn} onClick={() => openExternalLink(notification.link)}>Открыть</button>
                ) : null}
                <button className={styles.smallBtn} onClick={() => removeNotification(notification.id)}>Удалить</button>
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);

export default NotificationsTab;
