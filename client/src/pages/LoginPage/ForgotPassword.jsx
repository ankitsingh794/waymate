import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';
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
        if (user) navigate('/dashboard', { replace: true });
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
        <AuthLayout
            headline={<>Reset your<br />password.</>}
            subline="Enter your email and we'll send a reset link."
        >
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{t('forgotPassword.title')}</h1>
                    <p className="auth-form-subtitle">
                        We'll send a reset link to your inbox.
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div className="auth-field">
                            <label htmlFor="fp-email" className="auth-field-label">
                                {t('forgotPassword.emailLabel')}
                            </label>
                            <input
                                id="fp-email"
                                type="email"
                                className="auth-field-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        {message && (
                            <p className="auth-message is-success" role="status">{message}</p>
                        )}
                        {error && (
                            <p className="auth-message is-error" role="alert">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                            {isSubmitting
                                ? t('forgotPassword.sendingText') || 'Sending…'
                                : t('forgotPassword.button')}
                        </button>
                    </div>
                </form>

                <div className="auth-form-footer">
                    <p>
                        Remembered it? <a href="/login">Back to login</a>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
