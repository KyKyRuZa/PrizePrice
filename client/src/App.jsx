import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AppProviders from './context/AppProviders';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { normalizeSearchQuery } from './utils/validation/inputSanitizers';
import ErrorBoundary from './components/observability/ErrorBoundary';
import './styles/global.css';

const HomeLandingPage = React.lazy(() => import('./pages/HomeLandingPage'));
const CatalogPage = React.lazy(() => import('./pages/CatalogPage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ComparePage = React.lazy(() => import('./pages/ComparePage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage'));
const TermsOfServicePage = React.lazy(() => import('./pages/legal/TermsOfServicePage'));
const SmsConsentPage = React.lazy(() => import('./pages/legal/SmsConsentPage'));

const HeaderWithRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleSearch = (query) => {
    const normalizedQuery = normalizeSearchQuery(query);
    if (normalizedQuery) {
      navigate(`/catalog?q=${encodeURIComponent(normalizedQuery)}`);
    }
  };
  const showSearch = location.pathname !== '/';
  return <Header onSearch={handleSearch} showSearch={showSearch} />;
};

const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner"></div>
    <span>Загрузка...</span>
  </div>
);

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const toggleVisibility = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);
  if (!visible) return null;
  return (
    <button className="scroll-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Прокрутить наверх" type="button">
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
               <ErrorBoundary>
                 <Routes>
                   <Route path="/" element={<HomeLandingPage />} />
                   <Route path="/catalog" element={<CatalogPage />} />
                   <Route path="/product/:id" element={<ProductPage />} />
                   <Route path="/search" element={<SearchPage />} />
                   <Route path="/profile" element={<ProfilePage />} />
                   <Route path="/compare" element={<ComparePage />} />
                   <Route path="/privacy" element={<PrivacyPolicyPage />} />
                   <Route path="/terms" element={<TermsOfServicePage />} />
                   <Route path="/sms-consent" element={<SmsConsentPage />} />
                 </Routes>
               </ErrorBoundary>
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