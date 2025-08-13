import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VscArrowLeft, VscSparkle, VscLoading, VscCalendar, VscTag, VscError } from "react-icons/vsc";
import { IoMdSend } from "react-icons/io";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './AIAssistant.css';
import { getSocket } from '../../utils/socketManager';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';

const COLORS = {
    primary: '#edafb8',
    secondary: '#f7e1d7',
    background: '#dedbd2',
    accent: '#b0c4b1',
    text: '#4a5759',
};

const useGeolocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        const handleSuccess = (position) => {
            setLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        };
        const handleError = (error) => {
            setError(`Error getting location: ${error.message}`);
        };
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
    }, []);

    return { location, error };
};

const Navbar = () => {
    const { t } = useTranslation('aiAssistant');
    return (
        <nav className="ai-nav" style={{ backgroundColor: COLORS.secondary }}>
            <div className="ai-nav-content">
                <Link to="/dashboard" className="ai-nav-back" style={{ color: COLORS.text }}>
                    <VscArrowLeft />
                    <span>{t('exit')}</span>
                </Link>
                <div className="ai-nav-title">
                    <VscSparkle style={{ color: COLORS.primary }} />
                    <h2>{t('title')}</h2>
                </div>
                <div className="ai-nav-placeholder"></div>
            </div>
        </nav>
    );
};

