import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import './Details.css'; // We will update this file next

// Import all necessary icons
import {
    VscArrowLeft, VscCalendar, VscShare, VscSignOut, VscEdit, VscHeart, VscMilestone,
    VscCheck, VscChevronRight, VscChevronLeft, VscSparkle, VscOrganization, VscTrash, VscEllipsis, VscAdd
} from "react-icons/vsc";
import { GiTakeMyMoney, GiForkKnifeSpoon, GiBed, GiTicket } from "react-icons/gi";
import { IoPeopleSharp } from "react-icons/io5";
import { FaTrainSubway } from "react-icons/fa6";
import { BsCheck2Circle, BsInfoCircle, BsLightbulb } from "react-icons/bs";

const COLORS = {
    primary: '#edafb8', secondary: '#f7e1d7', background: '#dedbd2',
    accent: '#b0c4b1', text: '#4a5759',
};

// Reusable Modal Component (remains useful for actions)
const Modal = ({ children, onClose, title, size = 'medium' }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={onClose}>
        <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            className={`modal-content modal-${size}`}
            style={{ backgroundColor: COLORS.secondary, color: COLORS.text }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="modal-header">
                <h2 className="modal-title">{title}</h2>
                <button onClick={onClose} className="modal-close-button" style={{ color: COLORS.primary }}>&times;</button>
            </div>
            <div className="modal-body">{children}</div>
        </motion.div>
    </motion.div>
);

// NEW: AI Summary Widget
const AISummary = ({ summary }) => {
    if (!summary) return null;
    return (
        <div className="dashboard-card ai-summary-card">
            <h3 className="card-title"><VscSparkle /> AI Trip Assistant</h3>
            <div className="ai-section">
                <h4><BsInfoCircle /> Overview</h4>
                <p>{summary.overview}</p>
            </div>
            <div className="ai-section">
                <h4><BsLightbulb /> Top Tips</h4>
                <ul>
                    {summary.tips?.map((tip, i) => <li key={i}><BsCheck2Circle /> {tip}</li>)}
                </ul>
            </div>
            <div className="ai-section">
                <h4><GiForkKnifeSpoon /> Must-Eats</h4>
                <ul>
                    {summary.mustEats?.map((food, i) => <li key={i}>{food}</li>)}
                </ul>
            </div>
        </div>
    );
};

// NEW: Smart Schedule Widget
const SmartSchedule = ({ schedule, tripId }) => {
    const handleUpgrade = async () => {
        // This would call the API endpoint to generate the schedule
        try {
            // Example: await api.post(`/trips/${tripId}/smart-schedule`);
            alert('Upgrading to Smart Schedule! Please refresh.');
        } catch (error) {
            console.error("Failed to upgrade schedule", error);
            alert('Failed to upgrade schedule.');
        }
    };

    if (!schedule || schedule.options?.length === 0) {
        return (
            <div className="dashboard-card smart-schedule-promo">
                <h3><FaTrainSubway /> Upgrade to Smart Schedule</h3>
                <p>Get AI-powered train recommendations for the best travel times and prices.</p>
                <button className="promo-button" onClick={handleUpgrade}>Generate Schedule</button>
            </div>
        );
    }

    return (
        <div className="dashboard-card">
            <h3 className="card-title"><FaTrainSubway /> Smart Train Schedule</h3>
            <p className="schedule-info">
                From <strong>{schedule.sourceStation}</strong> to <strong>{schedule.destinationStation}</strong> on <strong>{schedule.travelDate}</strong>
            </p>
            <div className="schedule-options">
                {schedule.options.map((opt, i) => (
                    <div className="train-option" key={i}>
                        <div className="train-header">
                            <strong>{opt.trainName}</strong> ({opt.trainNumber})
                        </div>
                        <div className="train-details">
                            <span><strong>Dep:</strong> {opt.departureTime}</span>
                            <span><strong>Arr:</strong> {opt.arrivalTime}</span>
                            <span><strong>Dur:</strong> {opt.duration}</span>
                        </div>
                        <div className="train-classes">
                            {opt.availableClasses.map(cls => <span key={cls} className="class-badge">{cls}</span>)}
                        </div>
                        {opt.recommendationReason && <p className="recommendation-reason"><BsLightbulb /> {opt.recommendationReason}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};


// MODIFIED: Itinerary component now lives on the page
const Itinerary = ({ itinerary }) => {
    const [currentDay, setCurrentDay] = useState(0);

    if (!itinerary || itinerary.length === 0) {
        return (
            <div className="dashboard-card">
                <h3 className="card-title"><VscMilestone /> Itinerary</h3>
                <p>No itinerary planned yet. Start adding activities!</p>
            </div>
        );
    }
    
    const day = itinerary[currentDay];

    const nextDay = () => setCurrentDay(i => (i + 1) % itinerary.length);
    const prevDay = () => setCurrentDay(i => (i - 1 + itinerary.length) % itinerary.length);

    return (
        <div className="dashboard-card itinerary-widget">
            <div className="itinerary-header">
                <h3 className="card-title"><VscMilestone /> Daily Itinerary</h3>
                <div className="day-nav">
                    <button onClick={prevDay}><VscChevronLeft /></button>
                    <span>Day {day.day}: {day.title}</span>
                    <button onClick={nextDay}><VscChevronRight /></button>
                </div>
            </div>
            <ul className="activity-list">
                {day.activities.map((activity, i) => (
                    <li key={i}><VscCheck /> {activity}</li>
                ))}
            </ul>
        </div>
    );
};

// NEW: Recommendations Widget
const Recommendations = ({ attractions, food, accommodation }) => {
    const [activeTab, setActiveTab] = useState('attractions');
    const tabs = {
        attractions: { data: attractions, icon: <GiTicket />, label: "Attractions" },
        food: { data: food, icon: <GiForkKnifeSpoon />, label: "Restaurants" },
        accommodation: { data: accommodation, icon: <GiBed />, label: "Hotels" },
    };

    const currentTab = tabs[activeTab];

    return (
        <div className="dashboard-card">
            <div className="reco-tabs">
                {Object.keys(tabs).map(key => (
                    (tabs[key].data && tabs[key].data.length > 0) &&
                    <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>
                        {tabs[key].icon} {tabs[key].label}
                    </button>
                ))}
            </div>
            <div className="reco-content">
                {!currentTab.data || currentTab.data.length === 0 ? (
                    <p>No recommendations available in this category.</p>
                ) : (
                    <ul className="reco-list">
                        {currentTab.data.slice(0, 5).map((item, i) => (
                            <li key={item.name + i}>
                                {item.image && <img src={item.image} alt={item.name} className="reco-image" loading="lazy" decoding="async"/>}
                                <div className="reco-info">
                                    <strong>{item.name}</strong>
                                    <p>{item.vicinity || item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// NEW: Members Widget
const MembersWidget = ({ members = [] }) => {
    return (
        <div className="dashboard-card">
            <h3 className="card-title"><IoPeopleSharp /> Trip Members</h3>
            <ul className="member-list">
                {members.map(member => (
                    <li key={member.userId._id} className="member-item">
                        <img src={member.userId.profileImage || `https://ui-avatars.com/api/?name=${member.userId.name}&background=b0c4b1&color=4a5759`} alt={member.userId.name} />
                        <div className="member-info">
                            <strong>{member.userId.name}</strong>
                            <span>{member.role}</span>
                        </div>
                    </li>
                ))}
            </ul>
            <button className="card-action-button"><VscAdd /> Invite More</button>
        </div>
    );
};

// Main Component
export default function TripDetails() {
    const { t } = useTranslation(['tripDetails', 'common']);
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTripData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/trips/${id}`);
            setTrip(data.data.trip);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch trip details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTripData();
    }, [fetchTripData]);
    
    // Favorite status logic
    const [isFavorite, setIsFavorite] = useState(false);
    useEffect(() => {
        if (trip) setIsFavorite(trip.favorite);
    }, [trip]);
    
    const handleToggleFavorite = async () => {
        setIsFavorite(prev => !prev); // Optimistic update
        try {
            await api.patch(`/trips/${id}/favorite`);
        } catch (err) {
            setIsFavorite(prev => !prev); // Revert on failure
            console.error("Failed to update favorite status", err);
        }
    };
    
    if (loading) return <div className="loading-screen">Loading Your Adventure...</div>;
    if (error) return <div className="error-screen">{error}</div>;
    if (!trip) return <div className="loading-screen">Trip data not found.</div>;

    const hasRecommendations = (trip.attractions?.length > 0) || (trip.foodRecommendations?.length > 0) || (trip.accommodationSuggestions?.length > 0);

    return (
        <div className="trip-details-page" style={{ backgroundColor: COLORS.background }}>
            <Link to="/dashboard" className="back-to-dash"><VscArrowLeft /> {t('tripDetails:backToDashboard')}</Link>
            
            <header className="trip-hero">
                <img src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80'} alt={trip.destination} className="hero-bg-image" loading="lazy" decoding="async" />
                <div className="hero-overlay"></div>
                <div className="hero-top-actions">
                    <button className={`hero-favorite-button ${isFavorite ? 'active' : ''}`} onClick={handleToggleFavorite}>
                        <VscHeart size={24}/>
                    </button>
                    <Link to={`/trip/${trip._id}/edit`} className="hero-edit-button" style={{ backgroundColor: COLORS.primary }}>
                        <VscEdit size={24} />
                    </Link>
                </div>
                <div className="hero-content">
                    <h1 className="trip-title">{trip.destination}</h1>
                    <p className="trip-dates"><VscCalendar /> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
                </div>
            </header>
            
            <main className="trip-dashboard-grid">
                {trip.aiSummary && <AISummary summary={trip.aiSummary} />}
                
                <SmartSchedule schedule={trip.smartSchedule} tripId={trip._id} />

                <Itinerary itinerary={trip.itinerary} />
                
                {hasRecommendations && (
                    <Recommendations
                        attractions={trip.attractions}
                        food={trip.foodRecommendations}
                        accommodation={trip.accommodationSuggestions}
                    />
                )}
                
                <MembersWidget members={trip.group?.members} />

                <div className="dashboard-card">
                    <h3 className="card-title"><GiTakeMyMoney/> Budget Overview</h3>
                    <p>Total Budget: {trip.budget?.total} {trip.budget?.currency}</p>
                    {/* Add a progress bar or chart here */}
                </div>
            </main>
        </div>
    );
};