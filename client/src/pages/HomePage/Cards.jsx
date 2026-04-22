import { createElement } from 'react';
import {
    VscRobot,
    VscMap,
    VscLightbulb,
    VscLightbulbSparkle,
    VscLocation,
    VscCheck,
} from 'react-icons/vsc';
import './Cards.css';

const CardItem = ({ icon, title, description, tag, callout }) => (
    <article className="home-feature-card">
        <div className="home-feature-header-row">
            <span className="home-feature-tag">{tag}</span>
            <div className="home-feature-icon-wrap">
                {createElement(icon, { className: 'home-feature-icon' })}
            </div>
        </div>
        <div className="home-feature-content">
            <h3>{title}</h3>
            <p>{description}</p>
            <strong>{callout}</strong>
        </div>
    </article>
);

const cardsData = [
    {
        icon: VscRobot,
        tag: 'Narrative AI',
        title: 'Recommendations with point of view',
        description: 'WayMate does more than list places. It frames each recommendation around the experience you want to create.',
        callout: 'Story-first planning, not decision fatigue.',
    },
    {
        icon: VscMap,
        tag: 'Route Design',
        title: 'Itineraries that move naturally',
        description: 'Travel windows, transit reality, and daily energy are mapped together so your trip feels smooth from morning to night.',
        callout: 'Fewer rushed hops, better days.',
    },
    {
        icon: VscLightbulb,
        tag: 'Discovery',
        title: 'Local moments worth keeping',
        description: 'Find independent cafes, overlooked neighborhoods, and cultural picks that match your style, not generic rankings.',
        callout: 'Travel with character, not cliches.',
    },
    {
        icon: VscLightbulbSparkle,
        tag: 'Live Context',
        title: 'Signals that keep plans current',
        description: 'When weather, events, or timing shifts, WayMate updates your plan with realistic alternatives in seconds.',
        callout: 'Adaptive decisions, lower stress.',
    },
    {
        icon: VscLocation,
        tag: 'Map Studio',
        title: 'Visual planning across the city',
        description: 'See your days on a spatial canvas so every booking, transfer, and stop is geographically coherent.',
        callout: 'Map clarity before you commit.',
    },
    {
        icon: VscCheck,
        tag: 'Collaboration',
        title: 'One plan, shared perspective',
        description: 'Bring your group into a single planning flow where feedback, choices, and priorities are easy to align.',
        callout: 'Consensus without the chaos.',
    },
];

export default function Cards() {
    return (
        <section id="features" className="home-features-section">
            <div className="home-features-shell">
                <header className="home-features-header">
                    <span>Feature Story</span>
                    <h2>A modern planning stack designed like a travel magazine.</h2>
                    <p>
                        Every capability is shaped to feel clear, elegant, and actionable, from your first route draft
                        to your final confirmation.
                    </p>
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
