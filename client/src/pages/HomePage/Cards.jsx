import {
    VscRobot,
    VscMap,
    VscLightbulb,
    VscBolt,
    VscLocation,
    VscCheck
} from 'react-icons/vsc';
import './Cards.css';

// Card component for reusability
const CardItem = ({ icon: Icon, title, description }) => (
    <div className="card">
        <Icon className="card-icon" />
        <h3>{title}</h3>
        <p>{description}</p>
    </div>
);

// Cards data
const cardsData = [
    {
        icon: VscRobot,
        title: 'AI-Powered Recommendations',
        description: 'Get personalized travel suggestions based on your preferences, budget, and travel style.'
    },
    {
        icon: VscMap,
        title: 'Smart Itineraries',
        description: 'Create optimized day-by-day itineraries that maximize your time and minimize travel time.'
    },
    {
        icon: VscLightbulb,
        title: 'Local Insights',
        description: 'Discover hidden gems and local experiences curated by AI, not just tourist traps.'
    },
    {
        icon: VscBolt,
        title: 'Real-Time Updates',
        description: 'Get instant updates on weather, events, and travel conditions for your trip.'
    },
    {
        icon: VscLocation,
        title: 'Interactive Maps',
        description: 'Explore destinations with detailed maps and location-based recommendations.'
    },
    {
        icon: VscCheck,
        title: 'Collaborative Planning',
        description: 'Share plans with friends and family, collect suggestions, and plan together seamlessly.'
    }
];

export default function Cards() {
    return (
        <div className="cards-container">
            <div className="cards-title">Why Choose WayMate?</div>
            <div className="cards-grid">
                {cardsData.map((card, i) => (
                    <CardItem key={i} {...card} />
                ))}
            </div>
        </div>
    );
}
