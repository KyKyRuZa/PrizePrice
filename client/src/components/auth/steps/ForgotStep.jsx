import React from 'react';
import { Phone } from 'lucide-react';
import { formatPhoneNumber } from '../../../utils/validation/phoneMask';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import styles from '../AuthModal.module.css';

const ForgotStep = ({
  phone,
  setPhone,
  isLoading,
  onForgotPassword,
}) => {
  const handlePhoneChange = (event) => {
    const rawValue = event.target.value;
    const currentDisplay = formatPhoneNumber(phone);
    const isDelete = rawValue.length < currentDisplay.length;

    if (isDelete && phone.length > 0) {
      setPhone(phone.slice(0, -1));
    } else if (!isDelete) {
      const digits = rawValue.replace(/\D/g, '');
      const local = (digits.length > 0 && (digits[0] === '7' || digits[0] === '8'))
        ? digits.slice(1)
        : digits;
      setPhone(local.slice(0, 10));
    }
  };

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
