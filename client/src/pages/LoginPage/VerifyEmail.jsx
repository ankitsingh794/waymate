import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(t('verifyEmail.verifying'));
  const { login } = useAuth();

  useEffect(() => {
    if (token) {
      api.post('/auth/verify-email', { token })
        .then((res) => {
          const { user, accessToken } = res.data.data;
          login(user, accessToken);
        })
        .catch(() => setStatus(t('verifyEmail.error')));
    } else {
      setStatus('No verification token found.');
    }
  }, [token, t]);

  return (
    <div className='register-container'>
      <div className='register-title'>{status}</div>
      {status === t('verifyEmail.success') && (
        <Link to="/login" className="cta-button">{t('verifyEmail.loginButton')}</Link>
      )}
    </div>
  );
}
