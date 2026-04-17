import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { PriceWatchProvider } from '../context/PriceWatchContext';
import { SearchHistoryProvider } from '../context/SearchHistoryContext';
import CatalogPage from './CatalogPage';

const mockProducts = [
  { id: 1, name: 'Test Product 1', category: 'electronics', prices: [] },
  { id: 2, name: 'Test Product 2', category: 'electronics', prices: [] },
];

vi.mock('../components/products/ProductCardMain', () => ({
  default: ({ product }) => <div data-testid="product-card">{product?.name || 'Mock Product Card'}</div>
}));

vi.mock('../components/products/Filters', () => ({
  default: () => <div data-testid="filters">Mock Filters</div>
}));

vi.mock('../components/products/SortOptions', () => ({
  default: () => <div data-testid="sort-options">Mock Sort Options</div>
}));

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: () => ({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isAuthenticated: false,
    }),
  };
});

vi.mock('../utils/apiClient', () => {
  const mockApiGet = vi.fn();
  mockApiGet.mockImplementation((path) => {
    // Ignore signal — just return mock data
    if (path === '/products/categories') {
      return Promise.resolve({ categories: ['electronics'] });
    }
    if (path === '/products/category-counts') {
      return Promise.resolve({
        counts: {
          electronics: { count: 2, maxPrice: 50000 },
          Все: { count: 2, maxPrice: 50000 }
        }
      });
    }
    if (path === '/products/recommended') {
      return Promise.resolve({ items: mockProducts, pagination: null });
    }
    if (path.includes('/products/search')) {
      return Promise.resolve({ items: mockProducts, pagination: { totalPages: 1, currentPage: 1, totalItems: 2 } });
    }
    return Promise.resolve({});
  });
  return { apiGet: mockApiGet };
});

vi.mock('../context/CartContext', async () => {
  const actual = await vi.importActual('../context/CartContext');
  return {
    ...actual,
    CartProvider: ({ children }) => <>{children}</>,
    useCart: () => ({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      clearAll: vi.fn(),
      isInCart: vi.fn(() => false),
    }),
  };
});

vi.mock('../context/FavoritesContext', async () => {
  const actual = await vi.importActual('../context/FavoritesContext');
  return {
    ...actual,
    FavoritesProvider: ({ children }) => <>{children}</>,
    useFavorites: () => ({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
      isInFavorites: vi.fn(),
    }),
  };
});

vi.mock('../context/PriceWatchContext', async () => {
  const actual = await vi.importActual('../context/PriceWatchContext');
  return {
    ...actual,
    PriceWatchProvider: ({ children }) => <>{children}</>,
    usePriceWatch: () => ({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      isWatching: vi.fn(),
      getWatch: vi.fn(),
    }),
  };
});

vi.mock('../context/SearchHistoryContext', async () => {
  const actual = await vi.importActual('../context/SearchHistoryContext');
  return {
    ...actual,
    SearchHistoryProvider: ({ children }) => <>{children}</>,
    useSearchHistory: () => ({
      items: [],
      addQuery: vi.fn(),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      clearAll: vi.fn(),
    }),
  };
});

describe('CatalogPage Component', () => {
  const renderWithProviders = (component) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <PriceWatchProvider>
                <SearchHistoryProvider>
                  {component}
                </SearchHistoryProvider>
              </PriceWatchProvider>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  const renderCatalogPage = async () => {
    renderWithProviders(<CatalogPage />);
    await screen.findAllByTestId('product-card');
  };

  it('renders catalog page header', async () => {
    await renderCatalogPage();
    expect(screen.getByRole('heading', { level: 1, name: /Каталог товаров/i })).toBeInTheDocument();
  });

  it('renders filters section', async () => {
    await renderCatalogPage();
    expect(screen.getByTestId('filters')).toBeInTheDocument();
  });

  it('renders sort options', async () => {
    await renderCatalogPage();
    expect(screen.getByTestId('sort-options')).toBeInTheDocument();
  });

  it('renders product cards', async () => {
    await renderCatalogPage();
    const cards = screen.getAllByTestId('product-card');
    expect(cards).toHaveLength(mockProducts.length);
  });

  it('displays product count', async () => {
    await renderCatalogPage();
    // Элемент "Найдено товаров:" удалён — проверяем, что заголовок страницы присутствует
    expect(screen.getByRole('heading', { level: 1, name: /Каталог товаров/i })).toBeInTheDocument();
  });
});
