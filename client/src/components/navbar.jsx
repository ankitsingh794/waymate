import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import './navbar.css';

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';

        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    const handleLinkClick = () => {
        setMenuOpen(false);
    };

    return (
        <header className={`navbar ${menuOpen ? 'is-open' : ''}`}>
            <div className="navbar-shell" ref={menuRef}>
                <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo" onClick={handleLinkClick}>
                    <img src={Logo} alt="WayMate" loading="lazy" decoding="async" />
                </Link>

                <button
                    type="button"
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle Menu"
                    aria-expanded={menuOpen}
                    aria-controls="primary-navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav id="primary-navigation" className={`navbar-links ${menuOpen ? 'active' : ''}`}>
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="nav-link" onClick={handleLinkClick}>
                                Dashboard
                            </Link>
                            <Link to="/assistant" className="nav-link" onClick={handleLinkClick}>
                                AI Assistant
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    logout();
                                    handleLinkClick();
                                }}
                                className="nav-cta"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="nav-link" onClick={handleLinkClick}>
                                Home
                            </Link>
                            <a href="#features" className="nav-link" onClick={handleLinkClick}>
                                Features
                            </a>
                            <Link to="/login" className="nav-cta" onClick={handleLinkClick}>
                                Login
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}