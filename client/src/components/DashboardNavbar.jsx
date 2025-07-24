import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { VscBell, VscSettingsGear, VscAccount, VscSignOut } from "react-icons/vsc";
import { useTranslation } from 'react-i18next';
import Logo from '../assets/logo.png';
import './DashboardNavbar.css';

const currentUser = {
    name: 'Alex',
    avatarUrl: 'https://placehold.co/40x40/EDAFB8/4A5759?text=A'
};

export default function DashboardNavbar() {
    const { t } = useTranslation(['common', 'dashboard', 'profile', 'settings', 'auth']);
    
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    
    const mobileMenuRef = useRef(null);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
                setMobileMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        console.log('User logged out!');
    };

    return (
        <header className="dashboard-navbar">
            <div className="navbar-content">
                <Link to="/dashboard" className="navbar-logo">
                    <img src={Logo} alt={t('common:logoAlt')} />
                </Link>

                <button
                    className="hamburger-menu"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={t('common:toggleMenu')}
                >
                    ☰
                </button>

                <div ref={mobileMenuRef} className={`navbar-links ${mobileMenuOpen ? "is-open" : ""}`}>
                    <nav className="main-nav">
                        <Link to="/dashboard" className="nav-link">{t('common:publicNav.dashboard')}</Link>
                        <Link to="/trip/1" className="nav-link">{t('common:dashboardNav.myTrips')}</Link> {/* Assuming a default trip id */}
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
                                aria-label={t('common:profileMenu.myProfile')}
                            >
                                <img src={currentUser.avatarUrl} alt={t('profile:userAvatarAlt')} />
                            </button>

                            {profileMenuOpen && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <strong>{currentUser.name}</strong>
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

                     <div className="navbar-actions-mobile">
                        <hr />
                        <Link to="/profile" className="nav-link">{t('common:profileMenu.myProfile')}</Link>
                        <button onClick={handleLogout} className="nav-link logout">{t('common:profileMenu.logout')}</button>
                    </div>
                </div>
            </div>
        </header>
    );
}
