import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BarChart2, ShoppingCart, CheckCircle, Bell, Heart, Shield } from 'lucide-react';
import styles from './HomeLandingPage.module.css';

const HomeLandingPage = () => {
  const navigate = useNavigate();

  // SEO: обновляем document.title и meta-теги
  useEffect(() => {
    document.title = 'Сравнивайте цены на Wildberries, Ozon и Яндекс Маркете — PrizePrice';
    
    // meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'PrizePrice — сервис сравнения цен на товары. Сравнивайте предложения с Wildberries, Ozon и Яндекс Маркета, отслеживайте скидки, экономьте.');

    // canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = 'https://prizeprise.ru/';

    // Structured Data: WebSite + SearchAction
    const webSiteScript = document.createElement('script');
    webSiteScript.type = 'application/ld+json';
    webSiteScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "PrizePrice",
      "url": "https://prizeprise.ru",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://prizeprise.ru/catalog?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
    document.head.appendChild(webSiteScript);

    // Structured Data: Organization
    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "PrizePrice",
      "url": "https://prizeprise.ru",
      "description": "Сервис сравнения цен на товары с Wildberries, Ozon и Яндекс Маркета"
    });
    document.head.appendChild(orgScript);

    // Cleanup: удаляем добавленные SEO-скрипты при unmount
    return () => {
      document.head.querySelectorAll('script[data-seo="home-website"]').forEach(el => el.remove());
      document.head.querySelectorAll('script[data-seo="home-org"]').forEach(el => el.remove());
    };
  }, []);

  const handleSearch = (query) => {
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/catalog?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleGoToCatalog = () => {
    navigate('/catalog');
  };

  return (
    <div className={styles.landingContainer}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Сравнивайте цены на Wildberries, Ozon и Яндекс Маркете
          </h1>
          <p className={styles.heroSubtitle}>
            Находите лучшие предложения, отслеживайте скидки, экономьте до 50%
          </p>
          
          <div className={styles.searchBox}>
            <div className={styles.searchInputWrapper}>
              <Search className={styles.searchIcon} size={24} />
              <input
                type="search"
                placeholder="Найдите товар..."
                className={styles.searchInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e.target.value);
                  }
                }}
              />
            </div>
            <button className={styles.searchButton} onClick={() => {
              const input = document.querySelector('.searchInput');
              if (input) handleSearch(input.value);
            }}>
              Найти
            </button>
          </div>

          <button className={styles.ctaButton} onClick={handleGoToCatalog}>
            Перейти к каталогу
          </button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Как это работает</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <Search size={40} />
              </div>
              <h3>Введите название товара</h3>
              <p>Используйте поисковую строку, чтобы найти нужный товар по названию или категории</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <BarChart2 size={40} />
              </div>
              <h3>Сравните цены на всех маркетплейсах</h3>
              <p>Мы собираем предложения с Wildberries, Ozon и Яндекс Маркета в одном месте</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepIcon}>
                <ShoppingCart size={40} />
              </div>
              <h3>Перейдите по ссылке с лучшей ценой</h3>
              <p>Выбираете самое выгодное предложение и переходите прямо на сайт маркетплейса</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefits}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Почему выбирают PrizePrice</h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <CheckCircle className={styles.benefitIcon} size={32} />
              <h3>Все маркетплейсы в одном месте</h3>
              <p>Не нужно открывать десятки вкладок — всё на одной странице</p>
            </div>
            <div className={styles.benefitCard}>
              <Bell className={styles.benefitIcon} size={32} />
              <h3>Отслеживание цен и уведомления</h3>
              <p>Устанавливайте целевую цену и получайте уведомление, когда цена упадёт</p>
            </div>
            <div className={styles.benefitCard}>
              <Heart className={styles.benefitIcon} size={32} />
              <h3>Избранное и история просмотров</h3>
              <p>Сохраняйте понравившиеся товары и возвращайтесь к ним позже</p>
            </div>
            <div className={styles.benefitCard}>
              <BarChart2 className={styles.benefitIcon} size={32} />
              <h3>Сравнение предложений side-by-side</h3>
              <p>Наглядно видите разницу в ценах, скидках и условиях доставки</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeLandingPage;