const MessageBubble = ({ msg, prevMsg, nextMsg }) => {
    const { user } = useAuth();

    if (msg.summary) {
        return (
            <div className="trip-card-wrapper">
                <TripSummaryCard summary={msg.summary} />
            </div>
        );
    }


    const isUser = msg.sender === user?._id || msg.type === 'user';
    const senderInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
    const isSameSenderAsNext = nextMsg && nextMsg.sender === msg.sender;
    const isSameSenderAsPrev = prevMsg && prevMsg.sender === msg.sender;

    const showAvatar = !isSameSenderAsNext;

    let bubblePosClass = '';
    if (isSameSenderAsPrev && isSameSenderAsNext) bubblePosClass = 'middle';
    else if (isSameSenderAsPrev) bubblePosClass = 'last';
    else if (isSameSenderAsNext) bubblePosClass = 'first';

    const wrapperClass = isUser ? 'message-bubble-wrapper user-message' : 'message-bubble-wrapper ai-message';

    return (
        <div className={wrapperClass}>
            <div className="avatar-container">
                {showAvatar && (
                    <div className={`avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
                        {isUser ? senderInitial : <VscSparkle />}
                    </div>
                )}
            </div>
            <div className="message-content">
                <div className={`message-bubble ${bubblePosClass}`}>
                    {msg.isError ? (
                        <span className="error-message"><VscError /> Error: {msg.text}</span>
                    ) : (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                </div>
                {!isSameSenderAsNext && (
                    <div className="message-timestamp">
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
        </div>
    );
};

const TripSummaryCard = ({ summary }) => {
    const { t } = useTranslation('dashboard');

    const formatDateRange = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const startMonth = startDate.toLocaleString('default', { month: 'short' });
        const endMonth = endDate.toLocaleString('default', { month: 'short' });

        if (startMonth === endMonth) {
            return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
        }
        return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
    };

    const calculateDuration = (start, end) => {
        const oneDay = 1000 * 60 * 60 * 24;
        const duration = Math.round(Math.abs((new Date(end) - new Date(start)) / oneDay)) + 1;
        return `${duration}-Day Trip`;
    };

    return (
        <div className="trip-summary-card" style={{ backgroundImage: `url(${summary.coverImage})` }}>
            <div className="trip-summary-overlay-content">
                <div className="trip-summary-header">
                    <h4 className="trip-summary-title">{summary.destinationName}</h4>
                    <p className="trip-summary-duration">{calculateDuration(summary.dates.start, summary.dates.end)}</p>
                </div>

                <div className="trip-summary-details">
                    <p><VscCalendar /> {formatDateRange(summary.dates.start, summary.dates.end)}</p>
                </div>

                {summary.highlights && summary.highlights.length > 0 && (
                    <div className="trip-summary-highlights">
                        <VscTag />
                        <span>{summary.highlights.slice(0, 2).join(' • ')}</span>
                    </div>
                )}

                <Link to={`/trip/${summary._id}`} className="view-trip-button">{t('viewTrip')}</Link>
            </div>
        </div>
    );
};

const StatusBar = ({ text }) => (
    <div className="status-update-bar">
        <VscLoading className="spinner" />
        <span>{text}</span>
    </div>
);

const ChatWindow = ({ userLocation }) => {
    const { t } = useTranslation('aiAssistant');
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);

    const [suggestions, setSuggestions] = useState([]);
    const [allQueries] = useState([
        "Plan a 5-day trip to ",
        "Create a weekend getaway itinerary for ",
        "Find budget hotels in ",
        "What local food should I try in ",
        "Suggest top restaurants in ",
        "Find hidden gems in ",
        "Get weather forecast for ",
        "Are there any travel alerts for ",
        "Get a packing checklist for ",
        "/clear",
        "/help",
    ]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        if (value.length > 0) {
            const filtered = allQueries.filter(q =>
                q.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInputValue(suggestion);
        setSuggestions([]);
    };

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const fetchHistory = useCallback(async (currentSessionId, pageToFetch = 1) => {
        if (!currentSessionId) return;

        if (pageToFetch > 1) {
            setIsLoadingMore(true);
        } else {
            setIsLoadingHistory(true);
        }

        try {
            const response = await api.get(`/messages/session/${currentSessionId}?page=${pageToFetch}&limit=30`);
            const { messages: fetchedMessages, currentPage, totalPages } = response.data.data;

            if (fetchedMessages.length > 0) {
                const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0;

                if (pageToFetch > 1) {
                    setMessages(prev => [...fetchedMessages, ...prev]);
                    requestAnimationFrame(() => {
                        if (messagesContainerRef.current) {
                            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - previousScrollHeight;
                        }
                    });
                } else {
                    setMessages(fetchedMessages);
                }
            } else if (pageToFetch === 1) {
                setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: t('initialMessage') }]);
            }

            setHasMoreHistory(currentPage < totalPages);

        } catch (error) {
            console.error("Failed to fetch chat history:", error);
            setMessages([{ id: crypto.randomUUID(), text: t('historyError'), sender: 'ai', isError: true }]);
        } finally {
            setIsLoadingHistory(false);
            setIsLoadingMore(false);
        }
    }, [t]);

    const HELP_MESSAGE = `
Hello! I'm your Waymate AI Assistant. Here's a quick guide to what I can do for you.

### Core Features
* **Plan a Trip:** Start planning a multi-day trip from scratch. Just tell me where and when you want to go!
    > _"Plan a 5-day adventure trip to Rishikesh next month"_
* **Find a Place:** Look for local spots, activities, or restaurants.
    > _"Find a romantic cafe near me for a date"_
* **Get Travel Advice:** Ask general travel questions before you plan.
    > _"What is the best time of year to visit Kerala?"_
* **Estimate a Budget:** Get a quick cost estimate for a potential trip.
    > _"How much would a 3-day luxury trip to Udaipur cost?"_

### Available Commands
* \`/help\` - Shows this help message.
* \`/clear\` - Clears your conversation history. **Use this when your previous chat isn't needed for new plans to help keep things fast and efficient.**

### Important Tips
* **Be Specific!** The more details you provide in your first message (like budget, vibe, and interests), the faster I can create your personalized plan.
* **Use Your Location:** The "Find a Place" feature uses your device's current location for searches like "near me".
* **Editing Trips:** To make changes to a trip I've already created, please use the dedicated group chat for that trip.
`;

    // --- Effect 1: Get the session ID on initial mount ---
    useEffect(() => {
        const getAiSession = async () => {
            try {
                const response = await api.post('/chat/sessions/ai');
                const newSessionId = response.data.data.sessionId;
                setSessionId(newSessionId);
            } catch (error) {
                console.error("Could not get AI chat session:", error);
                setMessages([{ id: crypto.randomUUID(), text: t('errorMessage'), sender: 'ai', isError: true }]);
                setIsLoadingHistory(false);
            }
        };
        getAiSession();
    }, []);

    useEffect(() => {
        if (!isLoadingHistory && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoadingHistory]);

    useEffect(() => {
        if (sessionId) {
            fetchHistory(sessionId);
        }
    }, [sessionId, fetchHistory]);

    // --- Effect 2: React to the session ID once it's available ---
    useEffect(() => {
        if (sessionId) {
            const socket = getSocket();
            if (socket) {
                socket.emit('joinSession', sessionId);

                const handleNewMessage = (message) => {
                    if (message.chatSession === sessionId) {
                        setIsWaitingForResponse(false);
                        setMessages(prev => {
                            if (prev.some(msg => msg._id === message._id)) return prev;
                            return [...prev, message];
                        });
                    }
                };

                const handleTripCreated = (data) => {
                    setStatusUpdate(null);
                    const tripCreatedMessage = {
                        id: crypto.randomUUID(),
                        sender: 'ai', type: 'system',
                        summary: data.summary
                    };
                    setMessages(prev => [...prev, tripCreatedMessage]);
                };

                const handleStatusUpdate = (data) => {
                    setStatusUpdate(data.text);
                };

                const handleTripCreationError = (data) => {
                    setStatusUpdate(null);
                    const errorMessage = {
                        id: crypto.randomUUID(),
                        text: data.reply,
                        sender: 'ai',
                        type: 'system',
                        isError: true
                    };
                    setMessages(prev => [...prev, errorMessage]);
                };

                socket.on('newMessage', handleNewMessage);
                socket.on('statusUpdate', handleStatusUpdate);
                socket.on('tripCreated', handleTripCreated);
                socket.on('tripCreationError', handleTripCreationError);

                return () => {
                    socket.emit('leaveSession', sessionId);
                    socket.off('newMessage', handleNewMessage);
                    socket.off('statusUpdate', handleStatusUpdate);
                    socket.off('tripCreated', handleTripCreated);
                    socket.off('tripCreationError', handleTripCreationError);
                };
            }
        }
    }, [sessionId]);

    useEffect(() => {
        if (!isLoadingMore) {
            scrollToBottom();
        }
    }, [messages, isLoadingMore]);

    const handleScroll = async () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (container.scrollTop === 0 && hasMoreHistory && !isLoadingMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            await fetchHistory(sessionId, nextPage);
        }
    };


    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();

        if (trimmedInput === '' || isWaitingForResponse) return;

        setSuggestions([]);

        if (trimmedInput === '/help') {
            const helpMessage = {
                id: crypto.randomUUID(),
                sender: 'ai',
                type: 'system',
                text: HELP_MESSAGE,
            };
            setMessages(prev => [...prev, helpMessage]);
            setInputValue('');
            return;
        }


        if (trimmedInput === '/clear') {
            try {
                setIsLoadingHistory(true);
                await api.post('/chat/sessions/ai/clear');
                setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: t('initialMessage') }]);
            } catch (error) {
                console.error("Failed to clear chat history:", error);
                setMessages(prev => [...prev, { id: crypto.randomUUID(), text: 'Error: Could not clear history.', sender: 'ai', isError: true }]);
            } finally {
                setInputValue('');
                setIsLoadingHistory(false);
            }
            return;
        }
        const currentInput = inputValue;
        setInputValue('');
        setIsWaitingForResponse(true);
        try {
            await api.post('/chat/message/ai', {
                message: currentInput,
                sessionId,
                origin: userLocation
            });
        } catch (error) {
            console.error("Error sending message to AI:", error);
            const errorResponse = { id: crypto.randomUUID(), text: t('errorMessage'), sender: 'ai', isError: true };
            setMessages(prev => [...prev, errorResponse]);
            setIsWaitingForResponse(false);
        }
    };

    return (
        <div className="chat-window">
            <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
                {isLoadingHistory ? (
                    <div className="history-loader">Loading chat...</div>
                ) : (
                    <>
                        {isLoadingMore && <div className="history-loader">Loading more...</div>}

                        {messages.map((msg, index) => (
                            <MessageBubble
                                msg={msg}
                                key={msg._id || msg.id}
                                prevMsg={messages[index - 1]}
                                nextMsg={messages[index + 1]}
                            />
                        ))}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>
            {statusUpdate && <StatusBar text={statusUpdate} />}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                {suggestions.length > 0 && (
                    <div className="suggestions-box">
                        {suggestions.slice(0, 8).map((suggestion, index) => (
                            <div
                                key={index}
                                className="suggestion-item"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    spellCheck="true"
                    placeholder={t('inputPlaceholder')}
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={isLoadingHistory || isWaitingForResponse}
                    autoComplete="off"
                />


                <button
                    type="submit"
                    className="send-button"
                    style={{ backgroundColor: COLORS.text }}
                    disabled={isLoadingHistory || isWaitingForResponse || inputValue.trim() === ''}
                >
                    <IoMdSend />
                </button>
            </form>
        </div>
    );
};

export default function AIAssistantPage() {
    const { location, error: geoError } = useGeolocation();
    const { loading: authLoading } = useAuth();

    useEffect(() => {
        if (geoError) console.warn("Geolocation Error:", geoError);
    }, [geoError]);

    if (authLoading) {
        return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>Loading session...</div>;
    }

    return (
        <div className="ai-assistant-page" style={{ backgroundColor: COLORS.background }}>
            <Navbar />
            <ChatWindow userLocation={location} />
        </div>
    );
}