import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNotifications } from '../context/NotificationsContext';
import { usePriceWatch } from '../context/PriceWatchContext';
import { useSearchHistory } from '../context/SearchHistoryContext';
import { INPUT_LIMITS, sanitizeTextInput } from '../utils/inputSanitizers';

const PROFILE_TABS = new Set(['favorites', 'history', 'compare', 'watch', 'notifications']);

const normalizeDisplayName = (name) =>
  sanitizeTextInput(name, {
    maxLength: INPUT_LIMITS.DISPLAY_NAME,
    stripHtml: true,
  });

export function useProfilePageState() {
  const { user, isAuthenticated, logout, setName } = useAuth();
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

  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('favorites');
  const [watchModalProduct, setWatchModalProduct] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && PROFILE_TABS.has(tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewName(user?.name || '');
  }, [user?.name]);

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
    setNewName(normalizeDisplayName(value));
  }, []);

  const handleNameUpdate = useCallback(async () => {
    const normalizedName = normalizeDisplayName(newName);

    if (!normalizedName) {
      alert('Имя не может быть пустым');
      return;
    }

    try {
      await setName(normalizedName);
      setEditingName(false);
    } catch (error) {
      console.error('Ошибка при обновлении имени:', error);
      alert('Ошибка при обновлении имени');
    }
  }, [newName, setName]);

  const startNameEditing = useCallback(() => {
    setEditingName(true);
  }, []);

  const cancelNameEditing = useCallback(() => {
    setEditingName(false);
    setNewName(user?.name || '');
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
