import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { VscArrowRight, VscCheck, VscMap, VscRobot } from 'react-icons/vsc';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx';
import './Home.css';

const StepCard = ({ number, signal, title, description, outcome }) => (
    <article className="home-step-card">
        <div className="home-step-head">
            <span className="home-step-number">{number}</span>
            <span className="home-step-signal">{signal}</span>
        </div>
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
            signal: 'Brief',
            title: 'Frame the journey like an editorial pitch',
            description: 'Start with mood, pace, budget boundaries, and non-negotiables. WayMate turns that into a planning brief everyone can align on.',
            outcome: 'Result: one shared direction before any booking pressure begins.',
        },
        {
            number: '02',
            signal: 'Compose',
            title: 'Build route stories with clear trade-offs',
            description: 'Each draft explains movement timing, neighborhood flow, and decision context so your team sees why every stop belongs.',
            outcome: 'Result: confident approvals instead of endless back-and-forth.',
        },
        {
            number: '03',
            signal: 'Adapt',
            title: 'Adjust live without breaking the schedule',
            description: 'Weather shifts, transit delays, and group edits are absorbed into the plan in real time while keeping the day coherent.',
            outcome: 'Result: a polished itinerary that survives real-world change.',
        },
    ];

    const stats = [
        { value: '150+', label: 'City ecosystems mapped' },
        { value: '42K+', label: 'Monthly collaborative drafts' },
        { value: '4.9/5', label: 'Decision confidence rating' },
    ];

    const proof = [
        {
            icon: VscRobot,
            signal: 'Context Memory',
            title: 'AI that remembers your planning intent',
            body: 'Preferences, trip tone, and constraints persist across revisions so each recommendation gets sharper over time.',
        },
        {
            icon: VscMap,
            signal: 'Route Physics',
            title: 'Routing calibrated for real movement',
            body: 'Travel windows, transfer overhead, and neighborhood sequence are modeled to prevent impossible day plans.',
        },
        {
            icon: VscCheck,
            signal: 'Transparent Logic',
            title: 'Decisions your whole group can verify',
            body: 'Every suggestion exposes why it appears, what it costs in time, and what trade-off it introduces.',
        },
    ];

    const heroHighlights = [
        'Editorial-grade route framing in minutes',
        'Shared decision flow for families, teams, and friend groups',
        'Live itinerary resilience when plans change mid-trip',
    ];

    const plannerPath = isAuthenticated ? '/assistant' : '/register';
    const startPath = isAuthenticated ? '/dashboard' : '/register';
    const year = new Date().getFullYear();

    return (
        <div className="home-page">
            <Navbar />

            <main className="home-main">
                <section className="home-hero" aria-labelledby="home-hero-title">
                    <div className="home-shell home-hero-grid">
                        <div className="home-hero-copy">
                            <span className="home-eyebrow">WayMate Atelier</span>
                            <h1 id="home-hero-title">Plan journeys with editorial taste and operational precision.</h1>
                            <p>
                                WayMate blends narrative travel design with route intelligence, so your itinerary feels
                                curated from the first idea and still works when real-world conditions shift.
                            </p>

                            <div className="home-hero-actions">
                                <Link to={plannerPath} className="home-btn home-btn-primary">
                                    Start planning with AI <VscArrowRight />
                                </Link>
                                <a href="#features" className="home-btn home-btn-outline">
                                    Explore capability atlas
                                </a>
                            </div>

                            <ul className="home-hero-highlights">
                                {heroHighlights.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>

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
                                <span>Trip Draft 05</span>
                                <h3>"Lisbon + Porto, six days, coastal mornings and late food scenes."</h3>
                                <p>
                                    WayMate converts this into a living itinerary with timing logic, local flavor, and
                                    shared approval flow.
                                </p>
                                <ul>
                                    <li>Transit-aware day sequencing</li>
                                    <li>Budget and pace guardrails</li>
                                    <li>One synchronized team timeline</li>
                                </ul>
                            </article>
                        </div>
                    </div>
                </section>

                <section id="proof" className="home-proof">
                    <div className="home-shell">
                        <header className="home-proof-header">
                            <span className="home-section-kicker">Trust Architecture</span>
                            <h2>Confidence is engineered into every planning decision.</h2>
                        </header>

                        <div className="home-proof-grid">
                            {proof.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.title} className="home-proof-card">
                                        <div className="home-proof-card-head">
                                            <Icon className="home-proof-icon" />
                                            <span className="home-proof-signal">{item.signal}</span>
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.body}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <Cards />
                <Globe />

                <section className="home-how" aria-labelledby="home-how-title">
                    <div className="home-shell home-how-layout">
                        <div className="home-how-intro">
                            <span className="home-section-kicker">Process Confidence</span>
                            <h2 id="home-how-title">A planning rhythm built for decisions, not chaos.</h2>
                            <p>
                                The workflow balances exploration and execution, giving you enough context to move
                                quickly without sacrificing quality.
                            </p>
                        </div>

                        <div className="home-steps-grid">
                            {steps.map((step) => (
                                <StepCard
                                    key={step.number}
                                    number={step.number}
                                    signal={step.signal}
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
                            <span className="home-cta-kicker">Ready for your next route draft</span>
                            <h2>Bring your next trip from concept to confident execution.</h2>
                            <p>
                                From fast weekend escapes to long multi-city journeys, build a plan that your group
                                can approve, understand, and follow.
                            </p>
                            <Link to={startPath} className="home-btn home-btn-light">
                                Open WayMate <VscArrowRight />
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
                                A collaborative trip planning studio where editorial storytelling meets practical route
                                operations.
                            </p>
                        </section>

                        <section className="home-footer-column">
                            <h4>Product</h4>
                            <ul>
                                <li>
                                    <a href="#features">Capability Atlas</a>
                                </li>
                                <li>
                                    <a href="#proof">Trust Architecture</a>
                                </li>
                                <li>
                                    <Link to={plannerPath}>Plan with AI</Link>
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
                                    <a href="mailto:support@waymate.app">Contact support</a>
                                </li>
                                <li>
                                    <a href="https://github.com/ankitsingh794/waymate" target="_blank" rel="noreferrer">
                                        Open Source
                                    </a>
                                </li>
                                <li>
                                    <Link to="/register">Create account</Link>
                                </li>
                            </ul>
                        </section>
                    </div>

                    <div className="home-footer-bottom">
                        <p>{year} WayMate. Designed for better travel decisions.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
