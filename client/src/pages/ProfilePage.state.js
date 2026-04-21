import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNotifications } from '../context/NotificationsContext';
import { usePriceWatch } from '../context/PriceWatchContext';
import { useSearchHistory } from '../context/SearchHistoryContext';
import { INPUT_LIMITS, sanitizeTextInput } from '../utils/validation/inputSanitizers';

const PROFILE_TABS = new Set(['favorites', 'history', 'compare', 'watch', 'notifications']);

export function useProfilePageState() {
  const { user, isAuthenticated, logout, setName, setUser } = useAuth();
  const { favorites, favoritesCount, removeFromFavorites, clearFavorites } = useFavorites();
  const { cart, cartCount, removeFromCart, clearCart } = useCart();
  const { history, historyCount, clear: clearHistory, remove: removeHistoryItem } = useSearchHistory();
  const { watches, watchesCount, remove: removeWatch } = usePriceWatch();
  const {
    items: notifications,
    unreadCount,
    refresh: refreshNotifications,
    markRead: markNotificationRead,
    markAll: markAllNotifications,
    remove: removeNotification,
  } = useNotifications();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = PROFILE_TABS.has(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'favorites';

  const setActiveTab = useCallback((tab) => {
    if (PROFILE_TABS.has(tab)) {
      setSearchParams({ tab }, { replace: true });
    }
  }, [setSearchParams]);

  const [watchModalProduct, setWatchModalProduct] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(() => user?.name || '');
  const [nameError, setNameError] = useState('');

  // No need for separate effect to setActiveTab from URL — handled by useState initialization
  // Back/forward navigation will re-run the component, initializing state correctly

  useEffect(() => {
    if (activeTab === 'notifications') {
      refreshNotifications({ limit: 100 }).catch(() => null);
    }
  }, [activeTab, refreshNotifications]);

  const HISTORY_PER_PAGE = 15;

  const paginatedHistory = useMemo(() => {
    const items = history || [];
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    return items.slice(start, start + HISTORY_PER_PAGE);
  }, [history, historyPage]);

  const historyPagesCount = useMemo(() => {
    const items = history || [];
    return Math.max(1, Math.ceil(items.length / HISTORY_PER_PAGE));
  }, [history]);

  const handleNameInputChange = useCallback((value) => {
    const sanitized = sanitizeTextInput(value, {
      maxLength: INPUT_LIMITS.DISPLAY_NAME,
      stripHtml: true,
      trim: true,
    });
    setNewName(sanitized);
    if (sanitized.length < 2) {
      setNameError('Имя должно содержать минимум 2 символа');
    } else {
      setNameError('');
    }
  }, []);

  const handleNameUpdate = useCallback(async () => {
    const normalizedName = sanitizeTextInput(newName, {
      maxLength: INPUT_LIMITS.DISPLAY_NAME,
      stripHtml: true,
      trim: true,
    });

    if (normalizedName.length < 2) {
      setNameError('Имя должно содержать минимум 2 символа');
      return;
    }

    try {
      await setName(normalizedName);
      setEditingName(false);
      setNameError('');
    } catch (error) {
      console.error('Ошибка при обновлении имени:', error);
      setNameError('Не удалось обновить имя');
    }
  }, [newName, setName]);

  const startNameEditing = useCallback(() => {
    setNewName(user?.name || '');
    setEditingName(true);
    setNameError('');
  }, [user?.name]);

  const cancelNameEditing = useCallback(() => {
    setEditingName(false);
    setNewName(user?.name || '');
    setNameError('');
  }, [user?.name]);

  const goToHistoryPage = useCallback((page) => {
    setHistoryPage(page);
  }, []);

  const handleHistorySearch = useCallback(
    (query) => {
      navigate(`/?q=${encodeURIComponent(query)}`);
    },
    [navigate]
  );

  const handleProductClick = useCallback((product) => {
    console.log('Товар выбран:', product?.name);
  }, []);

  const formatHistoryDate = useCallback((item) => {
    const raw = item?.created_at || item?.createdAt || item?.date;
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleString('ru-RU');
  }, []);

  const handleRemoveHistory = useCallback(
    (event, id) => {
      event.stopPropagation();
      removeHistoryItem(id);
    },
    [removeHistoryItem]
  );

  const handleRemoveFavorite = useCallback(
    (event, productId) => {
      event.stopPropagation();
      removeFromFavorites(productId);
    },
    [removeFromFavorites]
  );

  const openWatchModal = useCallback((product, watch) => {
    setWatchModalProduct({ product, watch });
  }, []);

  const closeWatchModal = useCallback(() => {
    setWatchModalProduct(null);
  }, []);

  const openExternalLink = useCallback((link) => {
    if (!link) return;
    window.open(link, '_blank');
  }, []);

  return {
    user,
    isAuthenticated,
    logout,
    setUser,
    favorites,
    favoritesCount,
    clearFavorites,
    cart,
    cartCount,
    removeFromCart,
    clearCart,
    history,
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
    editingName,
    newName,
    setNewName,
    nameError,
    setNameError,
    setEditingName,
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
  };
}
