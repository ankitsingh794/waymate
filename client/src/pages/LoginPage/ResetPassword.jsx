import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';

export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams(); 
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing or invalid reset token.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (!token) {
      return setError('Invalid or expired reset link.');
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        password: formData.password,
        token
      });
      setMessage('✅ Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Try again or request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-title">{t('resetPassword.title')}</div>
      <form className="register-form" onSubmit={handleSubmit}>
        <h3>{t('resetPassword.newPasswordLabel')}</h3>
        <input
          type="password"
          name="password"
          placeholder={t('resetPassword.newPasswordLabel')}
          onChange={handleChange}
          required
        />

        <h3>{t('resetPassword.confirmPasswordLabel')}</h3>
        <input
          type="password"
          name="confirmPassword"
          placeholder={t('resetPassword.confirmPasswordLabel')}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t('resetPassword.resettingText') || 'Resetting...'
            : t('resetPassword.button')}
        </button>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </form>
    </div>
  );
}
