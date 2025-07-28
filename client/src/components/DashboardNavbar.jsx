import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { VscBell, VscSettingsGear, VscAccount, VscSignOut } from "react-icons/vsc";
import { useTranslation } from 'react-i18next';
import Logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import './DashboardNavbar.css';
import '../i18n.js'

export default function DashboardNavbar() {
    const { t } = useTranslation(['common', 'dashboard']);
    const { user, logout } = useAuth(); // 2. Get user and logout from the context

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 3. The handleLogout function now calls the logout function from the context
    const handleLogout = () => {
        logout();
    };

    // Show a loading state or nothing if the user data isn't available yet
    if (!user) {
        return null; // Or a loading skeleton navbar
    }

    return (
        <header className="dashboard-navbar">
            <div className="navbar-content">
                <Link to="/dashboard" className="navbar-logo">
                    <img src={Logo} alt={t('common:logoAlt')} loading="lazy" decoding="async" />
                </Link>

                {/* The mobile menu button can be simplified or removed depending on your mobile design */}
                <button
                    className="hamburger-menu"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={t('common:toggleMenu')}
                >
                    ☰
                </button>

                <div className={`navbar-links ${mobileMenuOpen ? "is-open" : ""}`}>
                    <nav className="main-nav">
                        <Link to="/" className="nav-link">{t('common:dashboardNav.myTrips')}</Link>
                        <Link to="/dashboard" className="nav-link">{t('common:publicNav.dashboard')}</Link>
                        <Link to="/assistant" className="nav-link">{t('common:dashboardNav.aiAssistant')}</Link>
                    </nav>

                    <div className="navbar-actions-desktop">
                        <button className="nav-icon-button" aria-label={t('common:notifications')}>
                            <VscBell />
                        </button>

                        <div className="profile-menu-container" ref={profileMenuRef}>
                            <button
                                className="profile-trigger"
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            >
                                {/* 4. Use the user's data for the avatar */}
                                <img src={user.profileImage || `https://placehold.co/40x40/EDAFB8/4A5759?text=${user.name.charAt(0)}`} alt={user.name} loading="lazy" decoding="async" />
                            </button>

                            {profileMenuOpen && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        {/* 5. Use the user's name */}
                                        <strong>{user.name}</strong>
                                        <p>{t('common:profileMenu.welcome')}</p>
                                    </div>
                                    <Link to="/profile" className="dropdown-item">
                                        <VscAccount /> {t('common:profileMenu.myProfile')}
                                    </Link>
                                    <Link to="/settings" className="dropdown-item">
                                        <VscSettingsGear /> {t('common:profileMenu.settings')}
                                    </Link>
                                    <button onClick={handleLogout} className="dropdown-item logout">
                                        <VscSignOut /> {t('common:profileMenu.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}