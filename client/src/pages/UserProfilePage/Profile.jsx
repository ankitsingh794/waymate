import React, { useState, useEffect } from 'react';
import { VscAccount, VscBell, VscArrowLeft, VscKey, VscSettingsGear, VscTrash } from 'react-icons/vsc';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LiaUserEditSolid } from "react-icons/lia";
import api from '../../utils/axiosInstance';
import './Profile.css';

const COLORS = {
    primary: '#edafb8',
    secondary: '#f7e1d7',
    background: '#dedbd2',
    accent: '#b0c4b1',
    text: '#4a5759',
};


const Navbar = ({ user, t }) => (
    <nav className="profile-nav" style={{ backgroundColor: COLORS.secondary }}>
        <div className="nav-content">
            <Link to="/dashboard" className="nav-brand" style={{ color: COLORS.text }}>
                <VscArrowLeft />
                <span>Waymate</span>
            </Link>
            <div className="nav-actions">
                <button className="nav-icon-button" aria-label={t('common:notifications')}><VscBell /></button>
                <img
                    src={user?.profileImage || `https://placehold.co/100x100/EDAFB8/4A5759?text=${user?.name?.charAt(0)}`}
                    alt={t('profile:userAvatarAlt')}
                    className="nav-avatar"
                     loading="lazy" decoding="async"
                />
            </div>
        </div>
    </nav>
);

const ProfileForm = ({ user, onUpdate, t }) => {
    const [name, setName] = useState(user.name);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await onUpdate({ name });
            setMessage(t('profile:alerts.profileUpdated'));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating profile.');
        }
    };

    return (
        <form className="profile-card" onSubmit={handleSubmit}>
            <h3><VscAccount /> {t('profile:publicProfile.title')}</h3>
            <div className="profile-form-content">
                <div className="avatar-section">
                    <img
                        src={user.profileImage || `https://placehold.co/100x100/EDAFB8/4A5759?text=${user.name.charAt(0)}`}
                        alt={t('profile:userAvatarAlt')}
                        className="profile-page-avatar"
                         loading="lazy" decoding="async"
                    />
                    <button type="button" className="edit-avatar-button" style={{ backgroundColor: COLORS.primary }} aria-label={t('profile:publicProfile.editAvatar')}>
                        <LiaUserEditSolid style={{ zIndex: 5 }} />
                    </button>
                </div>
                <div className="form-fields">
                    <div className="form-group">
                        <label htmlFor="fullName">{t('profile:publicProfile.fullName')}</label>
                        <input type="text" id="fullName" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">{t('profile:publicProfile.email')}</label>
                        <input type="email" id="email" value={user.email} disabled />
                    </div>
                </div>
            </div>
            <div className="card-footer">
                {message && <p className="form-message">{message}</p>}
                <button type="submit" className="save-button" style={{ backgroundColor: COLORS.primary }}>{t('common:saveChanges')}</button>
            </div>
        </form>
    );
};

