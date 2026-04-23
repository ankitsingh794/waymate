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

const CardItem = ({ index, icon, title, description, tag, callout }) => (
    <article className="home-feature-card">
        <div className="home-feature-topline">
            <span className="home-feature-index">{index}</span>
            <span className="home-feature-tag">{tag}</span>
        </div>

        <div className="home-feature-header-row">
            <h3>{title}</h3>
            <div className="home-feature-icon-wrap">
                {createElement(icon, { className: 'home-feature-icon' })}
            </div>
        </div>

        <p>{description}</p>
        <strong>{callout}</strong>
    </article>
);

const cardsData = [
    {
        index: '01',
        icon: VscRobot,
        tag: 'Narrative Engine',
        title: 'Plan drafts that read like a city editor built them',
        description: 'WayMate shapes recommendations into a coherent daily narrative so your itinerary flows with intention, not randomness.',
        callout: 'Clear storyline from morning transit to evening plans.',
    },
    {
        index: '02',
        icon: VscMap,
        tag: 'Route Composition',
        title: 'Daily movement that respects geography and energy',
        description: 'Transport windows, neighborhood proximity, and walking load are balanced before a draft is ever approved.',
        callout: 'No more beautiful plans that break in real movement.',
    },
    {
        index: '03',
        icon: VscLightbulb,
        tag: 'Local Curation',
        title: 'Discovery tuned to your travel personality',
        description: 'From low-key cafe blocks to cultural anchors, recommendations align with the tone your group actually wants.',
        callout: 'Distinctive local moments over generic listicle picks.',
    },
    {
        index: '04',
        icon: VscLightbulbSparkle,
        tag: 'Live Signals',
        title: 'Adaptive alternatives when conditions change',
        description: 'When weather, queues, or travel timing shifts, the itinerary rebalances with practical fallback options instantly.',
        callout: 'Resilience built in before disruption becomes stress.',
    },
    {
        index: '05',
        icon: VscLocation,
        tag: 'Map Studio',
        title: 'Spatial previews before you commit to bookings',
        description: 'Visualize each day as a geographic route so transfers, meals, and major stops stay tight and realistic.',
        callout: 'Geographic coherence before wallet commitment.',
    },
    {
        index: '06',
        icon: VscCheck,
        tag: 'Group Alignment',
        title: 'Shared approvals without planning chaos',
        description: 'Everyone can review the same itinerary draft, comment in context, and resolve trade-offs without losing momentum.',
        callout: 'Fast consensus with transparent decisions.',
    },
];

export default function Cards() {
    return (
        <section id="features" className="home-features-section">
            <div className="home-features-shell">
                <header className="home-features-header">
                    <span className="home-section-kicker">Capability Atlas</span>
                    <h2>Every capability is designed to move a plan from idea to execution.</h2>
                    <p>
                        This is a planning stack built for clarity, collaboration, and live adaptability, not just a
                        place list with a pretty map.
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
