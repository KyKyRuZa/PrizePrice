import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import styles from './Pagination.module.css';

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav className={styles.pagination} role="navigation" aria-label="Пагинация страниц">
      <button
        className={styles.pageButton}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="Первая страница"
        type="button"
      >
        <ChevronsLeft size={18} aria-hidden="true" />
      </button>

      <button
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Предыдущая страница"
        type="button"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      {visiblePages.map((pageNum, index) => (
        pageNum === '...' ? (
          <span key={`dots-${index}`} className={styles.dots}>...</span>
        ) : (
          <button
            key={pageNum}
            className={`${styles.pageButton} ${pageNum === currentPage ? styles.active : ''}`}
            onClick={() => onPageChange(pageNum)}
            aria-current={pageNum === currentPage ? 'page' : undefined}
            aria-label={`Страница ${pageNum}`}
            type="button"
          >
            {pageNum}
          </button>
        )
      ))}

      <button
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Следующая страница"
        type="button"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <button
        className={styles.pageButton}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Последняя страница"
        type="button"
      >
        <ChevronsRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
};

export default Pagination;
