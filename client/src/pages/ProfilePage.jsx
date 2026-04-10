import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import WatchPriceModal from '../components/watch/WatchPriceModal';
import HistoryTab from '../components/profile-tabs/HistoryTab';
import FavoritesTab from '../components/profile-tabs/FavoritesTab';
import CompareTab from '../components/profile-tabs/CompareTab';
import WatchTab from '../components/profile-tabs/WatchTab';
import NotificationsTab from '../components/profile-tabs/NotificationsTab';
import { useProfilePageState } from '../hooks/useProfilePageState';
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
    cart,
    cartCount,
    removeFromCart,
    clearCart,
    historyCount,
    clearHistory,
    watches,
    watchesCount,
    removeWatch,
    notifications,
    refreshNotifications,
    markNotificationRead,
    markAllNotifications,
    removeNotification,
    activeTab,
    setActiveTab,
    watchModalProduct,
    editingName,
    newName,
    paginatedHistory,
    historyPagesCount,
    historyPage,
    goToHistoryPage,
    handleNameInputChange,
    handleNameUpdate,
    startNameEditing,
    cancelNameEditing,
    handleHistorySearch,
    handleProductClick,
    formatHistoryDate,
    handleRemoveHistory,
    handleRemoveFavorite,
    openWatchModal,
    closeWatchModal,
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

  const tabs = [
    { key: 'history', label: 'История поиска' },
    { key: 'favorites', label: 'Избранное' },
    { key: 'compare', label: 'Сравнение' },
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

        <div className={styles.tabsContainer}>
          <div className={styles.tabsHeader}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={styles.tabButton}
                data-active={activeTab === tab.key}
                onClick={() => navigate(`/profile?tab=${tab.key}`)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'history' && (
              <HistoryTab
                historyCount={historyCount}
                paginatedHistory={paginatedHistory}
                historyPagesCount={historyPagesCount}
                historyPage={historyPage}
                goToHistoryPage={goToHistoryPage}
                clearHistory={clearHistory}
                handleHistorySearch={handleHistorySearch}
                formatHistoryDate={formatHistoryDate}
                handleRemoveHistory={handleRemoveHistory}
              />
            )}

            {activeTab === 'favorites' && (
              <FavoritesTab
                favoritesCount={favoritesCount}
                favorites={favorites}
                clearFavorites={clearFavorites}
                handleRemoveFavorite={handleRemoveFavorite}
                handleProductClick={handleProductClick}
              />
            )}

            {activeTab === 'compare' && (
              <CompareTab
                cartCount={cartCount}
                cart={cart}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
                openExternalLink={openExternalLink}
              />
            )}

            {activeTab === 'watch' && (
              <WatchTab
                watchesCount={watchesCount}
                watches={watches}
                setActiveTab={setActiveTab}
                handleProductClick={handleProductClick}
                openWatchModal={openWatchModal}
                removeWatch={removeWatch}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                notifications={notifications}
                refreshNotifications={refreshNotifications}
                markNotificationRead={markNotificationRead}
                markAllNotifications={markAllNotifications}
                removeNotification={removeNotification}
                openExternalLink={openExternalLink}
              />
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
