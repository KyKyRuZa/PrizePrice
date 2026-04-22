import React, { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './NotificationsTab.module.css';

const ITEMS_PER_PAGE = 5;

const NotificationsTab = ({
  notifications,
  refreshNotifications,
  markNotificationRead,
  markAllNotifications,
  removeNotification,
  openExternalLink,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil((notifications?.length || 0) / ITEMS_PER_PAGE);
  const paginatedNotifications = notifications?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || [];

  return (
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
      <>
        <div className={styles.notificationsList}>
          {paginatedNotifications.map((notification) => (
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

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className={styles.pageInfo}>
              {currentPage} / {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </>
    )}
  </>
  );
};

export default NotificationsTab;