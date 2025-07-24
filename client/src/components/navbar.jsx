import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import Logo from '../assets/logo.png';
import './navbar.css'

export default function Navbar() {
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
    return (
        <div className="navbar">
                <div className="logo">
                    <img src={Logo} alt="Logo" />
                </div>
            

            <button
                className={`hamburger ${menuOpen ? "open" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle Menu"
                aria-expanded={menuOpen}
            >
                ☰
            </button>

            <div
                ref={menuRef}
                className={`navbar-links ${menuOpen ? "active" : ""}`}
            >
                <Link to={"/"} className="nav-link">Home</Link>
                <Link to={"/"} className="nav-link">Dashboard</Link>
                <a href="#cards-container" className="nav-link">Features</a>
                <Link to={"/"} className="nav-link">Pricing</Link>
                <Link to={"/login"} className="nav-cta">Login</Link>
            </div>
        </div>
    )
}