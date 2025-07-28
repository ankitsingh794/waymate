import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VscArrowLeft, VscSparkle } from "react-icons/vsc";
import { IoMdSend } from "react-icons/io";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/axiosInstance';
import './AIAssistant.css';
import socket from '../../utils/socket';

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
            setLocation({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            });
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
        const response = await api.post('/chat/message', {
            message: inputValue,
            sessionId: sessionId,
            origin: userLocation
        });

        const aiResponse = response.data.data;

        // --- FIX ---
        // Only add the AI's response to the chat if it's NOT a trip creation.
        // For trip creations, the WebSocket listener will handle the final message.
        if (aiResponse.reply.includes("Give me a moment") === false) {
            const aiResponseMessage = {
                id: crypto.randomUUID(),
                text: aiResponse.reply,
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiResponseMessage]);
        }

    } catch (error) {
        console.error("Error sending message to AI:", error);
        const errorResponse = {
            id: crypto.randomUUID(),
            text: t('errorMessage'),
            sender: 'ai',
            isError: true
        };
        setMessages(prev => [...prev, errorResponse]);
    } finally {
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
                        <img src={tripSummary.coverImage} alt={tripSummary.destination} className="trip-card-image"  loading="lazy" decoding="async"/>
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

export default function AIAssistantPage() {
    const { location, error: geoError } = useGeolocation();

    useEffect(() => {
        if (geoError) {
            console.warn("Geolocation Error:", geoError);
        }
    }, [geoError]);

    return (
        <div className="ai-assistant-page" style={{ backgroundColor: COLORS.background }}>
            <Navbar />
            <ChatWindow userLocation={location} />
        </div>
    );
}