import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { VscArrowRight, VscCheck, VscMap, VscRobot } from 'react-icons/vsc';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx';
import './Home.css';

const StepCard = ({ number, title, description, outcome }) => (
    <article className="home-step-card">
        <span className="home-step-number">{number}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <strong>{outcome}</strong>
    </article>
);

export default function Home() {
    const { isAuthenticated } = useAuth();

    const steps = [
        {
            number: '01',
            title: 'Shape your brief in minutes',
            description: 'Tell WayMate how you like to move, spend, and explore. It reads your preferences like an editor reads a travel brief.',
            outcome: 'Outcome: a clear planning direction before you even pick dates.',
        },
        {
            number: '02',
            title: 'Receive route stories, not raw lists',
            description: 'You get route options with context: timing logic, vibe shifts through the day, and practical tradeoffs.',
            outcome: 'Outcome: every recommendation explains why it belongs in your trip.',
        },
        {
            number: '03',
            title: 'Collaborate and adapt on the fly',
            description: 'Invite friends, react to real-time changes, and keep one synchronized itinerary across every screen.',
            outcome: 'Outcome: confident decisions from first idea to final boarding call.',
        },
    ];

    const stats = [
        { value: '150+', label: 'Country-ready planning models' },
        { value: '42K+', label: 'Monthly travel plans drafted' },
        { value: '4.9/5', label: 'Traveler confidence score' },
    ];

    const proof = [
        {
            icon: VscRobot,
            title: 'AI that keeps context',
            body: 'WayMate remembers pace, budget, and preferences so suggestions improve every iteration.',
        },
        {
            icon: VscMap,
            title: 'Routing that respects reality',
            body: 'Built-in timing logic prevents overpacked days and keeps your route physically practical.',
        },
        {
            icon: VscCheck,
            title: 'Decisions you can trust',
            body: 'Each recommendation is transparent, editable, and designed for collaborative planning.',
        },
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
                            <span className="home-eyebrow">
                                Premium AI trip planning
                            </span>
                            <h1>WayMate turns trip ideas into editorial-grade itineraries.</h1>
                            <p>
                                From first spark to final check-in, plan with a platform that blends intelligence,
                                aesthetics, and practical routing in one calm workflow.
                            </p>

                            <div className="home-hero-actions">
                                <Link to={plannerPath} className="home-btn home-btn-primary">
                                    Start your travel brief <VscArrowRight />
                                </Link>
                                <a href="#features" className="home-btn home-btn-outline">
                                    Read the feature story
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

                        <div className="home-hero-editorial" aria-hidden="true">
                            <div className="home-editorial-orb home-editorial-orb-one" />
                            <div className="home-editorial-orb home-editorial-orb-two" />
                            <div className="home-editorial-orb home-editorial-orb-three" />

                            <article className="home-editorial-note">
                                <span>Field Note</span>
                                <h3>"Tokyo in five days, with quiet mornings and late city energy."</h3>
                                <p>
                                    WayMate translates this into a living schedule that balances movement, budget,
                                    and spontaneity.
                                </p>
                                <ul>
                                    <li>Dynamic route timing</li>
                                    <li>Budget-aware recommendations</li>
                                    <li>Instant team collaboration</li>
                                </ul>
                            </article>
                        </div>
                    </div>
                </section>

                <section id="proof" className="home-proof">
                    <div className="home-shell">
                        <div className="home-proof-grid">
                            {proof.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.title} className="home-proof-card">
                                        <Icon className="home-proof-icon" />
                                        <h3>{item.title}</h3>
                                        <p>{item.body}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <Globe />
                <Cards />

                <section className="home-how">
                    <div className="home-shell home-how-layout">
                        <div className="home-how-intro">
                            <span>Process</span>
                            <h2>A planning rhythm that feels intentional.</h2>
                            <p>
                                This is not a checklist machine. It is a guided narrative flow that helps you decide
                                faster and travel better.
                            </p>
                        </div>

                        <div className="home-steps-grid">
                            {steps.map((step) => (
                                <StepCard
                                    key={step.number}
                                    number={step.number}
                                    title={step.title}
                                    description={step.description}
                                    outcome={step.outcome}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                <Feedback />

                <section className="home-cta">
                    <div className="home-shell">
                        <article className="home-cta-card">
                            <span className="home-cta-kicker">Now boarding thoughtful travel</span>
                            <h2>Build your next route with taste and confidence.</h2>
                            <p>
                                Whether it is a long-weekend reset or a month abroad, WayMate gives you a plan that
                                feels curated, realistic, and ready to move.
                            </p>
                            <Link to={startPath} className="home-btn home-btn-light">
                                Enter WayMate <VscArrowRight />
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
                            <p>
                                The editorial trip studio for modern travelers who want beautiful planning and reliable
                                execution.
                            </p>
                        </section>

                        <section className="home-footer-column">
                            <h4>Product</h4>
                            <ul>
                                <li>
                                    <a href="#features">Feature Story</a>
                                </li>
                                <li>
                                    <a href="#proof">Trust Signals</a>
                                </li>
                                <li>
                                    <Link to={plannerPath}>AI Assistant</Link>
                                </li>
                                <li>
                                    <Link to="/login">Sign In</Link>
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
                                        Open Source
                                    </a>
                                </li>
                                <li>
                                    <Link to="/register">Create Account</Link>
                                </li>
                            </ul>
                        </section>
                    </div>

                    <div className="home-footer-bottom">
                        <p>{year} WayMate. Crafted for better journeys.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
