import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx';
import {
    VscRobot,
    VscMap,
    VscLightbulb,
    VscFire,
    VscArrowRight,
    VscCheck,
    VscLocation
} from 'react-icons/vsc';
import './Home.css';

// Reusable Components
const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="feature-card">
        <Icon className="feature-icon" />
        <h3>{title}</h3>
        <p>{description}</p>
    </div>
);

const StepCard = ({ number, title, description }) => (
    <div className="step">
        <div className="step-number">{number}</div>
        <h3>{title}</h3>
        <p>{description}</p>
    </div>
);

export default function Home() {
    const { isAuthenticated } = useAuth();

    const steps = [
        {
            number: '1',
            title: 'Tell Us Your Style',
            description: 'Share your preferences, budget, and travel dates. The AI learns what you love.'
        },
        {
            number: '2',
            title: 'Get Smart Suggestions',
            description: 'Receive personalized destination and activity recommendations tailored to you.'
        },
        {
            number: '3',
            title: 'Plan & Explore',
            description: 'Create your itinerary, book experiences, and get ready for an amazing trip!'
        }
    ];

    return (
        <div className="home">
            <Navbar />

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-text">
                        <span className="badge">✨ AI-Powered Travel Planning</span>
                        <h1>Plan Your Perfect Trip with AI</h1>
                        <p>Get personalized travel recommendations, create itineraries, and explore the world like never before with our intelligent travel assistant.</p>
                        <div className="hero-buttons">
                            <Link to={isAuthenticated ? "/assistant" : "/register"} className="btn btn-primary btn-lg">
                                Start Planning <VscArrowRight />
                            </Link>
                            <a href="#features" className="btn btn-secondary btn-lg">Learn More</a>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="blob blob-1"></div>
                        <div className="blob blob-2"></div>
                        <div className="hero-card">
                            <VscRobot className="icon-large" />
                            <h3>AI Travel Assistant</h3>
                            <p>Powered by advanced AI</p>
                        </div>
                    </div>
                </div>
                <div className="stats">
                    <div>
                        <span className="stat-number">50K+</span>
                        <span className="stat-label">Travelers</span>
                    </div>
                    <div>
                        <span className="stat-number">10K+</span>
                        <span className="stat-label">Trips Planned</span>
                    </div>
                    <div>
                        <span className="stat-number">150+</span>
                        <span className="stat-label">Destinations</span>
                    </div>
                </div>
            </section>

            {/* Features Section - Using Cards Component */}
            <Cards />

            {/* How It Works */}
            <section className="how-it-works">
                <div className="section-header">
                    <h2>How It Works</h2>
                    <p>Three simple steps to your dream vacation</p>
                </div>
                <div className="steps">
                    {steps.map((step, idx) => (
                        <div key={idx}>
                            <StepCard {...step} />
                            {idx < steps.length - 1 && <div className="step-arrow"></div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* Globe Section */}
            <Globe />

            {/* Testimonials Section - Using Feedback Component */}
            <Feedback />

            {/* CTA Section */}
            <section className="cta">
                <div className="cta-content">
                    <h2>Ready to Explore?</h2>
                    <p>Join thousands of travelers planning their perfect trips with WayMate</p>
                    <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
                        Get Started Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-grid">
                    <div className="footer-section">
                        <h4>WayMate</h4>
                        <p>Your AI-powered travel planning companion</p>
                    </div>
                    <div className="footer-section">
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><Link to="/login">Sign In</Link></li>
                            <li><a href="#">Pricing</a></li>
                        </ul>
                    </div>
                    <div className="footer-section">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-divider"></div>
                <p className="footer-text">&copy; 2025 WayMate. All rights reserved.</p>
            </footer>
        </div>
    );
}
