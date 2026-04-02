import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { VscArrowRight, VscRobot } from 'react-icons/vsc';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx';
import './Home.css';

const StepCard = ({ number, title, description }) => (
    <article className="home-step-card">
        <span className="home-step-number">{number}</span>
        <h3>{title}</h3>
        <p>{description}</p>
    </article>
);

export default function Home() {
    const { isAuthenticated } = useAuth();

    const steps = [
        {
            number: '1',
            title: 'Share your travel style',
            description: 'Set goals, budget, and pace so the planner adapts to how you actually travel.',
        },
        {
            number: '2',
            title: 'Get smart recommendations',
            description: 'Discover routes, timings, and local ideas tailored to your trip context.',
        },
        {
            number: '3',
            title: 'Build and refine your plan',
            description: 'Create your itinerary, collaborate with others, and adjust in real time.',
        },
    ];

    const stats = [
        { value: '150+', label: 'Countries covered' },
        { value: '24/7', label: 'AI trip assistant' },
        { value: '4.9/5', label: 'Traveler satisfaction' },
    ];

    const plannerPath = isAuthenticated ? '/assistant' : '/register';
    const startPath = isAuthenticated ? '/dashboard' : '/register';
    const year = new Date().getFullYear();

    return (
        <div className="home-page">
            <Navbar />

            <main className="home-main">
                <section className="home-hero">
                    <div className="home-shell home-hero-grid">
                        <div className="home-hero-copy">
                            <span className="home-eyebrow">AI-powered travel planning</span>
                            <h1>Plan smarter journeys with WayMate.</h1>
                            <p>
                                Turn vague ideas into clear, personalized itineraries with a modern planner that blends
                                recommendations, navigation, and collaboration in one place.
                            </p>

                            <div className="home-hero-actions">
                                <Link to={plannerPath} className="home-btn home-btn-primary">
                                    Start planning <VscArrowRight />
                                </Link>
                                <a href="#features" className="home-btn home-btn-outline">
                                    Explore features
                                </a>
                            </div>

                            <div className="home-metrics">
                                {stats.map((stat) => (
                                    <article key={stat.label} className="home-metric-card">
                                        <strong>{stat.value}</strong>
                                        <span>{stat.label}</span>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="home-hero-visual" aria-hidden="true">
                            <div className="home-orb home-orb-main" />
                            <div className="home-orb home-orb-accent" />

                            <article className="home-hero-panel">
                                <VscRobot className="home-panel-icon" />
                                <h3>Your intelligent trip co-pilot</h3>
                                <p>Build full itineraries, compare routes, and adapt plans on the fly.</p>
                                <ul>
                                    <li>Adaptive destination suggestions</li>
                                    <li>Budget-aware planning flows</li>
                                    <li>Collaborative travel coordination</li>
                                </ul>
                            </article>
                        </div>
                    </div>
                </section>

                <Cards />

                <section className="home-how">
                    <div className="home-shell">
                        <div className="home-section-header">
                            <h2>How WayMate works</h2>
                            <p>Three focused steps from idea to itinerary.</p>
                        </div>

                        <div className="home-steps-grid">
                            {steps.map((step) => (
                                <StepCard
                                    key={step.number}
                                    number={step.number}
                                    title={step.title}
                                    description={step.description}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                <Globe />
                <Feedback />

                <section className="home-cta">
                    <div className="home-shell">
                        <article className="home-cta-card">
                            <span className="home-cta-kicker">Ready when you are</span>
                            <h2>Build your next trip with confidence.</h2>
                            <p>
                                From quick weekend escapes to long adventures, WayMate keeps every detail aligned.
                            </p>
                            <Link to={startPath} className="home-btn home-btn-light">
                                Get started free <VscArrowRight />
                            </Link>
                        </article>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <div className="home-shell">
                    <div className="home-footer-grid">
                        <section className="home-footer-column">
                            <h4>WayMate</h4>
                            <p>Your AI-powered travel companion for faster planning and better trips.</p>
                        </section>

                        <section className="home-footer-column">
                            <h4>Product</h4>
                            <ul>
                                <li>
                                    <a href="#features">Features</a>
                                </li>
                                <li>
                                    <Link to={plannerPath}>AI Assistant</Link>
                                </li>
                                <li>
                                    <Link to="/login">Sign in</Link>
                                </li>
                            </ul>
                        </section>

                        <section className="home-footer-column">
                            <h4>Company</h4>
                            <ul>
                                <li>
                                    <a href="mailto:support@waymate.app">Contact</a>
                                </li>
                                <li>
                                    <a href="https://github.com/ankitsingh794/waymate" target="_blank" rel="noreferrer">
                                        GitHub
                                    </a>
                                </li>
                                <li>
                                    <Link to="/register">Create account</Link>
                                </li>
                            </ul>
                        </section>
                    </div>

                    <div className="home-footer-bottom">
                        <p>{year} WayMate. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
