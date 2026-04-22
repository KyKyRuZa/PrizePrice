import React, { useState, useMemo } from 'react';
import { Edit2, Check, X, MessageSquare } from 'lucide-react';
import { INPUT_LIMITS, sanitizeTextInput } from '../../../utils/validation/inputSanitizers';
import { apiPost } from '../../../utils/api/apiClient';
import styles from './SettingTab.module.css';

export default function SettingTab({ user, onUserUpdate }) {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [nameError, setNameError] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [showSmsConfirm, setShowSmsConfirm] = useState(false);

const initialName = useMemo(() => user?.name || '', [user?.name]);
  const smsOptOut = user?.sms_opt_out === true;
  const displayName = editName || initialName;

const handleSmsToggle = async (checked) => {
    if (checked) {
      if (smsOptOut) {
        await performSmsOpt(false);
      }
    } else {
      if (!smsOptOut) {
        setShowSmsConfirm(true);
      }
    }
  };

  const handleSmsConfirm = () => performSmsOpt(true);

  const performSmsOpt = async (shouldOptOut) => {
    setSmsLoading(true);
    try {
      const endpoint = shouldOptOut ? 'me/sms-opt-out' : 'me/sms-opt-in';
      await apiPost(endpoint);
      if (onUserUpdate) {
        onUserUpdate({ ...user, sms_opt_out: shouldOptOut });
      }
    } catch (error) {
      console.error('Failed to update SMS preference:', error);
    } finally {
      setSmsLoading(false);
      setShowSmsConfirm(false);
    }
  };

  const cancelSmsOptOut = () => setShowSmsConfirm(false);

  const handleNameInputChange = (value) => {
    const sanitized = sanitizeTextInput(value, {
      maxLength: INPUT_LIMITS.DISPLAY_NAME,
      stripHtml: true,
      trim: true,
    });
    setEditName(sanitized);
    if (sanitized.length < 2) {
      setNameError('Имя должно содержать минимум 2 символа');
    } else {
      setNameError('');
    }
  };

  const handleNameUpdate = async () => {
    const normalizedName = sanitizeTextInput(editName, {
      maxLength: INPUT_LIMITS.DISPLAY_NAME,
      stripHtml: true,
      trim: true,
    });

    if (normalizedName.length < 2) {
      setNameError('Имя должно содержать минимум 2 символа');
      return;
    }

    try {
      await apiPost('me/name', { name: normalizedName });
      if (onUserUpdate) {
        onUserUpdate({ ...user, name: normalizedName });
      }
      setEditingName(false);
      setNameError('');
    } catch (error) {
      console.error('Ошибка при обновлении имени:', error);
      setNameError('Не удалось обновить имя');
    }
  };

  const startNameEditing = () => {
    setEditName(initialName);
    setEditingName(true);
    setNameError('');
  };

  const cancelNameEditing = () => {
    setEditingName(false);
    setEditName('');
    setNameError('');
  };

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Edit2 size={18} />
          Настройки профиля
        </h3>
        <div className={styles.card}>
          {editingName ? (
            <div>
              <div className={styles.nameRow}>
                <input
                  className={`${styles.nameInput} ${nameError ? styles.error : ''}`}
                  type="text"
                  value={editName}
                  maxLength={INPUT_LIMITS.DISPLAY_NAME}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                  placeholder="Введите ваше имя"
                  autoFocus
                />
                <button className={styles.primaryActionBtn} onClick={handleNameUpdate}>
                  <Check size={16} /> Сохранить
                </button>
                <button className={styles.secondaryActionBtn} onClick={cancelNameEditing}>
                  <X size={16} /> Отмена
                </button>
              </div>
              {nameError && <div className={styles.nameError}>{nameError}</div>}
            </div>
          ) : (
            <div>
              <div className={styles.nameRow}>
                <h2 className={styles.userName}>
                  {displayName || 'Не указано'}
                </h2>
                <button className={styles.editNameBtn} onClick={startNameEditing} aria-label="Редактировать имя">
                  <Edit2 size={18} />
                </button>
              </div>
              
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <MessageSquare size={18} />
          Управление SMS-уведомлением
        </h3>
        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={!smsOptOut}
                onChange={(e) => handleSmsToggle(e.target.checked)}
                disabled={smsLoading}
                className={styles.switchInput}
              />
              <span className={styles.switchTrack}>
                <span className={styles.switchThumb}></span>
              </span>
              <span className={styles.switchLabelText}>
                {!smsOptOut ? 'Получать SMS-сообщения (коды для входа и восстановления пароля)' : 'Отключить SMS-сообщения (коды для входа и восстановления пароля)'}
              </span>
            </label>
          </div>

          {showSmsConfirm && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Внимание!</h3>
                <p className={styles.modalText}>
                  Если вы откажетесь от СМС, вы не сможете восстановить пароль, если 
                  забудете его, потому что код восстановления приходит по СМС. 
                  Пожалуйста, убедитесь, что вы помните пароль, или свяжитесь с поддержкой. 
                  Вы уверены, что хотите отказаться?
                </p>
                <div className={styles.modalActions}>
                  <button 
                    onClick={cancelSmsOptOut} 
                    className={styles.btnSecondary}
                    disabled={smsLoading}
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleSmsConfirm} 
                    className={styles.btnDanger}
                    disabled={smsLoading}
                  >
                    Да, отказаться
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}