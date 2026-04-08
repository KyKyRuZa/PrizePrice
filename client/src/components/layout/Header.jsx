import React, { useState, useEffect } from 'react';
import { Bell, Heart, TrendingUp, User } from 'lucide-react';
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

        <nav className={styles.iconsContainer} role="navigation" aria-label="Основная навигация">
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
            onClick={() => navigate('/compare')} 
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
      </div>
    </header>
      {showAuthModal && <AuthModal onClose={handleCloseAuthModal} />}
    </>
  );
}

export default Header;
