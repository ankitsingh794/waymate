import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import { VscSearch, VscChevronLeft, VscChevronRight, VscCompass, VscLocation, VscArrowRight } from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import './Dashboard.css';

// TripCard Component - Reusable
const TripCard = ({ trip }) => (
    <Link to={`/trip/${trip._id || trip.tripId}`} className="trip-card-link">
        <div className="trip-card">
            <div className="trip-image-wrapper">
                <img 
                    src={trip.coverImage || 'https://images.unsplash.com/photo-1502602898657-3e91760c0337?w=500&q=80'} 
                    alt={trip.destination} 
                    draggable="false" 
                    loading="lazy" 
                    decoding="async" 
                />
            </div>
            <div className="trip-info">
                <h4>{trip.destination}</h4>
                <div className="trip-meta">
                    <p className="trip-location">
                        <VscLocation /> {trip.destination}
                    </p>
                    <p className="trip-date">
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    </Link>
);

// TripCarousel Component
const TripCarousel = ({ title, subtitle, trips }) => {
    const containerRef = useRef(null);

    const handleNavClick = (direction) => {
        const container = containerRef.current;
        if (container) {
            const scrollAmount = 300;
            container.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    if (!trips || trips.length === 0) return null;

    return (
        <section className="carousel-section">
            <div className="carousel-header">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
                <div className="carousel-nav">
                    <button onClick={() => handleNavClick('left')} aria-label="Scroll left">
                        <VscChevronLeft />
                    </button>
                    <button onClick={() => handleNavClick('right')} aria-label="Scroll right">
                        <VscChevronRight />
                    </button>
                </div>
            </div>
            <div className="carousel-container" ref={containerRef}>
                {trips.map(trip => (
                    <TripCard trip={trip} key={trip._id || trip.tripId} />
                ))}
            </div>
        </section>
    );
};

// ExploreCard Component
const ExploreCard = ({ suggestion }) => (
    <Link to={`/explore?q=${suggestion.query}`} className="explore-card-link">
        <div className="explore-card">
            <div className="explore-image">
                <img 
                    src={suggestion.image} 
                    alt={suggestion.title} 
                    draggable="false" 
                    loading="lazy" 
                    decoding="async" 
                />
                <div className="explore-overlay"></div>
            </div>
            <div className="explore-content">
                <h4>{suggestion.title}</h4>
                <p>{suggestion.description}</p>
            </div>
        </div>
    </Link>
);

const exploreSuggestions = [
    {
        id: 1,
        title: 'Cozy Cafés to Kickstart Your Day ☕',
        description: 'Start your morning right with local brews, good vibes, and Wi-Fi-friendly corners.',
        query: 'cafes',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725793/20250722_1251_Travel_Adventures_Await_simple_compose_01k0rg1d0yehrszrgy9c88r7vf_bgosht.png',
        category: 'morning'
    },
    {
        id: 2,
        title: 'Top-Rated Restaurants for Lunch or Dinner 🍽️',
        description: 'From trending spots to timeless favorites, these places serve the best bites around.',
        query: 'restaurants',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725793/20250728_2300_Elegant_Dining_Atmosphere_simple_compose_01k19184vsesyafa059embpznx_xkeqqv.png',
        category: 'midday'
    },
    {
        id: 3,
        title: 'Scenic Parks & Trails to Unwind 🌿',
        description: 'Get some fresh air, stretch your legs, or plan a peaceful afternoon picnic.',
        query: 'parks',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725793/20250728_2303_Serene_Afternoon_Stroll_simple_compose_01k191dxm4f8j8arabbf441xpg_k1umvv.png',
        category: 'afternoon'
    },
    {
        id: 4,
        title: 'Late-Night Street Food Adventures 🌙',
        description: 'Explore sizzling stalls and bold local flavors under the city lights.',
        query: 'street food',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725792/20250728_2306_Vibrant_Indian_Night_Market_simple_compose_01k191k4jqfbarsb7va1jqakqy_gszieu.png',
        category: 'evening'
    },
    {
        id: 5,
        title: 'Art Galleries & Exhibits 🎨',
        description: 'Feed your creative side with inspiring local art, design, and culture.',
        query: 'art gallery',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725792/20250728_2307_Colorful_Abstract_Gallery_simple_compose_01k191q25zfy3s165671rgfrkc_tmhrrr.png',
        category: 'culture'
    },
    {
        id: 6,
        title: 'Must-See Historical Spots 🏛️',
        description: 'Walk through time with these heritage sites and iconic landmarks.',
        query: 'historical places',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725793/20250728_2310_Image_Generation_simple_compose_01k191sfwyej1s6xt058vmwey5_qxddwj.png',
        category: 'culture'
    },
    {
        id: 7,
        title: 'Instagrammable Photo Spots 📸',
        description: 'Snap some stunning shots at the city’s most photogenic corners.',
        query: 'instagram spots',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725792/20250728_2314_Vibrant_Street_Art_Pose_simple_compose_01k1921f27fjgs9y2n1qk0kzgg_vwxxlo.png',
        category: 'chill'
    },
    {
        id: 8,
        title: 'Shopping Streets & Bazaars 🛍️',
        description: 'Wander through colorful markets and local boutiques full of surprises.',
        query: 'shopping',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725791/20250728_2317_Vibrant_Market_Scene_simple_compose_01k1927swhfrv9e0q5sag4as4p_bmibuk.png',
        category: 'midday'
    },
    {
        id: 9,
        title: 'Rooftop Bars & City Views 🌇',
        description: 'Sip cocktails with a view — perfect for sunsets and city lights.',
        query: 'rooftop bars',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725791/20250728_2320_Sunset_Rooftop_Cheers_simple_compose_01k192bm6befesyb03cp0jdsbt_zyrj2f.png',
        category: 'evening'
    },
    {
        id: 10,
        title: 'Live Music & Nightlife 🎶',
        description: 'End your day with dancing, music, and vibrant local nightlife scenes.',
        query: 'live music',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725791/20250728_2322_Energetic_Live_Concert_simple_compose_01k192gqthfftvb27nr4dtkwk0_lwldsw.png',
        category: 'night'
    },
    {
        id: 11,
        title: 'Peaceful Temples & Spiritual Spots 🕊️',
        description: 'Find your calm in these tranquil places of worship and reflection.',
        query: 'temples',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725792/Gemini_Generated_Image_esbadkesbadkesba_rf3rz6.png',
        category: 'morning'
    },
    {
        id: 12,
        title: 'Chill Bookstores & Libraries 📚',
        description: 'Cozy up with a book or get lost in quiet corners of the city.',
        query: 'bookstore',
        image: 'https://res.cloudinary.com/divulwxho/image/upload/v1753725792/20250728_2327_Cozy_Indie_Bookstore_simple_compose_01k192s6c8fwpabeg0cmtw1cw7_ujvq7d.png',
        category: 'chill'
    }
];


export default function Dashboard() {
    const { user, upcomingTrips, setUpcomingTrips } = useAuth();
    const [ongoingTrips, setOngoingTrips] = useState([]);
    const [pastTrips, setPastTrips] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const hasFetchedTrips = useRef(false);

    useEffect(() => {
        // FIX: Renamed and updated the function to fetch all trip types concurrently.
        const fetchAllTrips = async () => {
            try {
                // Fetch ongoing, planned, and completed trips in parallel for better performance.
                const [ongoingRes, upcomingRes, pastRes] = await Promise.all([
                    api.get('/trips?status=ongoing'),
                    api.get('/trips?status=planned'),
                    api.get('/trips?status=completed') // Now correctly fetches completed trips
                ]);
                
                setOngoingTrips(ongoingRes.data.data.data || []);
                setUpcomingTrips(upcomingRes.data.data.data || []);
                setPastTrips(pastRes.data.data.data || []);

            } catch (err) {
                setError('Could not fetch dashboard data. Please try again later.');
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user && !hasFetchedTrips.current) {
            hasFetchedTrips.current = true;
            fetchAllTrips();
        } else if (!user) {
            setLoading(false);
        }
    }, [user, setUpcomingTrips]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    if (error) {
        return <div className="error-screen">{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <DashboardNavbar />
            <div className="dashboard-body">
                <main className="main-content">
                    <header className="main-header">
                        <div className="welcome-section">
                            <h1>Welcome back, {user?.name || 'Explorer'}! 👋</h1>
                            <p>Manage your trips and discover new adventures</p>
                        </div>
                        <div className="search-bar">
                            <VscSearch />
                            <input type="text" placeholder="Search your trips..." />
                        </div>
                    </header>

                    <TripCarousel
                        title="Ongoing Adventures"
                        subtitle="Your trips in progress"
                        trips={ongoingTrips}
                    />

                    <TripCarousel
                        title="Upcoming Trips"
                        subtitle="Plan ahead and get ready"
                        trips={upcomingTrips}
                    />

                    <section className="explore-section">
                        <div className="explore-header">
                            <div>
                                <h3>Quick Explore</h3>
                                <p>Discover amazing places near you</p>
                            </div>
                        </div>
                        <div className="explore-grid">
                            {exploreSuggestions.map(suggestion => (
                                <ExploreCard suggestion={suggestion} key={suggestion.id} />
                            ))}
                        </div>
                    </section>
                    
                    <TripCarousel
                        title="Past Adventures"
                        subtitle="Your travel memories"
                        trips={pastTrips}
                    />

                    <section className="cta-section">
                        <div className="cta-content">
                            <h2>Ready for your next adventure?</h2>
                            <p>Let our AI assistant help you plan your perfect trip</p>
                            <Link to="/assistant" className="cta-button">
                                Start Planning <VscArrowRight />
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}