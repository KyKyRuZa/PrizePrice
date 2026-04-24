import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SortOptions.module.css';

const SortOptions = ({ sortBy, onSortChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const sortOptions = [
    { id: 'popularity', label: 'По популярности' },
    { id: 'price_asc', label: 'По возрастанию цены' },
    { id: 'price_desc', label: 'По убыванию цены' },
    { id: 'rating', label: 'По рейтингу' },
    { id: 'discount', label: 'По скидке' }
  ];

  const selectedOption = sortOptions.find(opt => opt.id === sortBy) || sortOptions[0];

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.sortContainer} ref={containerRef}>
      <button
        className={styles.sortButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOption.label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.sortDropdown} role="listbox">
          {sortOptions.map(option => (
            <button
              key={option.id}
              className={`${styles.sortOption} ${option.id === sortBy ? styles.active : ''}`}
              onClick={() => {
                onSortChange(option.id);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={option.id === sortBy}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortOptions;
