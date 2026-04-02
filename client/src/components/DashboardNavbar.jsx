import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  VscBell,
  VscSettingsGear,
  VscAccount,
  VscSignOut,
  VscHome,
  VscRobot,
  VscMenu,
} from "react-icons/vsc";
import { useTranslation } from 'react-i18next';
import Logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import './DashboardNavbar.css';
import '../i18n.js'

export default function DashboardNavbar() {
    const { t } = useTranslation(['common', 'dashboard']);
    const { user, logout } = useAuth();

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

    const handleLogout = () => {
        logout();
    };

    if (!user) {
        return null;
    }

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: VscHome },
        { path: '/assistant', label: 'AI Assistant', icon: VscRobot },
        { path: '/households', label: 'Groups' },
        { path: '/notifications', label: 'Notifications', icon: VscBell },
    ];

    return (
        <header className="dashboard-navbar">
            <div className="navbar-content">
                <Link to="/dashboard" className="navbar-logo">
                    <img src={Logo} alt="WayMate" loading="lazy" decoding="async" />
                </Link>

                <button
                    className="navbar-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <VscMenu />
                </button>

                <nav className={`navbar-links ${mobileMenuOpen ? "is-open" : ""}`}>
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="nav-link"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {item.icon && <item.icon className="nav-icon" />}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="navbar-actions">
                    <Link to="/notifications" className="nav-icon-link" title="Notifications" aria-label="Notifications">
                        <VscBell />
                    </Link>

                    <div className="profile-menu-container" ref={profileMenuRef}>
                        <button
                            className="profile-trigger"
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            title={user.name}
                        >
                            <img
                                src={user.profileImage || `https://placehold.co/40x40/0E3B4C/FFFFFF?text=${user.name.charAt(0)}`}
                                alt={user.name}
                                loading="lazy"
                                decoding="async"
                            />
                        </button>

                        {profileMenuOpen && (
                            <div className="profile-dropdown">
                                <div className="dropdown-header">
                                    <strong>{user.name}</strong>
                                    <p>{user.email}</p>
                                </div>
                                <nav className="dropdown-nav">
                                    <Link to="/profile" className="dropdown-item">
                                        <VscAccount /> My Profile
                                    </Link>
                                    <Link to="/surveys" className="dropdown-item">
                                        📋 Survey Data
                                    </Link>
                                    <Link to="/settings" className="dropdown-item">
                                        <VscSettingsGear /> Settings
                                    </Link>
                                    <hr style={{ margin: 'var(--space-2) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
                                    <button onClick={handleLogout} className="dropdown-item logout">
                                        <VscSignOut /> Log Out
                                    </button>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}