import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.svg';
import './navbar.css';

/**
 * Navbar — public landing navbar (Phase 3)
 *
 * Behaviour:
 * - position: fixed, starts transparent (no bg)
 * - On scroll > 60px: transitions to glass pill surface (Rule 1 — floating)
 * - Mobile (≤860px): hamburger → full-height slide-in drawer from RIGHT
 */
export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const menuRef = useRef(null);
    const drawerRef = useRef(null);

    // Scroll detection — adds 'is-scrolled' when past 60px
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        // Passive listener for perf
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); // run once on mount
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close drawer on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLinkClick = () => setMenuOpen(false);

    const navClass = [
        'navbar',
        scrolled ? 'is-scrolled' : '',
        menuOpen ? 'is-open' : '',
    ].filter(Boolean).join(' ');

    return (
        <header className={navClass} ref={menuRef}>
            {/* Backdrop overlay (mobile only) */}
            <div
                className="navbar-backdrop"
                aria-hidden="true"
                onClick={handleLinkClick}
            />

            <div className="navbar-shell">
                <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo" onClick={handleLinkClick}>
                    <img src={Logo} alt="WayMate" width="120" height="32" loading="eager" decoding="async" />
                    <span className="logo-copy" aria-hidden="true">
                        <strong>WayMate</strong>
                        <em>Atelier</em>
                    </span>
                </Link>

                <button
                    type="button"
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    aria-controls="primary-navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>

                {/* Desktop nav — inline */}
                <nav id="primary-navigation" className="navbar-links" aria-label="Primary navigation">
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="nav-link" onClick={handleLinkClick}>Dashboard</Link>
                            <Link to="/assistant" className="nav-link" onClick={handleLinkClick}>AI Assistant</Link>
                            <button type="button" onClick={() => { logout(); handleLinkClick(); }} className="nav-cta">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="nav-link" onClick={handleLinkClick}>Home</Link>
                            <a href="#features" className="nav-link" onClick={handleLinkClick}>Capabilities</a>
                            <a href="#proof" className="nav-link" onClick={handleLinkClick}>Trust</a>
                            <Link to="/login" className="nav-cta" onClick={handleLinkClick}>Login</Link>
                        </>
                    )}
                </nav>
            </div>

            {/* Mobile slide-in drawer from RIGHT */}
            <div
                id="primary-navigation"
                className={`navbar-drawer ${menuOpen ? 'is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                ref={drawerRef}
            >
                <div className="navbar-drawer-inner">
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="nav-drawer-link" onClick={handleLinkClick}>Dashboard</Link>
                            <Link to="/assistant" className="nav-drawer-link" onClick={handleLinkClick}>AI Assistant</Link>
                            <button type="button" onClick={() => { logout(); handleLinkClick(); }} className="nav-cta nav-cta--full">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="nav-drawer-link" onClick={handleLinkClick}>Home</Link>
                            <a href="#features" className="nav-drawer-link" onClick={handleLinkClick}>Capabilities</a>
                            <a href="#proof" className="nav-drawer-link" onClick={handleLinkClick}>Trust</a>
                            <Link to="/login" className="nav-cta nav-cta--full" onClick={handleLinkClick}>Login</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}