import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './Register.css';

export default function Register() {
    const { t } = useTranslation('auth');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsSubmitting(true);
        try {
            await api.post('/auth/register', formData);
            setMessage('✅ Registration successful! Please check your email to verify your account. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Something went wrong during registration.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-title">{t('register.title')}</div>
            <form className="register-form" onSubmit={handleSubmit}>
                <h3>{t('register.nameLabel')}</h3>
                <input
                    type="text"
                    name="name"
                    placeholder={t('register.nameLabel')}
                    onChange={handleChange}
                    required
                />
                <h3>{t('register.emailLabel')}</h3>
                <input
                    type="email"
                    name="email"
                    placeholder={t('register.emailLabel')}
                    onChange={handleChange}
                    required
                />
                <h3>{t('register.passwordLabel')}</h3>
                <input
                    type="password"
                    name="password"
                    placeholder={t('register.passwordLabel')}
                    onChange={handleChange}
                    required
                />
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : t('register.button')}
                </button>

                <h6>
                    {t('register.hasAccount')} <Link to="/login">{t('register.loginLink')}</Link>
                </h6>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
}
