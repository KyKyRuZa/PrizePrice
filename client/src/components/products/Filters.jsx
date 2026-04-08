import React, { useState, memo } from 'react';

import {
  ALL_CATEGORY,
  createDefaultFilters,
  DEFAULT_MARKETPLACES,
  RATING_OPTIONS,
  MAX_PRICE_VALUE,
} from '../../constants/filters';
import {
  toggleMarketplaceSelection,
} from './Filters.helpers';
import styles from './Filters.module.css';
import { ChevronDown, ChevronUp, CreditCard } from 'lucide-react';

const Filters = memo(function Filters({ filters, onFilterChange, categories = [], categoryCounts = {} }) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    rating: true,
    marketplace: true,
  });

  const isPriceRangeError = Boolean(filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice));

  const toggleSection = (section) => {
    setExpandedSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  const handleCategorySelect = (category) => {
    onFilterChange({ ...filters, category });
  };

  const handlePriceChange = (type, rawValue) => {
    const processedValue = String(rawValue).replace(/[^0-9]/g, '');
    const nextFilters = { ...filters };
    
    if (type === 'min') {
      nextFilters.minPrice = processedValue;
      if (processedValue && filters.maxPrice && Number(processedValue) > Number(filters.maxPrice)) {
        nextFilters.maxPrice = '';
      }
    } else {
      nextFilters.maxPrice = processedValue;
      if (processedValue && filters.minPrice && Number(processedValue) < Number(filters.minPrice)) {
        nextFilters.minPrice = '';
      }
    }
    
    onFilterChange(nextFilters);
  };

  const handleRatingSelect = (rating) => {
    onFilterChange({ ...filters, minRating: rating });
  };

  const handleMarketplaceToggle = (marketplace) => {
    const marketplaces = toggleMarketplaceSelection(filters.marketplaces, marketplace);
    onFilterChange({ ...filters, marketplaces });
  };

  const handleResetFilters = () => {
    onFilterChange(createDefaultFilters());
  };

  const renderSectionIcon = (isExpanded) => {
    const Icon = isExpanded ? ChevronUp : ChevronDown;
    return <Icon size={20} />;
  };

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filterSection}>
        <div className={styles.sectionHeader} onClick={() => toggleSection('category')}>
          <h3 className={styles.sectionTitle}>Категории</h3>
          {renderSectionIcon(expandedSections.category)}
        </div>

        {expandedSections.category ? (
          <div className={styles.categoryList}>
            {[ALL_CATEGORY, ...categories].map((category) => {
              const isSelected = filters.category === category;
              const count = categoryCounts[category] || 0;

              return (
                <div key={category} className={styles.categoryItem} data-selected={isSelected} onClick={() => handleCategorySelect(category)}>
                  <span className={styles.categoryName} data-selected={isSelected}>{category}</span>
                  <span className={styles.categoryCount}>{count}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.filterSection}>
        <div className={styles.sectionHeader} onClick={() => toggleSection('price')}>
          <h3 className={styles.sectionTitle}>Цена, ₽</h3>
          {renderSectionIcon(expandedSections.price)}
        </div>

        {expandedSections.price ? (
          <>
            <div className={styles.priceInputs}>
              <div className={styles.priceInputContainer}>
                <CreditCard className={styles.currencyIcon} />
                <input
                  className={styles.priceInput}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="От 0"
                  value={filters.minPrice}
                  onChange={(event) => handlePriceChange('min', event.target.value)}
                  maxLength="10"
                  data-error={isPriceRangeError}
                />
              </div>
              <div className={styles.priceInputContainer}>
                <CreditCard className={styles.currencyIcon} />
                <input
                  className={styles.priceInput}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={`До ${(MAX_PRICE_VALUE / 1e9).toFixed(0)} млрд`}
                  value={filters.maxPrice}
                  onChange={(event) => handlePriceChange('max', event.target.value)}
                  maxLength="10"
                  data-error={isPriceRangeError}
                />
              </div>
            </div>
            {isPriceRangeError ? <div className={styles.errorMessage}>Минимальная цена не может быть больше максимальной</div> : null}
          </>
        ) : null}
      </div>

      <div className={styles.filterSection}>
        <div className={styles.sectionHeader} onClick={() => toggleSection('rating')}>
          <h3 className={styles.sectionTitle}>Рейтинг</h3>
          {renderSectionIcon(expandedSections.rating)}
        </div>

        {expandedSections.rating ? (
          <div className={styles.ratingOptions}>
            {RATING_OPTIONS.map((rating) => {
              const isSelected = filters.minRating === rating;

              return (
                <div key={rating} className={styles.ratingOption} data-selected={isSelected} onClick={() => handleRatingSelect(rating)}>
                  <div className={styles.ratingStars}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <span key={index + 1} className={styles.star} data-filled={index + 1 <= rating}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={styles.ratingText} data-selected={isSelected}>{rating} и выше</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.filterSection}>
        <div className={styles.sectionHeader} onClick={() => toggleSection('marketplace')}>
          <h3 className={styles.sectionTitle}>Маркетплейсы</h3>
          {renderSectionIcon(expandedSections.marketplace)}
        </div>

        {expandedSections.marketplace ? (
          <div className={styles.marketplaceOptions}>
            {DEFAULT_MARKETPLACES.map((marketplace) => {
              const isSelected = filters.marketplaces.includes(marketplace);

              return (
                <div
                  key={marketplace}
                  className={styles.marketplaceOption}
                  data-selected={isSelected}
                  onClick={() => handleMarketplaceToggle(marketplace)}
                >
                  <div className={styles.checkbox} data-checked={isSelected} />
                  <span className={styles.marketplaceName} data-selected={isSelected}>{marketplace}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <button className={styles.resetButton} onClick={handleResetFilters}>Сбросить все фильтры</button>
    </div>
  );
});

export default Filters;

