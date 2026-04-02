import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  VscAccount,
  VscBell,
  VscGraph,
  VscHome,
  VscMenu,
  VscRobot,
  VscSettingsGear,
  VscSignOut,
} from 'react-icons/vsc';
import Logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosInstance';
import './DashboardNavbar.css';

function buildAvatarFallback(name) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'W';
  return `https://placehold.co/80x80/0E3B4C/FFFFFF?text=${initial}`;
}

export default function DashboardNavbar() {
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navRootRef = useRef(null);

  const navItems = useMemo(
    () => [
      { path: '/dashboard', label: 'Dashboard', icon: VscHome },
      { path: '/assistant', label: 'AI Assistant', icon: VscRobot },
      { path: '/households', label: 'Groups', icon: VscAccount },
      { path: '/notifications', label: 'Notifications', icon: VscBell },
    ],
    []
  );

  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications?limit=20');
      const list = response?.data?.data?.notifications || [];
      setUnreadCount(list.filter((item) => !item.read).length);
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!navRootRef.current || navRootRef.current.contains(event.target)) return;
      setMenuOpen(false);
      setProfileOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (!user) {
    return null;
  }

  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const avatarUrl = user.profileImage || buildAvatarFallback(user.name);

  return (
    <header className="db-nav">
      <div className="db-nav-shell" ref={navRootRef}>
        <Link to="/dashboard" className="db-nav-logo" onClick={closeMenus}>
          <img src={Logo} alt="WayMate" loading="lazy" decoding="async" />
        </Link>

        <button
          type="button"
          className={`db-nav-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="db-nav-links"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <VscMenu />
        </button>

        <nav id="db-nav-links" className={`db-nav-links ${menuOpen ? 'is-open' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMenus}
                className={({ isActive }) => `db-nav-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon />
                <span>{item.label}</span>
                {item.path === '/notifications' && unreadCount > 0 && (
                  <strong className="db-nav-pill">{unreadCount > 9 ? '9+' : unreadCount}</strong>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="db-nav-actions">
          <Link to="/notifications" className="db-nav-icon-link" aria-label="Notifications">
            <VscBell />
            {unreadCount > 0 && <span className="db-nav-notif-dot" />}
          </Link>

          <div className="db-nav-profile-wrap">
            <button
              type="button"
              className={`db-nav-profile-trigger ${profileOpen ? 'is-open' : ''}`}
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <img src={avatarUrl} alt={user.name || 'Profile'} loading="lazy" decoding="async" />
            </button>

            {profileOpen && (
              <div className="db-nav-profile-dropdown" role="menu">
                <div className="db-nav-profile-head">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>

                <nav className="db-nav-profile-links">
                  <Link to="/profile" className="db-nav-profile-link" onClick={closeMenus}>
                    <VscAccount />
                    Profile
                  </Link>
                  <Link to="/surveys" className="db-nav-profile-link" onClick={closeMenus}>
                    <VscGraph />
                    Survey data
                  </Link>
                  <Link to="/settings" className="db-nav-profile-link" onClick={closeMenus}>
                    <VscSettingsGear />
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="db-nav-profile-link is-logout"
                    onClick={() => {
                      closeMenus();
                      logout();
                    }}
                  >
                    <VscSignOut />
                    Log out
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
