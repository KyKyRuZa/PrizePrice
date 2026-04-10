import React, { useState, useEffect } from 'react';
import { Bell, Heart, TrendingUp, User, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useNotifications } from '../../context/NotificationsContext';
import { INPUT_LIMITS, normalizeSearchQuery } from '../../utils/inputSanitizers';
import AuthModal from '../auth/AuthModal';
import { Button } from '../ui/Button';
import styles from './Header.module.css';

const Header = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotifications();
  const { favoritesCount } = useFavorites();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  // Слушаем событие очистки поиска
  useEffect(() => {
    const handleClearSearch = () => {
      setSearchQuery('');
    };

    window.addEventListener('clear-search', handleClearSearch);
    return () => window.removeEventListener('clear-search', handleClearSearch);
  }, []);

  // Закрываем мобильное меню при изменении размера экрана
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery && onSearch) {
      onSearch(normalizedQuery);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(normalizeSearchQuery(event.target.value));
  };

  return (
    <>
      <header className={styles.headerContainer} role="banner" aria-label="Основная шапка сайта">
      <div className={styles.headerContent}>
        <div
          className={styles.logo}
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          role="button"
          tabIndex={0}
          aria-label="PrizePrice — на главную страницу"
        >
          <span className={styles.logoIcon}>PP</span>
          <span>PrizePrice</span>
        </div>

        <div className={styles.searchContainer} role="search" aria-label="Поиск товаров">
          <form onSubmit={handleSearchSubmit}>
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Найти товар..."
              value={searchQuery}
              maxLength={INPUT_LIMITS.SEARCH_QUERY}
              onChange={handleSearchChange}
              aria-label="Поиск товаров"
              aria-describedby="search-help"
            />
            <span id="search-help" className="sr-only">Введите название товара для поиска</span>
          </form>
        </div>

        <nav className={`${styles.iconsContainer} ${isMobileMenuOpen ? styles.mobileOpen : ''}`} role="navigation" aria-label="Основная навигация">
          <button
            className={styles.iconButton}
            onClick={() => navigate('/profile?tab=notifications')}
            type="button"
            aria-label={`Уведомления${unreadCount > 0 ? `: ${unreadCount} непрочитанных` : ''}`}
            aria-atomic="true"
          >
            <Bell size={24} aria-hidden="true" />
            {isAuthenticated && unreadCount > 0 && (
              <span className={styles.badge} aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          <button
            className={styles.iconButton}
            onClick={() => navigate('/profile?tab=favorites')}
            type="button"
            aria-label={`Избранное${favoritesCount > 0 ? `: ${favoritesCount} товаров` : ''}`}
            aria-atomic="true"
          >
            <Heart size={24} aria-hidden="true" />
            {isAuthenticated && favoritesCount > 0 && (
              <span className={styles.badge} aria-hidden="true">{favoritesCount}</span>
            )}
          </button>

          <button
            className={styles.iconButton}
            onClick={() => navigate('/profile?tab=compare')}
            type="button"
            aria-label={`Сравнение товаров${cartCount > 0 ? `: ${cartCount} товаров` : ''}`}
            aria-atomic="true"
          >
            <TrendingUp size={24} aria-hidden="true" />
            {cartCount > 0 && (
              <span className={styles.badge} aria-hidden="true">{cartCount}</span>
            )}
          </button>

          {isAuthenticated ? (
            <button
              className={styles.iconButton}
              onClick={() => navigate('/profile')}
              type="button"
              aria-label="Профиль пользователя"
            >
              <User size={24} aria-hidden="true" />
            </button>
          ) : (
            <Button variant="primary" onClick={handleOpenAuthModal} aria-label="Войти в аккаунт">
              Войти
            </Button>
          )}
        </nav>

        {/* Burger menu button for mobile */}
        <button
          className={styles.burgerButton}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu} role="menu" aria-label="Мобильное меню">
          <div className={styles.mobileMenuSearch}>
            <form onSubmit={handleSearchSubmit}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Найти товар..."
                value={searchQuery}
                maxLength={INPUT_LIMITS.SEARCH_QUERY}
                onChange={handleSearchChange}
                aria-label="Поиск товаров (мобильное меню)"
              />
            </form>
          </div>

          <div className={styles.mobileMenuActions}>
            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                navigate('/profile?tab=notifications');
                setIsMobileMenuOpen(false);
              }}
              type="button"
            >
              <Bell size={20} />
              <span>Уведомления</span>
              {isAuthenticated && unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                navigate('/profile?tab=favorites');
                setIsMobileMenuOpen(false);
              }}
              type="button"
            >
              <Heart size={20} />
              <span>Избранное</span>
              {isAuthenticated && favoritesCount > 0 && (
                <span className={styles.badge}>{favoritesCount}</span>
              )}
            </button>

            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                navigate('/profile?tab=compare');
                setIsMobileMenuOpen(false);
              }}
              type="button"
            >
              <TrendingUp size={20} />
              <span>Сравнение</span>
              {cartCount > 0 && (
                <span className={styles.badge}>{cartCount}</span>
              )}
            </button>

            {isAuthenticated ? (
              <button
                className={styles.mobileMenuItem}
                onClick={() => {
                  navigate('/profile');
                  setIsMobileMenuOpen(false);
                }}
                type="button"
              >
                <User size={20} />
                <span>Профиль</span>
              </button>
            ) : (
              <Button
                variant="primary"
                className={styles.mobileLoginButton}
                onClick={handleOpenAuthModal}
              >
                Войти
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
      {showAuthModal && <AuthModal onClose={handleCloseAuthModal} />}
    </>
  );
}

export default Header;
