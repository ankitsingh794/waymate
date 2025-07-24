import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Map, { Marker } from 'react-map-gl/mapbox';
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
import Dock from '../../components/dock';
import './Details.css';

const COLORS = {
    primary: '#edafb8', secondary: '#f7e1d7', background: '#dedbd2',
    accent: '#b0c4b1', text: '#4a5759',
};
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function TripDetails() {
    const { t } = useTranslation(['tripDetails', 'common']);
    const { tripId } = useParams(); 
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeModal, setActiveModal] = useState(null);

    const fetchTripData = useCallback(async () => {
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!mongoIdRegex.test(tripId)) {
            setError('Invalid Trip ID format. Please check the URL.');
            setLoading(false);
            return; 
        }

        setLoading(true);
        try {
            const { data } = await api.get(`/trips/${tripId}`);
            setTrip(data);
            setError('');
        } catch (err) {
            if (err.response && err.response.status === 401) {
                 navigate('/login'); 
            } else {
                setError('Failed to fetch trip details. The trip may not exist or you may not have permission to view it.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [tripId, navigate]);

    useEffect(() => {
        if (tripId) {
            fetchTripData();
        }
    }, [tripId, fetchTripData]);

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

    const HomeView = () => (
        <div className="overview-grid">
            <div className="overview-card"><h4>{t('tripDetails:overview.countdownTitle')}</h4><p>Details coming soon.</p></div>
            <div className="overview-card"><h4>{t('tripDetails:overview.weatherTitle')}</h4><p>Weather data coming soon.</p></div>
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

    const ItineraryView = ({ itinerary = [] }) => (
        <div className="itinerary-container">
            <div className="timeline">
                {itinerary.length > 0 ? itinerary.map(item => (
                    <div className="timeline-item" key={item._id}>
                        <div className="timeline-icon"><VscMilestone /></div>
                        <div className="timeline-card">
                            <div className="card-header"><strong>{item.title}</strong><span className="card-time">{new Date(item.startTime).toLocaleTimeString()}</span></div>
                            <div className="card-body"><p>{item.description}</p></div>
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
            fetchExpenses();
        }, [trip._id]);
        
        const handleAddExpense = async (e) => {
            e.preventDefault();
            if (!newExpense.description || !newExpense.amount) {
                setMessage('Please fill out all fields.');
                return;
            }
            const organizer = trip.members.find(m => m.role === 'organizer');
            if (!organizer) {
                setMessage('Cannot add expense: No organizer found for this trip.');
                return;
            }
            try {
                const payload = {
                    ...newExpense,
                    paidBy: organizer.userId._id,
                    participants: trip.members.map(m => ({ userId: m.userId._id, share: parseFloat(newExpense.amount) / trip.members.length }))
                };
                const { data } = await api.post(`/trips/${trip._id}/expenses`, payload);
                setExpenses(prev => [...prev, data]);
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
                    <input type="text" placeholder={t('tripDetails:budget.expenseNamePlaceholder')} value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                    <input type="number" placeholder={t('tripDetails:budget.amountPlaceholder')} value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
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

    const MapView = ({ destination }) => {
        const [viewport, setViewport] = useState({ latitude: 48.8566, longitude: 2.3522, zoom: 11 });
        const [marker, setMarker] = useState({ latitude: 48.8566, longitude: 2.3522 });
        const [mapError, setMapError] = useState('');

        useEffect(() => {
            if (!destination) return;
            const fetchCoordinates = async () => {
                setMapError('');
                try {
                    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_TOKEN}`);
                    if (!response.ok) throw new Error('Network response was not ok.');
                    const data = await response.json();
                    if (data.features && data.features.length > 0) {
                        const [longitude, latitude] = data.features[0].center;
                        setViewport(vp => ({ ...vp, longitude, latitude, zoom: 14 }));
                        setMarker({ longitude, latitude });
                    } else {
                        throw new Error(`Could not find location: ${destination}`);
                    }
                } catch (err) {
                    setMapError(err.message);
                    console.error("Failed to fetch coordinates:", err);
                }
            };
            fetchCoordinates();
        }, [destination]);

        if (!MAPBOX_TOKEN) return <div className="map-container">Mapbox token missing.</div>;
        if (mapError) return <div className="map-container">Error: {mapError}</div>;

        return (
            <div className="map-container" style={{ width: '100%', height: '400px', borderRadius: '0.75rem' }}>
                <Map {...viewport} mapboxAccessToken={MAPBOX_TOKEN} onMove={evt => setViewport(evt.viewState)} mapStyle="mapbox://styles/mapbox/streets-v11">
                    <Marker longitude={marker.longitude} latitude={marker.latitude} color={COLORS.primary} />
                </Map>
            </div>
        );
    };

    const MembersView = ({ members = [], tripId, onUpdate }) => {
        const [inviteEmail, setInviteEmail] = useState('');
        const [isInviting, setIsInviting] = useState(false);
        const [message, setMessage] = useState('');

        const handleInvite = async (e) => {
            e.preventDefault();
            setMessage('');
            setIsInviting(true);
            try {
                await api.post(`/trips/${tripId}/invite`, { email: inviteEmail });
                setMessage(`Invitation sent to ${inviteEmail}`);
                setInviteEmail('');
                onUpdate(); 
            } catch (err) {
                setMessage(err.response?.data?.message || 'Failed to send invitation.');
            } finally {
                setIsInviting(false);
            }
        };

        return (
            <div className="members-container">
                <form className="members-header" onSubmit={handleInvite}>
                    <div className="search-members"><VscMail /><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder={t('tripDetails:members.invitePlaceholder')} required/></div>
                    <button type="submit" className="action-button primary-outline" style={{ borderColor: COLORS.primary, color: COLORS.primary }} disabled={isInviting}>
                        {isInviting ? 'Inviting...' : <><VscAdd /> {t('common:general.invite')}</>}
                    </button>
                </form>
                {message && <p style={{textAlign: 'center', margin: '10px 0'}}>{message}</p>}
                <ul className="members-list">
                    {members.map(member => (
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

    const ChatView = ({ tripId }) => {
        const [messages, setMessages] = useState([]);
        const [newMessage, setNewMessage] = useState('');

        const fetchMessages = useCallback(async () => {
            try {
                const { data } = await api.get(`/messages/session/${tripId}`);
                setMessages(data);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        }, [tripId]);

        useEffect(() => {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000); 
            return () => clearInterval(interval); 
        }, [fetchMessages]);

        const handleSendMessage = async (e) => {
            e.preventDefault();
            if (!newMessage.trim()) return;
            try {
                await api.post('/chat/message', { tripId, content: newMessage });
                setNewMessage('');
                fetchMessages();
            } catch (err) {
                console.error("Failed to send message", err);
            }
        };

        return (
            <div className="chat-container">
                <div className="chat-messages">
                    {messages.length > 0 ? messages.map(msg => (
                         <div key={msg._id} className="chat-message">
                             <strong>{msg.sender?.name || 'User'}: </strong>{msg.content}
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
            case 'home': content = <HomeView />; size = 'large'; break;
            case 'itinerary': content = <ItineraryView itinerary={trip.itinerary} />; break;
            case 'budget': content = <BudgetView trip={trip} />; break;
            case 'map': content = <MapView destination={trip.destination} />; size = 'large'; break;
            case 'members': content = <MembersView members={trip.members} tripId={trip._id} onUpdate={fetchTripData} />; break;
            case 'chat': content = <ChatView tripId={trip._id} />; break;
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
                <header className="trip-hero">
                    <img src={trip.imageUrl || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80'} alt={trip.destination} className="hero-bg-image" />
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
            )}

            <AnimatePresence>
                {activeModal && renderModalContent()}
            </AnimatePresence>

            <Dock items={dockItems} baseItemSize={50} magnification={70} />
        </div>
    );
};
