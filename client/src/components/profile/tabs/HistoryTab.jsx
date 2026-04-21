import React from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import styles from './HistoryTab.module.css';

const HistoryTab = ({
  historyCount,
  paginatedHistory,
  historyPagesCount,
  historyPage,
  goToHistoryPage,
  clearHistory,
  handleHistorySearch,
  formatHistoryDate,
  handleRemoveHistory,
}) => (
  <>
    {historyCount > 0 && (
      <div className={styles.historyToolbar}>
        <button className={styles.clearAllButton} onClick={clearHistory} title="Очистить историю">
          Очистить
        </button>
      </div>
    )}

    {paginatedHistory.length > 0 ? (
      <>
        <div className={styles.historyList}>
          {paginatedHistory.map((item) => (
            <div key={item.id} className={styles.historyItem} onClick={() => handleHistorySearch(item.query)}>
              <span className={styles.historyQuery}>{item.query}</span>
              <div className={styles.historyMetaRow}>
                <span className={styles.historyDate}>{formatHistoryDate(item)}</span>
                <button className={styles.clearButton} onClick={(e) => handleRemoveHistory(e, item.id)} title="Удалить из истории">
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {historyPagesCount > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationBtn}
              disabled={historyPage <= 1}
              onClick={() => goToHistoryPage(historyPage - 1)}
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: historyPagesCount }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`${styles.paginationPage} ${historyPage === page ? styles.paginationPageActive : ''}`}
                onClick={() => goToHistoryPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className={styles.paginationBtn}
              disabled={historyPage >= historyPagesCount}
              onClick={() => goToHistoryPage(historyPage + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </>
    ) : (
      <div className={styles.emptyState}>
        <Search size={64} />
        <h3>История поиска пуста</h3>
        <p>Начните искать товары, чтобы увидеть их здесь</p>
      </div>
    )}
  </>
);

export default HistoryTab;
