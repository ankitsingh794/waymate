import React, { useState, useEffect, useRef } from 'react';
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
    const [tripSummary, setTripSummary] = useState(null)
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
        if (!sessionId) return;

        const fetchHistory = async () => {
            try {
                const response = await api.get(`/messages/session/${sessionId}`);
                const history = response.data.data.messages;

                if (history.length > 0) {
                    setMessages(history);
                } else {
                    setMessages([{ id: crypto.randomUUID(), text: t('initialMessage'), sender: 'ai' }]);
                }
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
                setMessages([{ id: crypto.randomUUID(), text: t('errorMessage'), sender: 'ai', isError: true }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [sessionId, t]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === '' || isTyping) return;

        const newUserMessage = {
            id: crypto.randomUUID(),
            text: inputValue,
            sender: 'user', // Correctly identify the sender
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
            {messages.map((msg) => (
                <div
                    key={msg._id || msg.id}
                    className={`message-bubble-wrapper ${msg.sender === 'user' || msg.type === 'user' ? 'user-message' : 'ai-message'}`}
                >
                    <div className={`message-bubble ${msg.isError ? 'error-bubble' : ''}`}>
                        {msg.text}
                    </div>
                </div>
            ))}

            {/* Render the trip summary card if it exists */}
            {tripSummary && (
                <div className="message-bubble-wrapper ai-message">
                    <div className="trip-summary-card">
                        <img src={tripSummary.coverImage} alt={tripSummary.destination} className="trip-card-image" />
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