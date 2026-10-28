import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';
import './Register.css';

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
                    setStatus('Email verified successfully!');
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
            setStatus('Please close this browser and open the WayMate mobile app to login.');
        }
    };

    return (
        <AuthLayout
            headline={verified
                ? <><em>Welcome</em><br />to WayMate.</>
                : <>Verifying<br />your email.</>
            }
            subline={verified
                ? 'Your account is ready. Choose how to continue.'
                : 'Just a moment while we confirm your address.'
            }
        >
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{status}</h1>
                </div>

                {verified && (
                    <div className="auth-verify-actions">
                        <p className="auth-verify-heading">
                            How would you like to continue using WayMate?
                        </p>

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
                            Otherwise, continue on the web for the full experience.
                        </p>
                    </div>
                )}

                {!verified && hasError && (
                    <div className="auth-form-footer">
                        <Link to="/login" className="auth-back-link">← Back to Login</Link>
                    </div>
                )}

                {!verified && !hasError && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                        <span className="auth-submit-spinner" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2.5px' }} aria-label="Verifying" />
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}
