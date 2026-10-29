import { useRef, createElement } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { VscArrowRight, VscCheck, VscMap, VscRobot } from 'react-icons/vsc';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx';
import BouncingBubbles from './BouncingBubbles.jsx';
import './Home.css';

/* ── Step cards ────────────────────────────────────────────────────────────── */
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

/* ── Proof cards ───────────────────────────────────────────────────────────── */
const ProofCard = ({ icon, signal, title, body }) => (
    <article className="home-proof-card">
        <div className="home-proof-card-head">
            <div className="home-proof-icon-wrap">
                {createElement(icon, { className: 'home-proof-icon', 'aria-hidden': true })}
            </div>
            <span className="home-proof-signal">{signal}</span>
        </div>
        <h3>{title}</h3>
        <p>{body}</p>
    </article>
);

export default function Home() {
    const { isAuthenticated } = useAuth();
    const heroRef = useRef(null);

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

                {/* ── Section 1: Hero — dark forest-900, gradient mesh, cinematic ── */}
                <section
                    className="home-hero"
                    aria-labelledby="home-hero-title"
                    ref={heroRef}
                >
                    {/* Animated gradient mesh orbs — Tier 1 cinematic (hero only) */}
                    <div className="home-hero-mesh" aria-hidden="true">
                        <div className="home-hero-orb home-hero-orb-a" />
                        <div className="home-hero-orb home-hero-orb-b" />
                        <div className="home-hero-orb home-hero-orb-c" />
                    </div>
                    {/* Noise texture overlay for premium feel */}
                    <div className="home-hero-noise" aria-hidden="true" />

                    {/* Ambient Bouncing Bubbles floating continuously in the hero background */}
                    <BouncingBubbles />

                    <div className="home-shell home-hero-grid">
                        {/* Left — copy */}
                        <div className="home-hero-copy">
                            <span className="home-eyebrow">WayMate Atelier</span>
                            <h1 id="home-hero-title">
                                Plan journeys with<br />
                                <em>editorial taste</em><br />
                                and operational precision.
                            </h1>
                            <p>
                                WayMate blends narrative travel design with route intelligence,
                                so your itinerary feels curated from the first idea and still works
                                when real-world conditions shift.
                            </p>

                            <div className="home-hero-actions">
                                <Link to={plannerPath} className="home-btn home-btn-primary">
                                    Start planning with AI <VscArrowRight aria-hidden="true" />
                                </Link>
                                <a href="#features" className="home-btn home-btn-ghost">
                                    Explore capability atlas
                                </a>
                            </div>

                            {/* Stats strip */}
                            <div className="home-hero-stats">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="home-hero-stat">
                                        <strong>{stat.value}</strong>
                                        <span>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — Frosted Editorial Note floating over the hero surface */}
                        <div className="home-hero-right" aria-hidden="true">
                            <article className="home-editorial-note">
                                <div className="home-editorial-note-header">
                                    <span className="home-editorial-note-tag">Trip Draft 05</span>
                                    <span className="home-editorial-note-status">Live</span>
                                </div>
                                <h3>"Lisbon + Porto, six days, coastal mornings and late food scenes."</h3>
                                <p>
                                    WayMate converts this into a living itinerary with timing logic, local flavor, and
                                    shared approval flow.
                                </p>
                                <ul>
                                    {heroHighlights.map((item) => (
                                        <li key={item}>
                                            <VscCheck aria-hidden="true" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    <div className="home-hero-scroll-hint" aria-hidden="true">
                        <span />
                    </div>
                </section>

                {/* ── Section 2: Trust Architecture / Proof ── */}
                <section id="proof" className="home-proof" aria-labelledby="home-proof-title">
                    <div className="home-shell">
                        <header className="home-proof-header">
                            <span className="home-section-kicker">Trust Architecture</span>
                            <h2 id="home-proof-title">
                                Confidence is engineered into every planning decision.
                            </h2>
                        </header>

                        <div className="home-proof-grid">
                            {proof.map((item) => (
                                <ProofCard
                                    key={item.title}
                                    icon={item.icon}
                                    signal={item.signal}
                                    title={item.title}
                                    body={item.body}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Section 3: Feature Architecture / Cards ── */}
                <section id="features" aria-label="Feature Architecture">
                    <Cards />
                </section>

                {/* ── Section 4: Process / How It Works ── */}
                <section className="home-how" aria-labelledby="home-how-title">
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
                                    signal={step.signal}
                                    title={step.title}
                                    description={step.description}
                                    outcome={step.outcome}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Section 5: Global Reach / Globe ── */}
                <Globe />

                {/* ── Section 6: Traveler Feedback ── */}
                <Feedback />

                {/* ── Section 7: Editorial CTA ── */}
                <section className="home-cta">
                    <div className="home-shell">
                        <article className="home-cta-card">
                            <span className="home-cta-kicker">Now boarding thoughtful travel</span>
                            <h2>Build your next route with taste and confidence.</h2>
                            <p>
                                Whether it is a long-weekend reset or a month abroad, WayMate gives you a plan that
                                feels curated, realistic, and ready to move.
                            </p>
                            <Link to={startPath} className="home-btn home-btn-sand">
                                Enter WayMate <VscArrowRight aria-hidden="true" />
                            </Link>
                        </article>
                    </div>
                </section>
            </main>

            {/* ── Section 8: Editorial Footer ── */}
            <footer className="home-footer">
                <div className="home-shell">
                    <div className="home-footer-grid">
                        <section className="home-footer-column home-footer-brand">
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
                                    <a href="mailto:support@waymate.app">Contact Support</a>
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
