import React, { useState, useEffect, useMemo, useCallback,useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import { useAuth } from '../../context/AuthContext';
import 'mapbox-gl/dist/mapbox-gl.css';
import { socket } from '../../utils/socket';
import {
    VscHome, VscAdd, VscArrowLeft, VscMail, VscOrganization, VscShare, VscSignOut,
    VscLocation, VscCalendar, VscMilestone, VscChecklist, VscFile, VscClose, VscEdit, VscHeart, VscTrash, VscEllipsis,VscSparkle
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

    const [isFavorite, setIsFavorite] = useState(false);
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
            setIsFavorite(response.data.data.trip.favorite);

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

    const handleToggleFavorite = async () => {
        setIsFavorite(prev => !prev);
        try {
            await api.patch(`/trips/${id}/favorite`);
        } catch (err) {
            setIsFavorite(prev => !prev);
            console.error("Failed to update favorite status", err);
        }
    };


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
        const { user } = useAuth();
        const [inviteLink, setInviteLink] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [message, setMessage] = useState('');
        const [activeMenu, setActiveMenu] = useState(null);

        const tripOwner = members.find(m => m.role === 'owner')?.userId;
        const isOwner = user?.id === tripOwner?._id;

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

        const handleRemoveMember = async (memberId) => {
            if (window.confirm('Are you sure you want to remove this member?')) {
                try {
                    await api.delete(`/trips/${id}/members/${memberId}`);
                    onUpdate();
                    setMessage('Member removed successfully.');
                } catch (err) {
                    setMessage(err.response?.data?.message || 'Failed to remove member.');
                }
            }
        };

        const handleUpdateRole = async (memberId, newRole) => {
            try {
                await api.patch(`/trips/${id}/members/${memberId}/role`, { role: newRole });
                onUpdate();
                setMessage('Member role updated.');
            } catch (err) {
                setMessage(err.response?.data?.message || 'Failed to update role.');
            }
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
                                <img src={member.userId.profileImage || `https://placehold.co/50x50/B0C4B1/4A5759?text=${member.userId.name.charAt(0)}`} alt={member.userId.name}  loading="lazy" decoding="async"/>
                                <div className="member-info"><strong>{member.userId.name}</strong><p>{member.userId.email}</p></div>
                                <div className="member-role"><VscOrganization /> {member.role}</div>
                                {isOwner && member.role !== 'owner' && (
                                    <div className="member-actions">
                                        <button onClick={() => setActiveMenu(activeMenu === member.userId._id ? null : member.userId._id)}>
                                            <VscEllipsis />
                                        </button>
                                        {activeMenu === member.userId._id && (
                                            <div className="member-menu">
                                                <button onClick={() => handleUpdateRole(member.userId._id, 'editor')}>Set as Editor</button>
                                                <button onClick={() => handleUpdateRole(member.userId._id, 'viewer')}>Set as Viewer</button>
                                                <div className="menu-divider"></div>
                                                <button className="remove" onClick={() => handleRemoveMember(member.userId._id)}>
                                                    <VscTrash /> Remove Member
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                </ul>
            </div>
        );
    };

const ChatWindow = ({ userLocation }) => {
    const { t } = useTranslation('aiAssistant');
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [tripSummary, setTripSummary] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const getAiSession = async () => {
            try {
                const response = await api.post('/chat/sessions/ai');
                setSessionId(response.data.data.sessionId);
            } catch (error) {
                console.error("Could not get AI chat session:", error);
                setMessages([{ id: crypto.randomUUID(), text: t('errorMessage'), sender: 'ai', isError: true }]);
                setIsLoading(false);
            }
        };
        getAiSession();
    }, [t]);

    useEffect(() => {
        const handleTripCreated = (data) => {
            setIsTyping(false);
            const successMessage = {
                id: crypto.randomUUID(),
                text: data.reply,
                sender: 'ai'
            };
            setMessages(prev => [...prev, successMessage]);
            setTripSummary(data.summary);
        };

        const handleTripError = (data) => {
            setIsTyping(false);
            const errorMessage = {
                id: crypto.randomUUID(),
                text: data.reply,
                sender: 'ai',
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        };

        socket.on('tripCreated', handleTripCreated);
        socket.on('tripCreationError', handleTripError);

        return () => {
            socket.off('tripCreated', handleTripCreated);
            socket.off('tripCreationError', handleTripError);
        };
    }, []);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && (lastMessage.sender === 'ai' || lastMessage.type === 'ai')) {
            setIsTyping(true);
            const timer = setTimeout(() => {
                setIsTyping(false);
                scrollToBottom();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    const fetchHistory = useCallback(async (pageNum) => {
        if (!sessionId) return;

        setIsFetchingHistory(true);
        const container = messagesContainerRef.current;
        const previousScrollHeight = container ? container.scrollHeight : 0;

        try {
            const response = await api.get(`/messages/session/${sessionId}?page=${pageNum}&limit=20`);
            const { messages: newMessages, totalPages } = response.data.data;

            if (newMessages.length === 0) {
                setHasMore(false);
                if (pageNum === 1)
                    setMessages([
                        {
                            id: crypto.randomUUID(),
                            sender: 'ai',
                            text: "Hi! I'm WayMate, your personal travel assistant. How can I help you plan your next adventure today?",
                            createdAt: new Date().toISOString()
                        }
                    ]);
                return;
            }

            setMessages(prev => pageNum === 1 ? newMessages.reverse() : [...newMessages.reverse(), ...prev]);

            if (container && pageNum > 1) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight - previousScrollHeight;
                });
            }

            if (pageNum >= totalPages) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to fetch chat history:", error);
        } finally {
            setIsFetchingHistory(false);
            if (pageNum === 1) setIsLoading(false);
        }
    }, [sessionId]); // The ONLY dependency should be sessionId.

    // Effect for the initial fetch - this is now stable
    useEffect(() => {
        if (sessionId && !isFetchingHistory) { // Check isFetchingHistory here
            fetchHistory(1);
        }
    }, [sessionId, fetchHistory]);


    useEffect(() => {
        const container = messagesContainerRef.current;
        const handleScroll = () => {
            // Check isFetchingHistory HERE
            if (container.scrollTop === 0 && hasMore && !isFetchingHistory) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchHistory(nextPage);
                    return nextPage;
                });
            }
        };
        if (container) container.addEventListener('scroll', handleScroll);
        return () => {
            if (container) container.removeEventListener('scroll', handleScroll);
        };
    }, [hasMore, isFetchingHistory, fetchHistory]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === '' || isTyping) return;

        const newUserMessage = {
            clientId: crypto.randomUUID(),
            text: inputValue,
            sender: 'user',
            type: 'user'
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await api.post('/chat/message', { /* ... */ });
            const aiResponse = response.data.data;

            // Only add immediate AI replies for non-trip-creation steps
            if (aiResponse.reply.includes("Give me a moment") === false) {
                const aiResponseMessage = { /* ... */ };
                setMessages(prev => [...prev, aiResponseMessage]);
                setIsTyping(false); // Stop typing for simple replies
            }
            // If it IS a trip creation, we do nothing here and let the WebSocket handler take over.

        } catch (error) {
            console.error("Error sending message to AI:", error);
            const errorResponse = { /* ... */ };
            setMessages(prev => [...prev, errorResponse]);
            setIsTyping(false);
        }
    };

    if (isLoading) {
        return <div className="loading-history">Initializing Assistant...</div>;
    }

    return (
        <div className="chat-window">
            <div className="messages-container">
                {isFetchingHistory && <div className="history-loader">Loading older messages...</div>}
                {messages.map((msg, index) => {
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];
                    const senderType = msg.sender === 'user' || msg.type === 'user' ? 'user' : 'ai';

                    // Logic to determine if the message is part of a group
                    const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender;
                    const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender;

                    // Add a class for grouped messages to adjust border-radius
                    let bubbleClass = '';
                    if (!isFirstInGroup && !isLastInGroup) bubbleClass = 'middle';
                    else if (!isFirstInGroup) bubbleClass = 'last';
                    else if (!isLastInGroup) bubbleClass = 'first';

                    return (
                        <div
                            key={msg._id || msg.clientId || msg.id}
                            className={`message-bubble-wrapper ${senderType}-message`}
                        >
                            {/* Show avatar only for the last message in a group */}
                            {isLastInGroup && (
                                <div className={`avatar ${senderType}-avatar`}>
                                    {senderType === 'ai' ? <VscSparkle /> : 'U'}
                                </div>
                            )}
                            <div className="message-content">
                                <div className={`message-bubble ${bubbleClass} ${msg.isError ? 'error-bubble' : ''}`}>
                                    {msg.text}
                                </div>
                                {/* Show timestamp only for the last message in a group */}
                                {isLastInGroup && (
                                    <span className="message-timestamp">
                                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }
                )}

                {/* Render the trip summary card if it exists */}
                {tripSummary && (
                    <div className="message-bubble-wrapper ai-message">
                        <div className="trip-summary-card">
                            <img src={tripSummary.coverImage} alt={tripSummary.destination} className="trip-card-image" loading="lazy" decoding="async" />
                            <div className="trip-card-content">
                                <h4>Your Trip to {tripSummary.destination}</h4>
                                <p>{tripSummary.weatherSummary}</p>
                                <Link to={`/trip/${tripSummary._id}`} className="view-trip-button">
                                    View Full Plan
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Render the typing indicator when the AI is processing */}
                {isTyping && (
                    <div className="message-bubble-wrapper ai-message">
                        <div className="message-bubble typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder={t('inputPlaceholder')}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isTyping || isLoading}
                />
                <button
                    type="submit"
                    className="send-button"
                    style={{ backgroundColor: COLORS.text }}
                    disabled={isTyping || isLoading || inputValue.trim() === ''}
                >
                    <IoMdSend />
                </button>
            </form>
        </div>
    );
}


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
            case 'chat': content = <ChatWindow id={trip._id} />; break;
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
                        <img src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80'} alt={trip.destination} className="hero-bg-image"  loading="lazy" decoding="async"/>
                        <div className="hero-overlay"></div>
                        <div className="hero-top-actions">
                            <button
                                className={`hero-favorite-button ${isFavorite ? 'active' : ''}`}
                                onClick={handleToggleFavorite}
                            >
                                <VscHeart />
                            </button>
                            <Link to={`/trip/${trip._id}/edit`} className="hero-edit-button" style={{ backgroundColor: COLORS.primary }}>
                                <VscEdit size={24} />
                            </Link>
                        </div>
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