import React from 'react';
import { Lock } from 'lucide-react';
import { INPUT_LIMITS } from '../../../utils/validation/inputSanitizers';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import styles from '../AuthModal.module.css';

const ResetCodeStep = ({
  phone,
  code,
  setCode,
  verificationPurpose,
  cooldown,
  canResend,
  isLoading,
  onSubmit,
  onResend,
}) => {
  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <Input
        label="Код из SMS"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="123456"
        icon={<Lock size={20} />}
        value={code}
        maxLength={INPUT_LIMITS.OTP_CODE}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, INPUT_LIMITS.OTP_CODE))}
        required
      />

      <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Проверка...' : 'Далее'}
      </Button>

      <div className={styles.centeredRow}>
        <button
          className={styles.linkBtn}
          type="button"
          onClick={onResend}
          disabled={!canResend || isLoading}
          style={{ opacity: canResend ? 1 : 0.6, pointerEvents: canResend ? 'auto' : 'none' }}
        >
          {canResend ? 'Отправить код снова' : `Повторить через ${cooldown} сек`}
        </button>
      </div>
    </form>
  );
};

export default ResetCodeStep;
