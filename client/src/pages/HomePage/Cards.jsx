import {
    VscRobot,
    VscMap,
    VscLightbulb,
    VscLightbulbSparkle,
    VscLocation,
    VscCheck,
} from 'react-icons/vsc';
import './Cards.css';

const CardItem = ({ icon: Icon, title, description, tag }) => (
    <article className="home-feature-card">
        <div className="home-feature-icon-wrap">
            <Icon className="home-feature-icon" />
        </div>
        <div className="home-feature-content">
            <span className="home-feature-tag">{tag}</span>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    </article>
);

const cardsData = [
    {
        icon: VscRobot,
        tag: 'AI Core',
        title: 'Personalized recommendations',
        description: 'Get destination ideas tuned to your style, budget, and travel pace in seconds.',
    },
    {
        icon: VscMap,
        tag: 'Routing',
        title: 'Smart itineraries',
        description: 'Build day-by-day plans with realistic travel times and practical route sequencing.',
    },
    {
        icon: VscLightbulb,
        tag: 'Discovery',
        title: 'Local insights',
        description: 'Find meaningful spots and experiences beyond the standard tourist checklist.',
    },
    {
        icon: VscLightbulbSparkle,
        tag: 'Realtime',
        title: 'Live travel context',
        description: 'Stay updated with weather shifts, local events, and trip-impacting changes.',
    },
    {
        icon: VscLocation,
        tag: 'Navigation',
        title: 'Interactive map planning',
        description: 'View recommendations geographically to make better movement decisions.',
    },
    {
        icon: VscCheck,
        tag: 'Collaboration',
        title: 'Shared trip planning',
        description: 'Invite friends and family, align choices quickly, and move together confidently.',
    },
];

export default function Cards() {
    return (
        <section id="features" className="home-features-section">
            <div className="home-features-shell">
                <header className="home-features-header">
                    <h2>Why travelers choose WayMate</h2>
                    <p>Every feature is designed to make planning faster, clearer, and more enjoyable on every screen.</p>
                </header>

                <div className="home-features-grid">
                    {cardsData.map((card) => (
                        <CardItem key={card.title} {...card} />
                    ))}
                </div>
            </div>
        </section>
    );
}
