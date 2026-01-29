import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './Home.css';
import Navbar from '../../components/navbar.jsx';
import {
    VscRobot,
    VscMap,
    VscLightbulb,
    VscFire,
    VscArrowRight,
    VscCheck,
    VscStar,
    VscLocation
} from 'react-icons/vsc';

export default function Home() {
    const { t } = useTranslation('home');
    const { isAuthenticated } = useAuth();

    return (
        <div className="home">
            <Navbar />

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-text">
                        <span className="badge">✨ AI-Powered Travel Planning</span>
                        <h1>Plan Your Perfect Trip with AI</h1>
                        <p>Get personalized travel recommendations, create itineraries, and explore the world like never before with our intelligent travel assistant.</p>
                        <div className="hero-buttons">
                            <Link to={isAuthenticated ? "/assistant" : "/register"} className="btn btn-primary">
                                Start Planning <VscArrowRight />
                            </Link>
                            <a href="#features" className="btn btn-secondary">
                                Learn More
                            </a>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="gradient-blob blob-1"></div>
                        <div className="gradient-blob blob-2"></div>
                        <div className="hero-card">
                            <div className="card-content">
                                <VscRobot className="icon-large" />
                                <h3>AI Travel Assistant</h3>
                                <p>Powered by advanced AI</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hero-stats">
                    <div className="stat">
                        <span className="stat-number">50K+</span>
                        <span className="stat-label">Travelers</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">10K+</span>
                        <span className="stat-label">Trips Planned</span>
                    </div>
                    <div className="stat">
                        <span className="stat-number">150+</span>
                        <span className="stat-label">Destinations</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <div className="features-header">
                    <h2>Why Choose WayMate?</h2>
                    <p>Everything you need for smart travel planning</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscRobot />
                        </div>
                        <h3>AI-Powered Recommendations</h3>
                        <p>Get personalized travel suggestions based on your preferences, budget, and travel style.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscMap />
                        </div>
                        <h3>Smart Itineraries</h3>
                        <p>Create optimized day-by-day itineraries that maximize your time and minimize travel time.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscLightbulb />
                        </div>
                        <h3>Local Insights</h3>
                        <p>Discover hidden gems and local experiences curated by AI, not just tourist traps.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscFire />
                        </div>
                        <h3>Real-Time Updates</h3>
                        <p>Get instant updates on weather, events, and travel conditions for your trip.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscLocation />
                        </div>
                        <h3>Interactive Maps</h3>
                        <p>Explore destinations with detailed maps and location-based recommendations.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <VscCheck />
                        </div>
                        <h3>Collaborative Planning</h3>
                        <p>Share plans with friends and family, collect suggestions, and plan together seamlessly.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-works-section">
                <div className="section-header">
                    <h2>How It Works</h2>
                    <p>Three simple steps to your dream vacation</p>
                </div>
                <div className="steps-container">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Tell Us Your Style</h3>
                        <p>Share your preferences, budget, and travel dates. The AI learns what you love.</p>
                    </div>
                    <div className="step-arrow"></div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Get Smart Suggestions</h3>
                        <p>Receive personalized destination and activity recommendations tailored to you.</p>
                    </div>
                    <div className="step-arrow"></div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Plan & Explore</h3>
                        <p>Create your itinerary, book experiences, and get ready for an amazing trip!</p>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials-section">
                <div className="section-header">
                    <h2>Loved by Travelers</h2>
                    <p>See what our community has to say</p>
                </div>
                <div className="testimonials-grid">
                    <div className="testimonial-card">
                        <div className="stars">
                            <VscStar /><VscStar /><VscStar /><VscStar /><VscStar />
                        </div>
                        <p>"WayMate helped me plan the most amazing trip to Bali! The AI recommendations were spot-on."</p>
                        <div className="testimonial-author">
                            <div className="author-avatar">SA</div>
                            <div className="author-info">
                                <strong>Sarah Anderson</strong>
                                <span>Travel Enthusiast</span>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card">
                        <div className="stars">
                            <VscStar /><VscStar /><VscStar /><VscStar /><VscStar />
                        </div>
                        <p>"Finally, a travel planner that actually understands my budget constraints and preferences!"</p>
                        <div className="testimonial-author">
                            <div className="author-avatar">MJ</div>
                            <div className="author-info">
                                <strong>Michael Jones</strong>
                                <span>Adventure Seeker</span>
                            </div>
                        </div>
                    </div>
                    <div className="testimonial-card">
                        <div className="stars">
                            <VscStar /><VscStar /><VscStar /><VscStar /><VscStar />
                        </div>
                        <p>"The itinerary generator saved me hours of planning. Highly recommend to every traveler!"</p>
                        <div className="testimonial-author">
                            <div className="author-avatar">EP</div>
                            <div className="author-info">
                                <strong>Emily Parker</strong>
                                <span>Digital Nomad</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Explore?</h2>
                    <p>Join thousands of travelers planning their perfect trips with WayMate</p>
                    <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn btn-primary btn-large">
                        Get Started Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
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
                <div className="footer-bottom">
                    <p>&copy; 2025 WayMate. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
