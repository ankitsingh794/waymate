import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import AuthLayout from './AuthLayout';
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
        if (!token) setError('Missing or invalid reset token.');
    }, [token]);

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match.');
        }
        if (!token) return setError('Invalid or expired reset link.');

        setIsSubmitting(true);
        try {
            await api.post('/auth/reset-password', { password: formData.password, token });
            setMessage('Password reset successful! Redirecting to login…');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Reset failed. Try again or request a new link.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            headline={<>Set a new<br />password.</>}
            subline="Choose something strong and memorable."
        >
            <div className="auth-form-card">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{t('resetPassword.title')}</h1>
                    <p className="auth-form-subtitle">
                        Your new password must be at least 8 characters.
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div className="auth-field">
                            <label htmlFor="rp-password" className="auth-field-label">
                                {t('resetPassword.newPasswordLabel')}
                            </label>
                            <input
                                id="rp-password"
                                name="password"
                                type="password"
                                className="auth-field-input"
                                placeholder="New password"
                                autoComplete="new-password"
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="rp-confirm" className="auth-field-label">
                                {t('resetPassword.confirmPasswordLabel')}
                            </label>
                            <input
                                id="rp-confirm"
                                name="confirmPassword"
                                type="password"
                                className="auth-field-input"
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                                onChange={handleChange}
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
                            disabled={isSubmitting || !token}
                        >
                            {isSubmitting && <span className="auth-submit-spinner" aria-hidden="true" />}
                            {isSubmitting
                                ? t('resetPassword.resettingText') || 'Resetting…'
                                : t('resetPassword.button')}
                        </button>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}
