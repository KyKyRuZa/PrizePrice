import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SortOptions.module.css';

const SortOptions = ({ sortBy, onSortChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const sortOptions = [
    { id: 'popularity', label: 'По популярности' },
    { id: 'price_asc', label: 'По возрастанию цены' },
    { id: 'price_desc', label: 'По убыванию цены' },
    { id: 'rating', label: 'По рейтингу' },
    { id: 'discount', label: 'По скидке' }
  ];

  const selectedOption = sortOptions.find(opt => opt.id === sortBy) || sortOptions[0];

  return (
    <div className={styles.sortContainer}>
      <button className={styles.sortButton} onClick={() => setIsOpen(!isOpen)}>
        {selectedOption.label}
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className={styles.sortDropdown}>
          {sortOptions.map(option => (
            <button
              key={option.id}
              className={`${styles.sortOption} ${option.id === sortBy ? styles.active : ''}`}
              onClick={() => {
                onSortChange(option.id);
                setIsOpen(false);
              }}
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
