import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import AppProviders from './context/AppProviders';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { normalizeSearchQuery } from './utils/inputSanitizers';
import './App.css';
import './styles/global.css';

// Code splitting для страниц
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ComparePage = React.lazy(() => import('./pages/ComparePage'));

// Компонент-обертка для Header с навигацией
const HeaderWithRouter = () => {
  const navigate = useNavigate();

  const handleSearch = (query) => {
    const normalizedQuery = normalizeSearchQuery(query);
    if (normalizedQuery) {
      navigate(`/?q=${encodeURIComponent(normalizedQuery)}`);
    }
  };

  return <Header onSearch={handleSearch} />;
};

// Компонент загрузки для Suspense
const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner"></div>
    <span>Загрузка...</span>
  </div>
);

// Кнопка "Наверх"
const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Показываем кнопку после 300px прокрутки
      setVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      className="scroll-to-top"
      onClick={scrollToTop}
      aria-label="Прокрутить наверх"
      type="button"
    >
      ↑
    </button>
  );
};

function App() {
  return (
    <AppProviders>
      <Router>
        <div className="app-container">
          <HeaderWithRouter />
          <main id="main-content" className="main-content" role="main" tabIndex="-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/compare" element={<ComparePage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <ScrollToTop />
        </div>
      </Router>
    </AppProviders>
  );
}

export default App;
