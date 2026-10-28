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
                {createElement(icon, { className: 'home-feature-icon', 'aria-hidden': true })}
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
        tag: 'AI Itinerary Co-pilot',
        title: 'Multi-day narrative schedules with operational precision',
        description: 'WayMate blends generative intelligence with curated neighborhood logic, weather forecasts, and day-by-day itineraries that flow with intention.',
        callout: 'Clear storyline from morning transit to evening dining.',
    },
    {
        index: '02',
        icon: VscMap,
        tag: 'Multimodal Routing',
        title: 'Train schedules, live seat availability, and transit hub mapping',
        description: 'Direct railway schedule lookups, station hub connections, and multimodal options scored for fastest versus cheapest travel paths.',
        callout: 'No more switching between fragmented booking portals.',
    },
    {
        index: '03',
        icon: VscLightbulbSparkle,
        tag: 'Live Disruption Radar',
        title: 'Real-time regional alerts for weather, transit, and safety',
        description: 'Continuously monitors regional RSS feeds and forecasts to detect rail delays, strikes, or sudden storms before they disrupt your day.',
        callout: 'Resilience built in before disruption becomes stress.',
    },
    {
        index: '04',
        icon: VscCheck,
        tag: 'Collaborative Squad Chat',
        title: 'Shared live planning with instant AI group edits',
        description: 'Invite friends, family, or colleagues with shareable links. Chat in real time over Socket.IO and trigger live itinerary edits visible to all.',
        callout: 'Fast group consensus with zero planning chaos.',
    },
    {
        index: '05',
        icon: VscLocation,
        tag: 'Place Discovery',
        title: 'Verified local gems, ratings, and direct navigation',
        description: 'Filter workspace cafes, authentic local food, and cultural anchors powered by Google Places and verified geospatial coordinates.',
        callout: 'Geographic coherence before wallet commitment.',
    },
    {
        index: '06',
        icon: VscLightbulb,
        tag: 'Mobility Research Engine',
        title: 'Passive sensor intelligence empowering civic transportation',
        description: 'Opt-in sensor fusion classifies travel modes (walk, bike, metro, rail) to support agencies like NATPAC with anonymized urban mobility datasets.',
        callout: 'Every journey helps design smarter, greener cities.',
    },
];

export default function Cards() {
    return (
        <section id="features" className="home-features-section" aria-labelledby="features-title">
            <div className="home-features-shell">
                <header className="home-features-header">
                    <span className="home-section-kicker">Capability Atlas</span>
                    <h2 id="features-title">Every capability is designed to move a plan from idea to execution.</h2>
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
