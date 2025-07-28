import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // 1. Import the useAuth hook
import Logo from '../assets/logo.png';
import './navbar.css';

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth(); // 2. Get authentication status and logout function
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLinkClick = () => {
        setMenuOpen(false); // Close mobile menu on link click
    };
    
    return (
        <header className="navbar">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="logo">
                <img src={Logo} alt="Logo" />
            </Link>
            
            <button
                className={`hamburger ${menuOpen ? "open" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle Menu"
            >
                ☰
            </button>

            <nav
                ref={menuRef}
                className={`navbar-links ${menuOpen ? "active" : ""}`}
            >
                {/* 3. Conditionally render links based on authentication status */}
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard" className="nav-link" onClick={handleLinkClick}>Dashboard</Link>
                        <Link to="/assistant" className="nav-link" onClick={handleLinkClick}>AI Assistant</Link>
                        <button onClick={() => { logout(); handleLinkClick(); }} className="nav-cta">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/" className="nav-link" onClick={handleLinkClick}>Home</Link>
                        <a href="#features" className="nav-link" onClick={handleLinkClick}>Features</a>
                        <Link to="/login" className="nav-cta" onClick={handleLinkClick}>Login</Link>
                    </>
                )}
            </nav>
        </header>
    )
}