import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    VscHome, VscAdd, VscArrowLeft, VscMail, VscOrganization, VscShare, VscSignOut,
    VscLocation, VscCalendar, VscMilestone, VscChecklist, VscFile, VscClose
} from "react-icons/vsc";
import { GiWavyItinerary, GiTakeMyMoney } from "react-icons/gi";
import { IoMdChatbubbles, IoMdSend } from "react-icons/io";
import { IoPeopleSharp } from "react-icons/io5";
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/axiosInstance';
import Dock from '../../components/Dock';
import './Details.css';

const COLORS = {
    primary: '#edafb8', secondary: '#f7e1d7', background: '#dedbd2',
    accent: '#b0c4b1', text: '#4a5759',
};
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const HomeView = ({ trip, t, setActiveModal }) => {
    const getDaysRemaining = () => {
        if (!trip?.startDate) return 'N/A';
        const tripDate = new Date(trip.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        tripDate.setHours(0, 0, 0, 0);

        const diffTime = tripDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Trip Over';
        if (diffDays === 0) return 'Today!';
        return `${diffDays} days`;
    };

    const currentWeather = trip?.weather?.forecast?.[0];

    return (
        <div className="overview-grid">
            <div className="overview-card">
                <h4>{t('tripDetails:overview.countdownTitle')}</h4>
                <div className="countdown">
                    <span>{getDaysRemaining()}</span>
                </div>
            </div>
            <div className="overview-card">
                <h4>{t('tripDetails:overview.weatherTitle')}{trip?.destination}</h4>
                {currentWeather ? (
                    <div className="weather">
                        <div className="weather-temp">{Math.round(currentWeather.temp)}°C</div>
                        <p>{currentWeather.condition}</p>
                    </div>
                ) : (
                    <p>Weather data not available.</p>
                )}
            </div>
            <div className="overview-card full-width">
                <h4>{t('tripDetails:overview.quickActionsTitle')}</h4>
                <div className="quick-actions">
                    <button className="action-button" style={{ backgroundColor: COLORS.accent }} onClick={() => setActiveModal('itinerary')}>{t('tripDetails:overview.viewItinerary')}</button>
                    <button className="action-button" style={{ backgroundColor: COLORS.accent }} onClick={() => setActiveModal('budget')}>{t('tripDetails:overview.manageBudget')}</button>
                    <button className="action-button" style={{ backgroundColor: COLORS.accent }} onClick={() => setActiveModal('checklist')}>{t('tripDetails:overview.seeChecklist')}</button>
                </div>
            </div>
        </div>
    );
};

// A new component for the summary bar
const TripSummaryBar = ({ trip, t }) => {
    const fastestRoute = trip?.routeInfo?.fastest
        ? `${trip.routeInfo.fastest.mode} (${trip.routeInfo.fastest.duration})`
        : 'N/A';

    const budgetValue = trip?.budget?.total
        ? `${trip.budget.currency || 'USD'} ${trip.budget.total.toLocaleString()}`
        : 'N/A';
    const summaryItems = [
        {
            icon: <IoPeopleSharp />,
            label: t('tripDetails:summary.travelers'),
            value: trip.travelers
        },
        {
            icon: <GiTakeMyMoney />,
            label: t('tripDetails:summary.budget'),
            value: budgetValue
        },
        {
            icon: <VscMilestone />,
            label: t('tripDetails:summary.fastestRoute'),
            value: fastestRoute
        },
        {
            icon: <VscChecklist />,
            label: t('tripDetails:summary.alerts'),
            value: trip.alerts.length > 0 ? `${trip.alerts.length} Active` : 'None'
        }
    ];

    return (
        <div className="trip-summary-bar">
            {summaryItems.map((item, index) => (
                <div className="summary-item" key={index}>
                    <div className="summary-icon">{item.icon}</div>
                    <div className="summary-text">
                        <span className="summary-label">{item.label}</span>
                        <span className="summary-value">{item.value}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};


export default function TripDetails() {
    const { t } = useTranslation(['tripDetails', 'common']);
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeModal, setActiveModal] = useState(null);


    const fetchTripData = useCallback(async () => {
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!id || !mongoIdRegex.test(id)) {
            setError('Invalid Trip ID format. Please check the URL.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/trips/${id}`);

            setTrip(response.data.data.trip);

            setError('');
        } catch (err) {
            if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                setError(err.response?.data?.message || 'Failed to fetch trip details.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (id) {
            fetchTripData();
        }
    }, [id, fetchTripData]);

    const Modal = ({ children, onClose, title, size = 'medium' }) => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`modal-content modal-${size}`}
                style={{ backgroundColor: COLORS.secondary, color: COLORS.text }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header" style={{ borderBottomColor: COLORS.accent }}>
                    <h2 className="modal-title">{title}</h2>
                    <button onClick={onClose} className="modal-close-button" style={{ color: COLORS.primary }}><VscClose size={24} /></button>
                </div>
                <div className="modal-body">{children}</div>
            </motion.div>
        </motion.div>
    );


    const ItineraryView = ({ itinerary = [] }) => (
        <div className="itinerary-container">
            <div className="timeline">
                {itinerary.length > 0 ? itinerary.map((item, index) => (
                    <div className="timeline-item" key={item._id || index}>
                        <div className="timeline-icon" style={{ backgroundColor: COLORS.accent }}><VscMilestone /></div>
                        <div className="timeline-card">
                            <div className="card-header"><strong>{item.title}</strong></div>
                            <div className="card-body"><p>{item.activities.join(', ')}</p></div>
                        </div>
                    </div>
                )) : <p>No itinerary items yet.</p>}
            </div>
            <button className="action-button primary" style={{ backgroundColor: COLORS.primary }}><VscAdd /> {t('tripDetails:itinerary.addEvent')}</button>
        </div>
    );

    const BudgetView = ({ trip }) => {
        const [expenses, setExpenses] = useState([]);
        const [loadingExpenses, setLoadingExpenses] = useState(true);
        const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
        const [message, setMessage] = useState('');

        useEffect(() => {
            const fetchExpenses = async () => {
                setLoadingExpenses(true);
                try {
                    const { data } = await api.get(`/trips/${trip._id}/expenses`);
                    setExpenses(data.expenses || []);
                } catch (err) {
                    console.error("Failed to fetch expenses", err);
                    setMessage('Could not load expenses.');
                } finally {
                    setLoadingExpenses(false);
                }
            };
            if (trip?._id) fetchExpenses();
        }, [trip?._id]);

        const handleAddExpense = async (e) => {
            e.preventDefault();
            if (!newExpense.description || !newExpense.amount) {
                setMessage('Please fill out all fields.');
                return;
            }
            const paidByUser = trip.group.members.find(m => m.userId._id === trip.group.members[0].userId._id); // Simple logic: first member pays
            if (!paidByUser) {
                setMessage('Cannot add expense: No organizer found for this trip.');
                return;
            }
            try {
                const payload = {
                    ...newExpense,
                    paidBy: paidByUser.userId._id,
                    participants: trip.group.members.map(m => ({ userId: m.userId._id, share: parseFloat(newExpense.amount) / trip.group.members.length }))
                };
                const response = await api.post(`/trips/${trip._id}/expenses`, payload); //
                setExpenses(prev => [...prev, response.data]);
                setNewExpense({ description: '', amount: '' });
                setMessage('Expense added successfully!');
            } catch (err) {
                setMessage(err.response?.data?.message || 'Failed to add expense.');
            }
        };

        const totalSpent = expenses.reduce((sum, ex) => sum + ex.amount, 0);

        return (
            <div>
                <div className="budget-summary">
                    <div className="budget-card spent"><h4>{t('tripDetails:budget.spent')}</h4><p>${totalSpent.toFixed(2)}</p></div>
                </div>
                <h4 className="section-title">{t('tripDetails:budget.addExpenseTitle')}</h4>
                <form className="expense-form" onSubmit={handleAddExpense}>
                    <input type="text" placeholder={t('tripDetails:budget.expenseNamePlaceholder')} value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                    <input type="number" placeholder={t('tripDetails:budget.amountPlaceholder')} value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                    <button type="submit" className="action-button" style={{ backgroundColor: COLORS.accent }}>{t('common:general.add')}</button>
                </form>
                {message && <p>{message}</p>}
                <h4 className="section-title">Expenses</h4>
                {loadingExpenses ? <p>Loading expenses...</p> : (
                    <ul>
                        {expenses.map(ex => <li key={ex._id}>{ex.description}: ${ex.amount.toFixed(2)}</li>)}
                    </ul>
                )}
            </div>
        );
    };

    // MapView remains the same as it was generally correct
    const MapView = ({ trip }) => {
        const [selectedPin, setSelectedPin] = useState(null);

        // Guard against missing data
        if (!MAPBOX_TOKEN) return <div className="map-container">Mapbox token missing.</div>;
        if (!trip?.destinationCoordinates?.lat) return <div className="map-container">Destination coordinates not available.</div>;

        const pointsOfInterest = useMemo(() => {
            const allPoints = [
                { ...trip.destinationCoordinates, name: trip.destination }
            ];

            if (trip.attractions) {
                trip.attractions.forEach(attraction => {
                    if (attraction.geometry?.location) {
                        allPoints.push({
                            lat: attraction.geometry.location.lat,
                            lon: attraction.geometry.location.lng,
                            name: attraction.name
                        });
                    }
                });
            }
            return allPoints;
        }, [trip]);

        // Calculate the bounding box to fit all points of interest
        const bounds = useMemo(() => {
            if (pointsOfInterest.length === 0) return null;

            const longitudes = pointsOfInterest.map(p => p.lon);
            const latitudes = pointsOfInterest.map(p => p.lat);

            return [
                [Math.min(...longitudes), Math.min(...latitudes)],
                [Math.max(...longitudes), Math.max(...latitudes)]
            ];
        }, [pointsOfInterest]);

        return (
            <div className="map-container" style={{ width: '100%', height: '50vh', minHeight: '400px', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                        bounds: bounds,
                        fitBoundsOptions: {
                            padding: 60
                        }
                    }}
                    mapStyle="mapbox://styles/mapbox/outdoors-v12"
                    style={{ width: '100%', height: '100%' }}
                >
                    <NavigationControl position="top-right" />

                    {/* Map over all points to create a marker for each */}
                    {pointsOfInterest.map((point, index) => (
                        <Marker key={`marker-${index}`} longitude={point.lon} latitude={point.lat}>
                            <button
                                className="marker-btn"
                                onClick={e => {
                                    e.preventDefault();
                                    setSelectedPin(point);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <VscLocation size={30} color={COLORS.primary} />
                            </button>
                        </Marker>
                    ))}

                    {selectedPin && (
                        <Popup
                            longitude={selectedPin.lon}
                            latitude={selectedPin.lat}
                            onClose={() => setSelectedPin(null)}
                            anchor="top"
                            closeOnClick={false}
                        >
                            <div>{selectedPin.name}</div>
                        </Popup>
                    )}
                </Map>
            </div>
        );
    };

    const MembersView = ({ members = [], id, onUpdate }) => {
    const { t } = useTranslation('tripDetails');
    const [inviteLink, setInviteLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleGenerateInvite = async () => {
        setMessage('');
        setIsLoading(true);
        try {
            const { data } = await api.post(`/trips/${id}/generate-invite`);
            setInviteLink(data.data.inviteLink);
            setMessage('Link generated! Copy and share it with your friends.');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to generate invite link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setMessage('Link copied to clipboard!');
    };

    return (
        <div className="members-container">
            <div className="members-header">
                <p className="invite-description">{t('members.inviteDescription')}</p>
                <button
                    className="action-button primary-outline"
                    style={{ borderColor: COLORS.primary, color: COLORS.primary }}
                    onClick={handleGenerateInvite}
                    disabled={isLoading}
                >
                    {isLoading ? t('members.generating') : <><VscShare /> {t('members.generateLink')}</>}
                </button>
            </div>

            {/* Display the generated link and copy button */}
            {inviteLink && (
                <div className="invite-link-container">
                    <input type="text" readOnly value={inviteLink} className="invite-link-input" />
                    <button onClick={handleCopyToClipboard} className="action-button">{t('members.copyLink')}</button>
                </div>
            )}

            {message && <p className="invite-message">{message}</p>}

            <h4 className="section-title">{t('members.title')}</h4>
            <ul className="members-list">
                {members
                    .filter(member => member.userId && member.userId.name)
                    .map(member => (
                        <li className="member-item" key={member.userId._id}>
                            <img src={member.userId.profileImage || `https://placehold.co/50x50/B0C4B1/4A5759?text=${member.userId.name.charAt(0)}`} alt={member.userId.name} />
                            <div className="member-info"><strong>{member.userId.name}</strong><p>{member.userId.email}</p></div>
                            <div className="member-role"><VscOrganization /> {member.role}</div>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

    const ChatView = ({ id }) => {
        const [messages, setMessages] = useState([]);
        const [newMessage, setNewMessage] = useState('');

        const fetchMessages = useCallback(async () => {
            try {
                const response = await api.get(`/messages/session/${id}`); //
                setMessages(response.data.messages);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        }, [id]);

        useEffect(() => {
            if (id) {
                fetchMessages();
                const interval = setInterval(fetchMessages, 5000);
                return () => clearInterval(interval);
            }
        }, [id, fetchMessages]);

        const handleSendMessage = async (e) => {
            e.preventDefault();
            if (!newMessage.trim()) return;
            try {
                await api.post(`/messages/session/${id}/text`, { content: newMessage });
                setNewMessage('');
                fetchMessages(); // Re-fetch immediately after sending
            } catch (err) {
                console.error("Failed to send message", err);
            }
        };

        return (
            <div className="chat-container">
                <div className="chat-messages">
                    {messages.length > 0 ? messages.map(msg => (
                        <div key={msg._id} className="chat-message">
                            <strong>{msg.sender?.name || 'User'}: </strong>{msg.text}
                        </div>
                    )) : <p>No messages yet. Start the conversation!</p>}
                </div>
                <form className="chat-input-area" onSubmit={handleSendMessage}>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t('tripDetails:chat.messagePlaceholder')} className="chat-input" />
                    <button type="submit" className="send-button" style={{ backgroundColor: COLORS.text }}><IoMdSend /></button>
                </form>
            </div>
        );
    };

    const dockItems = useMemo(() => [
        { id: 'home', icon: <VscHome size={22} />, label: t('tripDetails:dock.overview'), onClick: () => setActiveModal('home') },
        { id: 'itinerary', icon: <GiWavyItinerary size={22} />, label: t('tripDetails:dock.itinerary'), onClick: () => setActiveModal('itinerary') },
        { id: 'budget', icon: <GiTakeMyMoney size={22} />, label: t('tripDetails:dock.budget'), onClick: () => setActiveModal('budget') },
        { id: 'map', icon: <VscLocation size={22} />, label: t('tripDetails:dock.map'), onClick: () => setActiveModal('map') },
        { id: 'documents', icon: <VscFile size={22} />, label: t('tripDetails:dock.documents'), onClick: () => setActiveModal('documents') },
        { id: 'checklist', icon: <VscChecklist size={22} />, label: t('tripDetails:dock.checklist'), onClick: () => setActiveModal('checklist') },
        { id: 'members', icon: <IoPeopleSharp size={22} />, label: t('tripDetails:dock.members'), onClick: () => setActiveModal('members') },
        { id: 'chat', icon: <IoMdChatbubbles size={22} />, label: t('tripDetails:dock.chat'), onClick: () => setActiveModal('chat') },
    ], [t]);

    const renderModalContent = () => {
        if (!activeModal || !trip) return null;
        const activeItem = dockItems.find(item => item.id === activeModal);

        let content, size;
        switch (activeModal) {
            case 'home': content = <HomeView trip={trip} t={t} setActiveModal={setActiveModal} />; size = 'large'; break;
            case 'itinerary': content = <ItineraryView itinerary={trip.itinerary} />; break;
            case 'budget': content = <BudgetView trip={trip} />; break;
            case 'map':
                content = <MapView trip={trip} />; // Pass the full trip object
                size = 'large';
                break;
            case 'members': content = <MembersView members={trip.group.members} id={trip._id} onUpdate={fetchTripData} />; break;
            case 'chat': content = <ChatView id={trip._id} />; break;
            case 'documents': content = <div>Document management coming soon.</div>; break;
            case 'checklist': content = <div>Checklist coming soon.</div>; break;
            default: content = <div>Content for {activeItem.label}</div>;
        }

        return <Modal onClose={() => setActiveModal(null)} title={activeItem.label} size={size}>{content}</Modal>;
    };

    if (loading) return <div className="loading-screen">Loading Trip...</div>;
    if (error) return <div className="error-screen">{error}</div>;

    return (
        <div className="trip-details-page" style={{ backgroundColor: COLORS.background }}>
            <Link to="/dashboard" className="back-to-dash"><VscArrowLeft /> {t('tripDetails:backToDashboard')}</Link>
            {trip && (
                <>
                    <header className="trip-hero">
                        <img src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80'} alt={trip.destination} className="hero-bg-image" />
                        <div className="hero-overlay"></div>
                        <div className="hero-content">
                            <h1 className="trip-title">{trip.destination}</h1>
                            <p className="trip-dates"><VscCalendar /> {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p>
                            <div className="hero-actions">
                                <button className="hero-button"><VscShare /> {t('tripDetails:shareTrip')}</button>
                                <button className="hero-button primary" style={{ backgroundColor: COLORS.primary }}><VscSignOut style={{ transform: 'rotate(90deg)' }} /> {t('tripDetails:getDirections')}</button>
                            </div>
                        </div>
                    </header>
                    <TripSummaryBar trip={trip} t={t} />
                </>
            )}

            <AnimatePresence>
                {renderModalContent()}
            </AnimatePresence>

            <Dock items={dockItems} baseItemSize={50} magnification={70} />
        </div>
    );
};