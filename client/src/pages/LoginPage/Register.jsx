import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';
import './Register.css';

export default function Register() {
    const { t } = useTranslation('auth');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsSuccess(false);
        setIsSubmitting(true);
        try {
            await api.post('/auth/register', {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
            });
            setIsSuccess(true);
            setMessage('Registration successful! Please check your email to verify your account. Redirecting…');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Something went wrong during registration.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{t('register.title')}</h1>
                    <p className="auth-form-subtitle">
                        Already have an account?{' '}
                        <Link to="/login">{t('register.loginLink')}</Link>
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div className="auth-field">
                            <label htmlFor="reg-name" className="auth-field-label">
                                {t('register.nameLabel')}
                            </label>
                            <input
                                id="reg-name"
                                name="name"
                                type="text"
                                className="auth-field-input"
                                placeholder="Your full name"
                                autoComplete="name"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-email" className="auth-field-label">
                                {t('register.emailLabel')}
                            </label>
                            <input
                                id="reg-email"
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
                            <label htmlFor="reg-password" className="auth-field-label">
                                {t('register.passwordLabel')}
                            </label>
                            <input
                                id="reg-password"
                                name="password"
                                type="password"
                                className="auth-field-input"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {message && (
                            <p
                                className={`auth-message ${isSuccess ? 'is-success' : 'is-error'}`}
                                role="alert"
                            >
                                {message}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={isSubmitting || isSuccess}
                        >
                            {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                            {isSubmitting ? 'Creating account…' : t('register.button')}
                        </button>
                    </div>
                </form>

                <div className="auth-form-footer">
                    <p>
                        By continuing, you agree to WayMate's terms and privacy policy.
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}
