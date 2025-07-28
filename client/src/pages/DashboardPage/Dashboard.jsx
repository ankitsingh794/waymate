import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VscSearch, VscChevronLeft, VscChevronRight, VscCompass, VscLocation } from "react-icons/vsc";
import DashboardNavbar from '../../components/DashboardNavbar';
import api from '../../utils/axiosInstance';
import socket from '../../utils/socket';
import './Dashboard.css';
import Lottie from 'lottie-react';
import CircleLoader from '../../assets/circle-loader.json';


const TripCarousel = ({ title, subtitle, trips }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setScrollLeft(containerRef.current.scrollLeft);
        containerRef.current.classList.add('is-dragging');
    };

    const onMouseLeaveOrUp = () => {
        if (!containerRef.current) return;
        setIsDragging(false);
        containerRef.current.classList.remove('is-dragging');
    };

    const onMouseMove = (e) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        containerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleNavClick = (direction) => {
        const container = containerRef.current;
        if (container) {
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollTo({
                left: container.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount),
                behavior: 'smooth',
            });
        }
    };

    if (!trips || trips.length === 0) {
        return null;
    }

    return (
        <section className="trip-carousel-section">
            <header className="carousel-header">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
                <div className="carousel-nav">
                    <button onClick={() => handleNavClick('left')} aria-label="Scroll left"><VscChevronLeft /></button>
                    <button onClick={() => handleNavClick('right')} aria-label="Scroll right"><VscChevronRight /></button>
                </div>
            </header>
            <div
                className="carousel-container"
                ref={containerRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeaveOrUp}
                onMouseUp={onMouseLeaveOrUp}
                onMouseMove={onMouseMove}
            >
                {trips.map(trip => (
                    <Link to={`/trip/${trip._id || trip.tripId}`} className="trip-card-link" key={trip._id || trip.tripId}>
                        <div className="trip-card">
                            <div className="trip-image-wrapper">
                                <img src={trip.coverImage || `https://images.unsplash.com/photo-1502602898657-3e91760c0337?w=500&q=80`} alt={trip.destination} draggable="false" />
                            </div>
                            <div className="trip-info">
                                <h4>{trip.destination}</h4>
                                <p className="trip-location"><VscLocation /> {trip.destination}</p>
                                <p className="trip-date">{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

const ExploreCard = ({ suggestion }) => {
    return (
        <Link to={`/explore?q=${suggestion.query}`} className="explore-card-link">
            <div className="explore-card">
                <div className="explore-image-wrapper">
                    <img src={suggestion.image} alt={suggestion.title} draggable="false" />
                    <div className="explore-card-overlay"></div>
                </div>
                <div className="explore-info">
                    <h4>{suggestion.title}</h4>
                    <p>{suggestion.description}</p>
                </div>
            </div>
        </Link>
    );
};

const exploreSuggestions = [
  {
    id: 1,
    title: 'Cozy Cafés to Kickstart Your Day ☕',
    description: 'Start your morning right with local brews, good vibes, and Wi-Fi-friendly corners.',
    query: 'cafes',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop',
    category: 'morning'
  },
  {
    id: 2,
    title: 'Top-Rated Restaurants for Lunch or Dinner 🍽️',
    description: 'From trending spots to timeless favorites, these places serve the best bites around.',
    query: 'restaurants',
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&auto=format&fit=crop',
    category: 'midday'
  },
  {
    id: 3,
    title: 'Scenic Parks & Trails to Unwind 🌿',
    description: 'Get some fresh air, stretch your legs, or plan a peaceful afternoon picnic.',
    query: 'parks',
    image: 'https://images.unsplash.com/photo-1508606572321-901ea4437071?w=500&auto=format&fit=crop',
    category: 'afternoon'
  },
  {
    id: 4,
    title: 'Late-Night Street Food Adventures 🌙',
    description: 'Explore sizzling stalls and bold local flavors under the city lights.',
    query: 'street food',
    image: 'https://unsplash.com/photos/man-in-red-t-shirt-and-black-pants-standing-in-front-of-food-stall-during-daytime-N18PrG7k35o/download?force=true',
    category: 'evening'
  },
  {
    id: 5,
    title: 'Art Galleries & Exhibits 🎨',
    description: 'Feed your creative side with inspiring local art, design, and culture.',
    query: 'art gallery',
    image: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=500&auto=format&fit=crop',
    category: 'culture'
  },
  {
    id: 6,
    title: 'Must-See Historical Spots 🏛️',
    description: 'Walk through time with these heritage sites and iconic landmarks.',
    query: 'historical places',
    image: 'https://images.unsplash.com/photo-1559589689-577aabd1f3b0?w=500&auto=format&fit=crop',
    category: 'culture'
  },
  {
    id: 7,
    title: 'Instagrammable Photo Spots 📸',
    description: 'Snap some stunning shots at the city’s most photogenic corners.',
    query: 'instagram spots',
    image: 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=500&auto=format&fit=crop',
    category: 'chill'
  },
  {
    id: 8,
    title: 'Shopping Streets & Bazaars 🛍️',
    description: 'Wander through colorful markets and local boutiques full of surprises.',
    query: 'shopping',
    image: 'https://images.unsplash.com/photo-1555529771-35a38fb0c619?w=500&auto=format&fit=crop',
    category: 'midday'
  },
  {
    id: 9,
    title: 'Rooftop Bars & City Views 🌇',
    description: 'Sip cocktails with a view — perfect for sunsets and city lights.',
    query: 'rooftop bars',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop',
    category: 'evening'
  },
  {
    id: 10,
    title: 'Live Music & Nightlife 🎶',
    description: 'End your day with dancing, music, and vibrant local nightlife scenes.',
    query: 'live music',
    image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=500&auto=format&fit=crop',
    category: 'night'
  },
  {
    id: 11,
    title: 'Peaceful Temples & Spiritual Spots 🕊️',
    description: 'Find your calm in these tranquil places of worship and reflection.',
    query: 'temples',
    image: 'https://images.unsplash.com/photo-1523528283117-0ec22b4f58c1?w=500&auto=format&fit=crop',
    category: 'morning'
  },
  {
    id: 12,
    title: 'Chill Bookstores & Libraries 📚',
    description: 'Cozy up with a book or get lost in quiet corners of the city.',
    query: 'bookstore',
    image: 'https://images.unsplash.com/photo-1510626176961-4b37d0ef1c5b?w=500&auto=format&fit=crop',
    category: 'chill'
  }
];


export default function Dashboard() {
    const { t } = useTranslation('dashboard');

    const [currentUser, setCurrentUser] = useState(null);
    const [upcomingTrips, setUpcomingTrips] = useState([]);
    const [pastTrips, setPastTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // --- UPDATED: More efficient data fetching ---
                // Instead of fetching all trips and filtering on the client,
                // we now use specific endpoints for upcoming and past trips.
                const [userResponse, upcomingResponse, pastResponse] = await Promise.all([
                    api.get('/users/profile'), // Fetches user profile
                    api.get('/trips/upcoming'), // Use the dedicated endpoint for upcoming trips
                    api.get('/trips?status=completed') // Use a query param for past trips
                ]);

                setCurrentUser(userResponse.data.data.user);
                setUpcomingTrips(upcomingResponse.data.data.data);
                setPastTrips(pastResponse.data.data.data);

            } catch (err) {
                setError('Could not fetch dashboard data. Please try again later.');
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();


        fetchData();

        socket.connect();

        const handleNewTrip = (data) => {
            console.log('New trip received via WebSocket:', data);
            setUpcomingTrips(prevTrips => [data.summary, ...prevTrips]);
        };

        socket.on('tripCreated', handleNewTrip);

        return () => {
            socket.off('tripCreated', handleNewTrip);
            socket.disconnect();
        };
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <Lottie animationData={CircleLoader} style={{ width: 150, height: 150 }} />
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
                <aside className={`sidebar`}>
                    <div className="sidebar-content">
                        {currentUser && (
                            <div className="sidebar-profile">
                                <img src={currentUser.profileImage || `https://placehold.co/100x100/EDAFB8/4A5759?text=${currentUser.name.charAt(0)}`} alt="User" className="profile-avatar" />
                                <h4>{currentUser.name}</h4>
                                <p>{t('sidebar.traveler')}</p>
                            </div>
                        )}
                        <div className="plan-trip-card">
                            <VscCompass className="plan-trip-icon" />
                            <h5>{t('sidebar.planTitle')}</h5>
                            <p>{t('sidebar.planSubtitle')}</p>
                            <Link to="/assistant" className="plan-trip-btn">{t('sidebar.planButton')}</Link>
                        </div>
                    </div>
                </aside>
                <main className="main-content">
                    <header className="main-header">
                        <div className="welcome-message">
                            <h1>{t('welcome', { name: currentUser?.name || 'Explorer' })}</h1>
                            <p>{t('subheading')}</p>
                        </div>
                        <div className="search-bar">
                            <VscSearch />
                            <input type="text" placeholder={t('searchPlaceholder')} />
                        </div>
                    </header>

                    <TripCarousel
                        title={t('upcomingTrips')}
                        subtitle={t('upcomingSubtitle')}
                        trips={upcomingTrips}
                    />
                    <section className="trip-carousel-section">
                        <header className="carousel-header">
                            <div>
                                <h3>{t('shortventure')}</h3>
                                <p>{t('shortventureSubtitle')}</p>
                            </div>
                        </header>
                        <div className="carousel-container explore-container">
                            {exploreSuggestions.map(suggestion => (
                                <ExploreCard suggestion={suggestion} key={suggestion.id} />
                            ))}
                        </div>
                    </section>
                    <TripCarousel
                        title={t('pastAdventures')}
                        subtitle={t('pastSubtitle')}
                        trips={pastTrips}
                    />


                </main>
            </div>
        </div>
    );
}