import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VscSearch, VscChevronLeft, VscChevronRight, VscCompass, VscLocation } from "react-icons/vsc";
import DashboardNavbar from '../../components/DashboardNavbar';
import api from '../../utils/axiosInstance';
import './Dashboard.css';

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
    
    if (trips.length === 0) {
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
                    <Link to={`/trip/${trip._id}`} className="trip-card-link" key={trip._id}>
                        <div className="trip-card">
                            <div className="trip-image-wrapper">
                                <img src={trip.imageUrl || `https://images.unsplash.com/photo-1502602898657-3e91760c0337?w=500&q=80`} alt={trip.destination} draggable="false" />
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
                const [userResponse, tripsResponse] = await Promise.all([
                    api.get('/users/profile'),
                    api.get('/trips')
                ]);

                setCurrentUser(userResponse.data.data.user);

                const now = new Date();
                const allTrips = tripsResponse.data.data.data;
                const upcoming = allTrips.filter(trip => new Date(trip.endDate) >= now);
                const past = allTrips.filter(trip => new Date(trip.endDate) < now);
                
                setUpcomingTrips(upcoming);
                setPastTrips(past);

            } catch (err) {
                setError('Could not fetch dashboard data. Please try again later.');
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="loading-screen">Loading your dashboard...</div>;
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
