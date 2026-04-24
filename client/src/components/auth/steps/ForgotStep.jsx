import React from 'react';
import { Phone } from 'lucide-react';
import { formatPhoneNumber, createPhoneInputHandler } from '../../../utils/validation/phoneMask';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import styles from '../AuthModal.module.css';

const ForgotStep = ({
  phone,
  setPhone,
  isLoading,
  onForgotPassword,
}) => {
  const handlePhoneChange = createPhoneInputHandler(phone, setPhone);

  return (
    <form className={styles.form} onSubmit={onForgotPassword}>
      <Input
        label="Номер телефона"
        type="tel"
        placeholder="+7 (000) 000-00-00"
        icon={<Phone size={20} />}
        value={formatPhoneNumber(phone)}
        maxLength={18}
        onChange={handlePhoneChange}
        required
      />

      <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Отправка...' : 'Получить код'}
      </Button>
    </form>
  );
};

export default ForgotStep;
