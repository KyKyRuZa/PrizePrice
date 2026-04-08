import React, { useMemo, useState } from 'react';
import { Bell, Info, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { usePriceWatch } from '../../context/PriceWatchContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  formatWatchPrice,
  getBestWatchPrice,
  hasAnyWatchRule,
  normalizeWatchNumericInput,
  toNullableNumber,
} from './WatchPriceModal.helpers';
import styles from './WatchPriceModal.module.css';

const WatchPriceModal = ({ product, initialWatch, onClose }) => {
  const { isAuthenticated } = useAuth();
  const { upsert, remove } = usePriceWatch();

  const bestPrice = useMemo(() => getBestWatchPrice(product), [product]);

  const [targetPrice, setTargetPrice] = useState(initialWatch?.targetPrice ?? '');
  const [dropPercent, setDropPercent] = useState(initialWatch?.dropPercent ?? '');
  const [active, setActive] = useState(initialWatch?.active ?? true);

  const hasAnyRule = hasAnyWatchRule(targetPrice, dropPercent);

  const handleSave = async () => {
    await upsert(product, {
      targetPrice: toNullableNumber(targetPrice),
      dropPercent: toNullableNumber(dropPercent),
      active,
    });
    onClose();
  };

  const handleRemove = async () => {
    await remove(product?.id);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          <X size={22} />
        </button>

        <h2 className={styles.title}>
          <span className={styles.titleIcon}>
            <Bell size={18} />
          </span>
          Отслеживание цены
        </h2>

        <div className={styles.subtitle}>
          Укажите условия. Мы будем проверять лучшую цену и показывать уведомления внутри приложения.
        </div>

        <div className={styles.productName}>{product?.name || 'Товар'}</div>

        {bestPrice != null ? (
          <div className={styles.bestPriceSubtitle}>
            Текущая лучшая цена: <b>{formatWatchPrice(bestPrice)}</b>
          </div>
        ) : null}

        <div className={styles.row}>
          <Input
            label="Целевая цена (₽)"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Напр. 9990"
            value={targetPrice}
            onChange={(event) => setTargetPrice(normalizeWatchNumericInput(event.target.value, 9))}
          />
          <Input
            label="Снижение, %"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Напр. 15"
            value={dropPercent}
            onChange={(event) => setDropPercent(normalizeWatchNumericInput(event.target.value, 2))}
          />
        </div>

        <label className={styles.toggle}>
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Активно
        </label>

        {!isAuthenticated ? (
          <div className={styles.hint}>
            <Info size={18} />
            <div>
              Вы не авторизованы. Настройка сохранится на этом устройстве, а для уведомлений после проверки цен войдите в аккаунт.
            </div>
          </div>
        ) : null}

        <div className={styles.actions}>
          {initialWatch ? (
            <Button variant="secondary" onClick={handleRemove}>
              Удалить
            </Button>
          ) : null}
          <Button variant="primary" disabled={!hasAnyRule} onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WatchPriceModal;

