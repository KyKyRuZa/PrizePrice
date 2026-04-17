import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Edit2, Check, X, ArrowLeft } from 'lucide-react';
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
    favoritesCount,
    cartCount,
    activeTab,
    setActiveTab,
    watchModalProduct,
    editingName,
    newName,
    nameError,
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
    // tabs props
    favorites,
    clearFavorites,
    cart,
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
  } = useProfilePageState();

  // SEO: обновляем document.title и meta-теги
  useEffect(() => {
    const title = 'Профиль пользователя — PrizePrice';
    const description = 'Личный кабинет PrizePrice: история поиска, избранные товары, сравнение цен, отслеживание скидок и уведомления.';

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = 'https://prizeprise.ru/profile';

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, follow';

    return () => {
      // Очистка не требуется — теги общие
    };
  }, []);

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
  const createdAt = user.created_at || user.createdAt;
  const registrationDate = createdAt ? new Date(createdAt).toLocaleDateString('ru-RU') : '—';

  // Аватар с инициалом
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';

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
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
          type="button"
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <header className={styles.profileHeader}>
          <div className={styles.avatar} aria-hidden="true">
            {avatarInitial}
          </div>

          <div className={styles.userInfo}>
            {editingName ? (
              <div className={styles.nameRow}>
                <input
                  className={`${styles.nameInput} ${nameError ? styles.error : ''}`}
                  type="text"
                  value={newName}
                  maxLength={INPUT_LIMITS.DISPLAY_NAME}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  placeholder="Введите ваше имя"
                  autoFocus
                />
                <button className={styles.primaryActionBtn} onClick={handleNameUpdate}>
                  <Check size={16} /> Сохранить
                </button>
                <button className={styles.secondaryActionBtn} onClick={cancelNameEditing}>
                  <X size={16} /> Отмена
                </button>
                {nameError && <div className={styles.nameError}>{nameError}</div>}
              </div>
            ) : (
              <div className={styles.nameRow}>
                <h1 className={styles.userName}>{displayName}</h1>
                <button className={styles.editNameBtn} onClick={startNameEditing} aria-label="Редактировать имя">
                  <Edit2 size={18} />
                </button>
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
                onClick={() => setActiveTab(tab.key)}
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
