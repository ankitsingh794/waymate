import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(t('verifyEmail.verifying'));
  const [verified, setVerified] = useState(false);
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
        })
        .catch(() => setStatus(t('verifyEmail.error')));
    } else {
      setStatus('No verification token found.');
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
      <div className='register-title'>{status}</div>
      
      {verified && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>
            How would you like to continue using WayMate?
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
            <button 
              onClick={continueOnWeb}
              className="cta-button"
              style={{ 
                backgroundColor: '#0d6efd', 
                padding: '15px 25px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🌐 Continue on Web Browser
            </button>
            
            <button 
              onClick={continueOnMobile}
              className="cta-button"
              style={{ 
                backgroundColor: '#198754', 
                padding: '15px 25px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📱 Continue on Mobile App
            </button>
          </div>
          
          <p style={{ 
            marginTop: '20px', 
            color: '#666', 
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Choose "Mobile App" if you have the WayMate app installed on your device. 
            Otherwise, continue on the web for the full experience!
          </p>
        </div>
      )}
      
      {!verified && status.includes('error') && (
        <Link to="/login" className="cta-button" style={{ marginTop: '20px', display: 'inline-block' }}>
          Back to Login
        </Link>
      )}
    </div>
  );
}
