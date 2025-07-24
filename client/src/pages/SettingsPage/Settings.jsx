import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    VscPaintcan, VscBell, VscCreditCard, VscShield, VscTrash, VscChevronRight 
} from "react-icons/vsc";
import DashboardNavbar from '../../components/DashboardNavbar';
import api from '../../utils/axiosInstance';
import './Settings.css';

const ToggleSwitch = ({ label, enabled, setEnabled, disabled = false }) => (
    <div className="setting-item">
        <label className="setting-label">{label}</label>
        <button
            className={`toggle-switch ${enabled ? 'enabled' : ''}`}
            onClick={() => setEnabled(!enabled)}
            aria-pressed={enabled}
            disabled={disabled}
        >
            <span className="toggle-handle" />
        </button>
    </div>
);

export default function Settings() {
    const { t } = useTranslation(['settings', 'common']);
    const navigate = useNavigate();

    const [isNightMode, setIsNightMode] = useState(() => localStorage.getItem('nightMode') === 'true');
    const [settings, setSettings] = useState({
        notifications: {
            tripReminders: true,
            chatMessages: true,
            promotional: false,
        }
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        document.body.classList.toggle('night-mode', isNightMode);
        localStorage.setItem('nightMode', isNightMode);
    }, [isNightMode]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/users/profile');
                if (data.preferences && data.preferences.notifications) {
                    setSettings(prev => ({ ...prev, notifications: data.preferences.notifications }));
                }
            } catch (error) {
                setMessage('Could not load user settings.');
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleNotificationChange = async (key) => {
        const newNotifications = {
            ...settings.notifications,
            [key]: !settings.notifications[key]
        };
        
        setSettings({ ...settings, notifications: newNotifications });

        try {
            await api.put('/users/profile', { 
                preferences: { notifications: newNotifications } 
            });
            setMessage('Settings saved successfully!');
        } catch (error) {
            setMessage('Failed to save settings.');
            setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
            }));
        }
    };
    
    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
            localStorage.removeItem('accessToken');
            navigate('/login');
        } catch (error) {
            setMessage('Logout failed. Please try again.');
        }
    };
    
    const handleDeleteAccount = () => {
        if (window.confirm(t('settings:dangerZone.confirmDelete'))) {
            // There is no backend route for this yet.
            // When available, an API call would be made here.
            alert("This feature is not yet implemented.");
        }
    };

    if (loading) {
        return <div>Loading settings...</div>;
    }

    return (
        <div className={`settings-page ${isNightMode ? 'night-mode' : ''}`}>
            <DashboardNavbar />
            <main className="settings-content">
                <header className="settings-header">
                    <h1>{t('settings:title')}</h1>
                    <p>{t('settings:subtitle')}</p>
                    {message && <p className="settings-message">{message}</p>}
                </header>

                <div className="settings-grid">
                    <div className="settings-card">
                        <h3 className="card-title"><VscPaintcan /> {t('settings:appearance.title')}</h3>
                        <ToggleSwitch 
                            label={t('settings:appearance.nightMode')}
                            enabled={isNightMode}
                            setEnabled={setIsNightMode}
                        />
                    </div>
                    <div className="settings-card">
                        <h3 className="card-title"><VscBell /> {t('settings:notifications.title')}</h3>
                        <ToggleSwitch 
                            label={t('settings:notifications.tripReminders')}
                            enabled={settings.notifications.tripReminders}
                            setEnabled={() => handleNotificationChange('tripReminders')}
                        />
                         <ToggleSwitch 
                            label={t('settings:notifications.chatMessages')}
                            enabled={settings.notifications.chatMessages}
                            setEnabled={() => handleNotificationChange('chatMessages')}
                        />
                         <ToggleSwitch 
                            label={t('settings:notifications.promotionalOffers')}
                            enabled={settings.notifications.promotional}
                            setEnabled={() => handleNotificationChange('promotional')}
                        />
                    </div>

                    <div className="settings-card">
                        <h3 className="card-title"><VscShield /> {t('settings:account.title')}</h3>
                        <Link to="/profile" className="setting-item-link">
                            <span>{t('settings:account.editProfile')}</span>
                            <VscChevronRight />
                        </Link>
                         <Link to="/profile" className="setting-item-link">
                            <span>{t('settings:account.changePassword')}</span>
                            <VscChevronRight />
                        </Link>
                         <Link to="#" className="setting-item-link">
                            <span>{t('settings:account.privacyPolicy')}</span>
                            <VscChevronRight />
                        </Link>
                    </div>

                     <div className="settings-card">
                        <h3 className="card-title"><VscCreditCard /> {t('settings:subscription.title')}</h3>
                         <div className="subscription-info">
                            <p>{t('settings:subscription.statusText')} <strong>{t('settings:subscription.freePlan')}</strong>.</p>
                            <button className="upgrade-btn">{t('settings:subscription.upgradeButton')}</button>
                        </div>
                    </div>

                    <div className="settings-card danger-zone">
                        <h3 className="card-title"><VscTrash /> {t('settings:dangerZone.title')}</h3>
                        <div className="danger-actions">
                            <button className="danger-btn" onClick={handleLogout}>{t('settings:dangerZone.logOut')}</button>
                            <button className="danger-btn delete" onClick={handleDeleteAccount}>{t('settings:dangerZone.deleteAccount')}</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
