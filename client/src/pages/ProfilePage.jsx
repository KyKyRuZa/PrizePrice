import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, History, LogOut, Search, TrendingUp, User, X } from 'lucide-react';
import ProductCardMain from '../components/products/ProductCardMain';
import WatchPriceModal from '../components/watch/WatchPriceModal';
import { useProfilePageState } from '../hooks/useProfilePageState';
import { theme } from '../styles/theme';
import { INPUT_LIMITS } from '../utils/inputSanitizers';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    logout,
    favorites,
    favoritesCount,
    clearFavorites,
    cartCount,
    historyCount,
    clearHistory,
    watches,
    watchesCount,
    removeWatch,
    notifications,
    unreadCount,
    refreshNotifications,
    markNotificationRead,
    markAllNotifications,
    removeNotification,
    activeTab,
    setActiveTab,
    watchModalProduct,
    searchTerm,
    editingName,
    newName,
    filteredHistory,
    handleNameInputChange,
    handleNameUpdate,
    startNameEditing,
    cancelNameEditing,
    clearSearchTerm,
    handleSearchTermChange,
    handleHistorySearch,
    handleProductClick,
    formatHistoryDate,
    handleRemoveHistory,
    handleRemoveFavorite,
    openWatchModal,
    closeWatchModal,
    goToCompare,
    openExternalLink,
  } = useProfilePageState();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <User size={64} />
            <h3>Вы не авторизованы</h3>
            <p>Войдите, чтобы увидеть свой профиль</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.name ? user.name : (user.phone ? user.phone : 'Пользователь');
  // eslint-disable-next-line react-hooks/purity
  const registrationDate = new Date(user.created_at || user.createdAt || Date.now()).toLocaleDateString('ru-RU');

  const stats = [
    {
      key: 'history',
      title: 'История поиска',
      value: historyCount,
      icon: <History />,
      color: theme.colors.primary,
      onClick: () => setActiveTab('history'),
    },
    {
      key: 'favorites',
      title: 'Избранное',
      value: favoritesCount,
      icon: <Heart />,
      color: '#00a650',
      onClick: () => setActiveTab('favorites'),
    },
    {
      key: 'compare',
      title: 'Сравнение',
      value: cartCount,
      icon: <TrendingUp />,
      color: theme.colors.secondary,
      onClick: goToCompare,
    },
    {
      key: 'watch',
      title: 'Отслеживание',
      value: watchesCount,
      icon: <Bell />,
      color: theme.colors.primary,
      onClick: () => setActiveTab('watch'),
    },
    {
      key: 'notifications',
      title: 'Уведомления',
      value: unreadCount,
      icon: <Bell />,
      color: '#00a650',
      onClick: () => setActiveTab('notifications'),
    },
  ];

  const tabs = [
    { key: 'history', label: 'История поиска' },
    { key: 'favorites', label: 'Избранное' },
    { key: 'watch', label: 'Отслеживание' },
    { key: 'notifications', label: 'Уведомления' },
  ];

  return (
    <div className={styles.profileContainer}>
      <div className={styles.content}>
        <header className={styles.profileHeader}>
          <div className={styles.avatar}>
            <User size={48} />
          </div>
          <div className={styles.userInfo}>
            {editingName ? (
              <div className={styles.nameRow}>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={newName}
                  maxLength={INPUT_LIMITS.DISPLAY_NAME}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  placeholder="Введите ваше имя"
                />
                <button className={styles.primaryActionBtn} onClick={handleNameUpdate}>Сохранить</button>
                <button className={styles.secondaryActionBtn} onClick={cancelNameEditing}>Отмена</button>
              </div>
            ) : (
              <div className={styles.nameRow}>
                <h1 className={styles.userName}>{displayName}</h1>
                <button className={styles.editNameBtn} onClick={startNameEditing}>✏️</button>
              </div>
            )}
            <div className={styles.userDetails}>
              {user.phone && <div>Телефон: {user.phone}</div>}
              {user.email && <div>Email: {user.email}</div>}
              <div>Дата регистрации: {registrationDate}</div>
            </div>
          </div>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            Выйти
          </button>
        </header>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.key} className={styles.statCard} onClick={stat.onClick}>
              <div className={styles.statIcon} style={{ color: stat.color }}>{stat.icon}</div>
              <div className={styles.statContent}>
                <h3 className={styles.statTitle}>{stat.title}</h3>
                <div className={styles.statValue}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.tabsContainer}>
          <div className={styles.tabsHeader}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={styles.tabButton}
                data-active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'history' && (
              <>
                <div className={styles.historySearch}>
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Поиск в истории..."
                    value={searchTerm}
                    maxLength={INPUT_LIMITS.SEARCH_QUERY}
                    onChange={(e) => handleSearchTermChange(e.target.value)}
                  />
                  {searchTerm ? (
                    <button className={styles.clearButton} onClick={clearSearchTerm}>
                      <X size={20} />
                    </button>
                  ) : null}
                  <Search size={20} color={theme.colors.gray} />
                  {historyCount > 0 ? (
                    <button className={styles.clearAllButton} onClick={clearHistory} title="Очистить историю">
                      Очистить
                    </button>
                  ) : null}
                </div>

                {filteredHistory.length > 0 ? (
                  <div className={styles.historyList}>
                    {filteredHistory.map((item) => (
                      <div key={item.id} className={styles.historyItem} onClick={() => handleHistorySearch(item.query)}>
                        <span className={styles.historyQuery}>{item.query}</span>
                        <div className={styles.historyMetaRow}>
                          <span className={styles.historyDate}>{formatHistoryDate(item)}</span>
                          <button className={styles.clearButton} onClick={(e) => handleRemoveHistory(e, item.id)} title="Удалить из истории">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <Search size={64} />
                    <h3>История поиска пуста</h3>
                    <p>Начните искать товары, чтобы увидеть их здесь</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'favorites' &&
              (favoritesCount > 0 ? (
                <>
                  <div className={styles.endAlignedRow}>
                    <button className={styles.clearAllButton} onClick={clearFavorites} title="Очистить избранное">
                      Очистить избранное
                    </button>
                  </div>
                  <div className={styles.favoritesGrid}>
                    {favorites.map((product) => (
                      <div key={product.id} className={styles.relativeCard}>
                        <button
                          className={styles.removeFavoriteButton}
                          onClick={(e) => handleRemoveFavorite(e, product.id)}
                          title="Удалить из избранного"
                        >
                          <X size={18} />
                        </button>
                        <ProductCardMain product={product} onClick={handleProductClick} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <Heart size={64} />
                  <h3>Избранное пусто</h3>
                  <p>Добавляйте товары в избранное, чтобы видеть их здесь</p>
                </div>
              ))}

            {activeTab === 'watch' &&
              (watchesCount > 0 ? (
                <>
                  <div className={styles.sectionTopRow}>
                    <h3 className={styles.sectionHeading}>Отслеживание цены</h3>
                    <div className={styles.actionGroup}>
                      <button className={styles.smallBtn} onClick={() => setActiveTab('notifications')}>Уведомления</button>
                    </div>
                  </div>

                  <div className={styles.favoritesGrid}>
                    {watches.map((it) => {
                      const product = it?.product;
                      const watch = it?.watch;
                      if (!product?.id) return null;

                      return (
                        <div key={product.id} className={styles.relativeCard}>
                          <ProductCardMain product={product} onClick={handleProductClick} />
                          <div className={styles.watchMeta}>
                            {watch?.targetPrice != null ? (
                              <span className={styles.metaBadge}>Цель: {Number(watch.targetPrice)}₽</span>
                            ) : null}
                            {watch?.dropPercent != null ? (
                              <span className={styles.metaBadge}>Падение: {Number(watch.dropPercent)}%</span>
                            ) : null}
                            <span className={styles.metaBadge}>{watch?.active ? 'Активно' : 'Пауза'}</span>
                            <span className={styles.watchActions}>
                              <button className={styles.smallBtn} onClick={() => openWatchModal(product, watch)}>Настроить</button>
                              <button className={styles.smallBtn} onClick={() => removeWatch(product.id)}>Удалить</button>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <Bell size={64} />
                  <h3>Отслеживание не настроено</h3>
                  <p>Нажмите «Следить» на карточке товара — и вы увидите подписки здесь</p>
                </div>
              ))}

            {activeTab === 'notifications' && (
              <>
                <div className={styles.sectionTopRow}>
                  <h3 className={styles.sectionHeading}>Уведомления</h3>
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
            )}
          </div>
        </div>
      </div>

      {watchModalProduct ? (
        <WatchPriceModal
          product={watchModalProduct.product}
          initialWatch={watchModalProduct.watch}
          onClose={closeWatchModal}
        />
      ) : null}
    </div>
  );
};

export default ProfilePage;