const UpdatePasswordForm = ({ onUpdate, t }) => {
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (passwords.newPassword !== passwords.confirm) {
            setMessage(t('profile:alerts.passwordsNoMatch'));
            return;
        }
        try {
            await onUpdate({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
            setMessage(t('profile:alerts.passwordUpdated'));
            setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating password.');
        }
    };

    return (
        <form className="profile-card" onSubmit={handleSubmit}>
            <h3><VscKey /> {t('profile:updatePassword.title')}</h3>
            <div className="form-group">
                <label htmlFor="currentPassword">{t('profile:updatePassword.current')}</label>
                <input type="password" id="currentPassword" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="newPassword">{t('profile:updatePassword.new')}</label>
                <input type="password" id="newPassword" name="newPassword" value={passwords.newPassword} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="confirm">{t('profile:updatePassword.confirm')}</label>
                <input type="password" id="confirm" name="confirm" value={passwords.confirm} onChange={handleChange} />
            </div>
            <div className="card-footer">
                {message && <p className="form-message">{message}</p>}
                <button type="submit" className="save-button" style={{ backgroundColor: COLORS.primary }}>{t('profile:updatePassword.button')}</button>
            </div>
        </form>
    );
};

const PreferencesForm = ({ preferences, onUpdate, t, i18n }) => {
    const [prefs, setPrefs] = useState({ ...preferences });
    const [message, setMessage] = useState('');

    const languages = [
        { code: 'en', name: 'English' }, { code: 'bn', name: 'বাংলা' },
        { code: 'gu', name: 'ગુજરાતી' }, { code: 'hi', name: 'हिन्दी' },
        { code: 'kn', name: 'ಕನ್ನಡ' }, { code: 'ml', name: 'മലയാളം' },
        { code: 'mr', name: 'मराठी' }, { code: 'pa', name: 'ਪੰਜਾਬੀ' },
        { code: 'ta', name: 'தமிழ்' }, { code: 'te', name: 'తెలుగు' },
    ];

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        i18n.changeLanguage(newLang);
        setPrefs(p => ({ ...p, language: newLang }));
    };

    const handleCurrencyChange = (e) => {
        setPrefs(p => ({ ...p, currency: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await onUpdate({ preferences: prefs });
            setMessage(t('profile:alerts.preferencesSaved'));
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error saving preferences.');
        }
    };

    return (
        <form className="profile-card" onSubmit={handleSubmit}>
            <h3><VscSettingsGear /> {t('profile:preferences.title')}</h3>
            <div className="form-group">
                <label htmlFor="language">{t('profile:preferences.language')}</label>
                <select id="language" value={prefs.language} onChange={handleLanguageChange}>
                    {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label htmlFor="currency">{t('profile:preferences.currency')}</label>
                <select id="currency" value={prefs.currency} onChange={handleCurrencyChange}>
                    <option value="USD">USD - United States Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                </select>
            </div>
            <div className="card-footer">
                {message && <p className="form-message">{message}</p>}
                <button type="submit" className="save-button" style={{ backgroundColor: COLORS.primary }}>{t('common:saveChanges')}</button>
            </div>
        </form>
    );
};

const AccountActions = ({ onLogout, t }) => {
    return (
        <div className="profile-card">
            <h3><VscTrash /> {t('profile:accountActions.logoutTitle')}</h3>
            <p>{t('profile:accountActions.logoutDescription')}</p>
            <div className="card-footer">
                <button type="button" className="delete-button" onClick={onLogout}>{t('profile:accountActions.logoutButton')}</button>
            </div>
        </div>
    );
};

export default function UserProfile() {
    const { t, i18n } = useTranslation(['profile', 'common']);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const { data } = await api.get('/users/profile');
                // FIX: Access the nested user object correctly.
                setUser(data.data.user);
            } catch (err) {
                setError('Could not fetch profile. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, []);

    const handleProfileUpdate = async (updateData) => {
        const { data } = await api.put('/users/profile', updateData);
        // FIX: Access the nested user object correctly here as well.
        setUser(data.data.user);
    };

    const handlePasswordUpdate = async (passwordData) => {
        await api.put('/auth/update-password', passwordData);
        alert(t('profile:alerts.passwordUpdated'));
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            localStorage.removeItem('accessToken');
            navigate('/login');
        } catch (err) {
            setError('Logout failed. Please try again.');
        }
    };

    if (loading) return <div className="loading-screen">Loading Profile...</div>;
    if (error) return <div className="error-screen">{error}</div>;

    return (
        <div className="user-profile-page" style={{ backgroundColor: COLORS.background, color: COLORS.text }}>
            <Navbar user={user} t={t} />
            <main className="profile-content">
                {user && (
                    <div className="profile-grid">
                        <ProfileForm user={user} onUpdate={handleProfileUpdate} t={t} />
                        <PreferencesForm preferences={user.preferences} onUpdate={handleProfileUpdate} t={t} i18n={i18n} />
                        <UpdatePasswordForm onUpdate={handlePasswordUpdate} t={t} />
                        <AccountActions onLogout={handleLogout} t={t} />
                    </div>
                )}
            </main>
        </div>
    );
}
