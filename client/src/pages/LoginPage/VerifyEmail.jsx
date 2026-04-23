import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';
import { useAuth } from '../../context/AuthContext';
import AuthAmbientDecor from './AuthAmbientDecor';

export default function VerifyEmail() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(t('verifyEmail.verifying'));
  const [verified, setVerified] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const { login } = useAuth();

  useEffect(() => {
    if (token) {
      api.post('/auth/verify-email', { token })
        .then((res) => {
          const { user, accessToken } = res.data.data;
          setUserInfo({ user, accessToken });
          setStatus('Email verified successfully! 🎉');
          setVerified(true);
          setHasError(false);
        })
        .catch(() => {
          setStatus(t('verifyEmail.error'));
          setHasError(true);
        });
    } else {
      setStatus('No verification token found.');
      setHasError(true);
    }
  }, [token, t]);

  const continueOnWeb = () => {
    if (userInfo) {
      login(userInfo.user, userInfo.accessToken);
      navigate('/dashboard');
    }
  };

  const continueOnMobile = () => {
    if (userInfo) {
      login(userInfo.user, userInfo.accessToken);
      // Show instructions to user
      setStatus('Please close this browser and open the WayMate mobile app to login.');
    }
  };

  return (
    <div className='register-container'>
      <AuthAmbientDecor />
      <div className='register-title'>{status}</div>
      
      {verified && (
        <div className="auth-verify-actions">
          <h3 className="auth-verify-heading">
            How would you like to continue using WayMate?
          </h3>
          
          <div className="auth-verify-buttons">
            <button 
              onClick={continueOnWeb}
              className="cta-button cta-button-web"
            >
              🌐 Continue on Web Browser
            </button>
            
            <button 
              onClick={continueOnMobile}
              className="cta-button cta-button-mobile"
            >
              📱 Continue on Mobile App
            </button>
          </div>
          
          <p className="auth-verify-note">
            Choose "Mobile App" if you have the WayMate app installed on your device. 
            Otherwise, continue on the web for the full experience!
          </p>
        </div>
      )}
      
      {!verified && hasError && (
        <Link to="/login" className="cta-button auth-back-link">
          Back to Login
        </Link>
      )}
    </div>
  );
}
