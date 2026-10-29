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
                    const { user, accessToken, refreshToken } = res.data.data;
                    setUserInfo({ user, accessToken, refreshToken });
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
            login(userInfo.user, userInfo.accessToken, '/dashboard', userInfo.refreshToken);
        }
    };

    const continueOnMobile = () => {
        if (userInfo) {
            login(userInfo.user, userInfo.accessToken, '/dashboard', userInfo.refreshToken);
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
                ? 'Your email has been confirmed. You are ready to explore.'
                : 'Confirming your credentials with the server…'
            }
        >
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{t('verifyEmail.title')}</h1>
                    <p className={`auth-message ${hasError ? 'is-error' : verified ? 'is-success' : ''}`}>
                        {status}
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {verified && (
                        <>
                            <button
                                type="button"
                                className="auth-submit-btn"
                                onClick={continueOnWeb}
                            >
                                Continue to Dashboard
                            </button>
                            <button
                                type="button"
                                className="auth-submit-btn"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--auth-border, rgba(255,255,255,0.15))',
                                    color: 'var(--auth-text-subtle, #a0a0a0)'
                                }}
                                onClick={continueOnMobile}
                            >
                                Open Mobile App
                            </button>
                        </>
                    )}

                    {hasError && (
                        <Link
                            to="/login"
                            className="auth-submit-btn"
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            Return to Sign In
                        </Link>
                    )}
                </div>

                <div className="auth-form-footer">
                    <p>
                        Need assistance?{' '}
                        <a href="mailto:support@waymate.com">Contact Support</a>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
