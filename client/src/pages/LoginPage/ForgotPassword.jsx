import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './Register.css';

export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage(t('forgotPassword.successMessage'));
    } catch {
      setError(t('forgotPassword.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='register-container'>
      <div className='register-title'>{t('forgotPassword.title')}</div>
      <form onSubmit={handleSubmit} className='register-form'>
        <h3>{t('forgotPassword.emailLabel')}</h3>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('forgotPassword.emailLabel')}
          required
        />
        <button type='submit' disabled={isSubmitting}>
          {isSubmitting ? t('forgotPassword.sendingText') || 'Sending...' : t('forgotPassword.button')}
        </button>
        {message && <p className='message success'>{message}</p>}
        {error && <p className='message error'>{error}</p>}
      </form>
    </div>
  );
}
