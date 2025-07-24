import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';

export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage(t('forgotPassword.successMessage'));
    } catch {
      setError(t('forgotPassword.errorMessage'));
    }
  };

  return (
    <div className='register-container'>
      <div className='register-title'>{t('forgotPassword.title')}</div>
      <form onSubmit={handleSubmit} className='register-form'>
        <h3>{t('forgotPassword.emailLabel')}</h3>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder={t('forgotPassword.emailLabel')} 
          required 
        />
        <button type="submit">{t('forgotPassword.button')}</button>
        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </form>
    </div>
  );
}
