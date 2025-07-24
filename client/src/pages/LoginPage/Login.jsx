import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './Register.css';

export default function Login() {
    const { t } = useTranslation('auth');
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('accessToken', res.data.data.accessToken);
            setMessage('✅ Logged in successfully! Redirecting...');
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Invalid credentials. Please try again.');
        }
    };

    return (
        <div className='register-container'>
            <div className='register-title'>{t('login.title')}</div>
            <form onSubmit={handleSubmit} className='register-form'>
                <h3>{t('login.emailLabel')}</h3>
                <input name="email" type="email" placeholder={t('login.emailLabel')} onChange={handleChange} required />
                <h3>{t('login.passwordLabel')}</h3>
                <input name="password" type="password" placeholder={t('login.passwordLabel')} onChange={handleChange} required />
                <button type="submit">{t('login.button')}</button>

                {message && <p className="message">{message}</p>}

                <h6>{t('login.noAccount')} <Link to="/register">{t('login.registerLink')}</Link></h6>
                <h6><Link to="/forgot-password">{t('login.forgotPasswordLink')}</Link></h6>
            </form>
        </div>
    );
}
