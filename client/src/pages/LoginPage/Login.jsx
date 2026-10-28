import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';
import './Register.css';

export default function Login() {
    const { t } = useTranslation('auth');
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { login, user } = useAuth();

    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsSubmitting(true);
        try {
            const res = await api.post('/auth/login', formData);
            const { accessToken, user } = res.data.data;
            login(user, accessToken);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            headline={<>Welcome<br />back.</>}
            subline="Pick up where you left off."
        >
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{t('login.title')}</h1>
                    <p className="auth-form-subtitle">
                        New here?{' '}
                        <Link to="/register">{t('login.registerLink')}</Link>
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div className="auth-field">
                            <label htmlFor="login-email" className="auth-field-label">
                                {t('login.emailLabel')}
                            </label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                className="auth-field-input"
                                placeholder="you@example.com"
                                autoComplete="email"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="login-password" className="auth-field-label">
                                {t('login.passwordLabel')}
                            </label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                className="auth-field-input"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.82rem' }}>
                                {t('login.forgotPasswordLink')}
                            </Link>
                        </div>

                        {message && (
                            <p className="auth-message is-error" role="alert">{message}</p>
                        )}

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                            {isSubmitting ? 'Signing in…' : t('login.button')}
                        </button>
                    </div>
                </form>

                <div className="auth-form-footer">
                    <p>
                        {t('login.noAccount')}{' '}
                        <Link to="/register">{t('login.registerLink')}</Link>
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
