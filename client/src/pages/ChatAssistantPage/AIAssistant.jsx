import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoMdSend } from 'react-icons/io';
import {
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscError,
  VscInfo,
  VscLoading,
  VscLocation,
  VscRobot,
  VscSparkle,
  VscTag,
  VscTrash,
} from 'react-icons/vsc';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socketManager';
import './AIAssistant.css';

const PAGE_SIZE = 30;

const DEFAULT_PROMPTS = [
  'Plan a 5-day trip to Paris in spring.',
  'Create a weekend itinerary for Bengaluru with food and culture.',
  'Estimate budget for a 4-day family trip to Jaipur.',
  'Find hidden gems and cafes near me.',
  'What should I pack for a monsoon trip?',
];

const QUERY_LIBRARY = [
  'Plan a 5-day trip to ',
  'Create a weekend getaway itinerary for ',
  'Find budget hotels in ',
  'What local food should I try in ',
  'Suggest top restaurants in ',
  'Find hidden gems in ',
  'Get weather forecast for ',
  'Are there any travel alerts for ',
  'Get a packing checklist for ',
  '/clear',
  '/help',
];

const HELP_MESSAGE = `
### WayMate AI Assistant

Here is what I can help you with right now:

- **Trip Planning**: Full multi-day itineraries with practical structure
- **Destination Discovery**: Attractions, food spots, and local ideas
- **Travel Advice**: Timing, packing, and destination tips
- **Budget Estimation**: Quick travel budget approximations

#### Commands

- \`/help\` -> Show this help message
- \`/clear\` -> Clear your AI conversation history

Tip: If you include destination, duration, budget, and vibe in your first prompt, I can produce much better plans quickly.
`;

function createTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLoading(false);
      },
      (geoError) => {
        setError(geoError.message || 'Could not fetch location.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 120000,
      }
    );
  }, []);

  return { location, error, loading };
}

function AssistantHeader() {
  const { t } = useTranslation('aiAssistant');

  return (
    <header className="ai-assistant-header">
      <div className="ai-header-shell">
        <Link to="/dashboard" className="ai-back-link">
          <VscArrowLeft />
          <span>{t('exit')}</span>
        </Link>

        <div className="ai-header-title">
          <VscSparkle />
          <div>
            <h1>{t('title')}</h1>
            <p>Plan faster with real-time AI trip assistance</p>
          </div>
        </div>

        <span className="ai-header-status">Live</span>
      </div>
    </header>
  );
}

function TripSummaryCard({ summary }) {
  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Date unavailable';

    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Trip';

    const oneDay = 1000 * 60 * 60 * 24;
    const duration = Math.max(1, Math.round((endDate - startDate) / oneDay) + 1);
    return `${duration}-day trip`;
  };

  return (
    <article className="ai-trip-summary-card" style={{ backgroundImage: `url(${summary.coverImage})` }}>
      <div className="ai-trip-summary-overlay">
        <div className="ai-trip-summary-head">
          <h3>{summary.destinationName || 'New trip'}</h3>
          <span>{calculateDuration(summary.dates?.start, summary.dates?.end)}</span>
        </div>

        <p>
          <VscCalendar /> {formatDateRange(summary.dates?.start, summary.dates?.end)}
        </p>

        {summary.highlights?.length > 0 && (
          <div className="ai-trip-summary-tags">
            <VscTag />
            <span>{summary.highlights.slice(0, 2).join(' • ')}</span>
          </div>
        )}

        <Link to={`/trip/${summary._id}`} className="ai-trip-summary-link">
          View trip
        </Link>
      </div>
    </article>
  );
}

function MessageBubble({ message, prevMessage, nextMessage, currentUserId }) {
  if (message.summary) {
    return (
      <div className="ai-system-row">
        <TripSummaryCard summary={message.summary} />
      </div>
    );
  }

  const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id;
  const currentSenderKey = senderId || message.type || 'system';
  const prevSenderId = typeof prevMessage?.sender === 'string' ? prevMessage?.sender : prevMessage?.sender?._id;
  const nextSenderId = typeof nextMessage?.sender === 'string' ? nextMessage?.sender : nextMessage?.sender?._id;
  const prevSenderKey = prevSenderId || prevMessage?.type || 'system';
  const nextSenderKey = nextSenderId || nextMessage?.type || 'system';

  const isUser = message.type === 'user' || senderId === currentUserId;
  const isFirstInGroup = !prevMessage || prevSenderKey !== currentSenderKey;
  const isLastInGroup = !nextMessage || nextSenderKey !== currentSenderKey;

  const timeLabel = new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`ai-message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      <div className="ai-avatar-slot">
        {isLastInGroup && (
          <span className={`ai-avatar ${isUser ? 'is-user' : 'is-assistant'}`}>
            {isUser ? 'U' : <VscSparkle />}
          </span>
        )}
      </div>

      <div className="ai-message-stack">
        <article
          className={`ai-message-bubble ${
            isFirstInGroup && isLastInGroup ? 'is-single' : isFirstInGroup ? 'is-first' : isLastInGroup ? 'is-last' : 'is-middle'
          } ${message.isError ? 'is-error' : ''}`}
        >
          {message.isError ? (
            <p className="ai-error-line">
              <VscError /> {message.text}
            </p>
          ) : (
            <ReactMarkdown>{message.text || ''}</ReactMarkdown>
          )}
        </article>

        {isLastInGroup && <span className="ai-message-time">{timeLabel}</span>}
      </div>
    </div>
  );
}

function StatusBar({ text }) {
  return (
    <div className="ai-status-bar">
      <VscLoading className="ai-spin" />
      <span>{text}</span>
    </div>
  );
}

function ChatWorkspace({ userLocation, geoError, geoLoading }) {
  const { t } = useTranslation('aiAssistant');
  const { user } = useAuth();

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const [statusUpdate, setStatusUpdate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const [inlineNotice, setInlineNotice] = useState('');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const promptSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];

    return QUERY_LIBRARY.filter((item) => item.toLowerCase().includes(query)).slice(0, 8);
  }, [inputValue]);

  const pushLocalMessage = useCallback((payload) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createTempId(),
        createdAt: new Date().toISOString(),
        ...payload,
      },
    ]);
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchHistory = useCallback(
    async (targetSessionId, page = 1) => {
      if (!targetSessionId) return;

      if (page > 1) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingHistory(true);
      }

      try {
        const response = await api.get(`/messages/session/${targetSessionId}?page=${page}&limit=${PAGE_SIZE}`);
        const payload = response?.data?.data || {};

        const fetchedMessages = Array.isArray(payload.messages) ? payload.messages : [];
        const currentPage = Number(payload.currentPage) || page;
        const totalPages = Number(payload.totalPages) || currentPage;

        if (fetchedMessages.length === 0 && page === 1) {
          setMessages([
            {
              id: createTempId(),
              sender: 'ai',
              type: 'ai',
              text: t('initialMessage'),
              createdAt: new Date().toISOString(),
            },
          ]);
          setHasMoreHistory(false);
          setHistoryPage(1);
          return;
        }

        if (page > 1) {
          const previousHeight = messagesContainerRef.current?.scrollHeight || 0;
          setMessages((prev) => [...fetchedMessages, ...prev]);

          requestAnimationFrame(() => {
            if (!messagesContainerRef.current) return;
            const nextHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = nextHeight - previousHeight;
          });
        } else {
          setMessages(fetchedMessages);
          requestAnimationFrame(() => scrollToBottom('auto'));
        }

        setHistoryPage(currentPage);
        setHasMoreHistory(currentPage < totalPages);
      } catch {
        setMessages([
          {
            id: createTempId(),
            sender: 'ai',
            type: 'ai',
            text: t('historyError', { defaultValue: 'Could not load message history.' }),
            isError: true,
            createdAt: new Date().toISOString(),
          },
        ]);
        setHasMoreHistory(false);
      } finally {
        setIsLoadingHistory(false);
        setIsLoadingMore(false);
      }
    },
    [scrollToBottom, t]
  );

  const sendCommand = useCallback(
    async (command) => {
      if (command === '/help') {
        pushLocalMessage({ sender: 'ai', type: 'system', text: HELP_MESSAGE });
        return;
      }

      if (command === '/clear') {
        try {
          setIsLoadingHistory(true);
          await api.post('/chat/sessions/ai/clear');
          setMessages([
            {
              id: createTempId(),
              sender: 'ai',
              type: 'ai',
              text: t('initialMessage'),
              createdAt: new Date().toISOString(),
            },
          ]);
          setInlineNotice('Conversation cleared.');
        } catch {
          pushLocalMessage({
            sender: 'ai',
            type: 'system',
            text: t('errorMessage', { defaultValue: 'Something went wrong.' }),
            isError: true,
          });
        } finally {
          setIsLoadingHistory(false);
        }
      }
    },
    [pushLocalMessage, t]
  );

  const submitPrompt = useCallback(
    async (rawText) => {
      const text = rawText.trim();
      const isCommand = text === '/help' || text === '/clear';
      if (!text || isWaitingForResponse) return;
      if (!sessionId && !isCommand) return;

      setInputValue('');
      setInlineNotice('');

      if (isCommand) {
        await sendCommand(text);
        return;
      }

      try {
        setIsWaitingForResponse(true);
        await api.post(`/chat/message/ai/${sessionId}`, {
          message: text,
          origin: userLocation || undefined,
        });
      } catch {
        pushLocalMessage({
          sender: 'ai',
          type: 'system',
          text: t('errorMessage', { defaultValue: 'Failed to send your message.' }),
          isError: true,
        });
        setIsWaitingForResponse(false);
      }
    },
    [isWaitingForResponse, pushLocalMessage, sendCommand, sessionId, t, userLocation]
  );

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const response = await api.post('/chat/sessions/ai');
        const id = response?.data?.data?.sessionId;
        if (mounted) {
          setSessionId(id || null);
        }
      } catch {
        if (mounted) {
          setMessages([
            {
              id: createTempId(),
              sender: 'ai',
              type: 'system',
              text: t('errorMessage', { defaultValue: 'Could not initialize assistant session.' }),
              isError: true,
              createdAt: new Date().toISOString(),
            },
          ]);
          setIsLoadingHistory(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!sessionId) return;
    setHistoryPage(1);
    setHasMoreHistory(true);
    fetchHistory(sessionId, 1);
  }, [fetchHistory, sessionId]);

  useEffect(() => {
    if (isLoadingHistory || !inputRef.current) return;
    inputRef.current.focus();
  }, [isLoadingHistory]);

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('joinSession', sessionId);

    const handleNewMessage = (message) => {
      const incomingSession = String(message?.chatSession || '');
      if (incomingSession && incomingSession !== String(sessionId)) return;

      setMessages((prev) => {
        if (prev.some((item) => item._id && item._id === message._id)) return prev;
        return [...prev, message];
      });

      setIsWaitingForResponse(false);
    };

    const handleStatusUpdate = (payload) => {
      setStatusUpdate(payload?.text || 'Processing your request...');
    };

    const handleTripCreated = (payload) => {
      setStatusUpdate('');
      pushLocalMessage({ sender: 'ai', type: 'system', summary: payload?.summary });
      setIsWaitingForResponse(false);
    };

    const handleTripCreationError = (payload) => {
      setStatusUpdate('');
      pushLocalMessage({
        sender: 'ai',
        type: 'system',
        text: payload?.reply || 'Trip creation failed. Please try again.',
        isError: true,
      });
      setIsWaitingForResponse(false);
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
  }, [pushLocalMessage, sessionId]);

  useEffect(() => {
    if (isLoadingMore) return;
    scrollToBottom();
  }, [isLoadingMore, messages, scrollToBottom]);

  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    if (!container || !hasMoreHistory || isLoadingMore || isLoadingHistory) return;

    if (container.scrollTop <= 80) {
      const nextPage = historyPage + 1;
      await fetchHistory(sessionId, nextPage);
    }
  };

  const locationText = useMemo(() => {
    if (geoLoading) return 'Detecting your location...';
    if (geoError) return `Location unavailable: ${geoError}`;
    if (!userLocation) return 'Location not set';

    return `Lat ${userLocation.lat.toFixed(3)}, Lon ${userLocation.lon.toFixed(3)}`;
  }, [geoError, geoLoading, userLocation]);

  return (
    <div className="ai-assistant-layout">
      <section className="ai-main-panel">
        <div className="ai-messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
          {isLoadingHistory ? (
            <div className="ai-history-loader">
              <VscLoading className="ai-spin" />
              Loading chat history...
            </div>
          ) : (
            <>
              {isLoadingMore && (
                <div className="ai-history-loader">
                  <VscLoading className="ai-spin" />
                  Loading more...
                </div>
              )}

              {messages.map((message, index) => (
                <MessageBubble
                  key={message._id || message.id}
                  message={message}
                  prevMessage={messages[index - 1]}
                  nextMessage={messages[index + 1]}
                  currentUserId={user?._id}
                />
              ))}

              {isWaitingForResponse && (
                <div className="ai-thinking-row">
                  <VscLoading className="ai-spin" />
                  Assistant is thinking...
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {statusUpdate && <StatusBar text={statusUpdate} />}

        {inlineNotice && (
          <div className="ai-inline-notice">
            <VscCheck />
            <span>{inlineNotice}</span>
          </div>
        )}

        <form
          className="ai-input-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitPrompt(inputValue);
          }}
        >
          {promptSuggestions.length > 0 && (
            <div className="ai-suggestion-box">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-suggestion-item"
                  onClick={() => {
                    setInputValue(prompt);
                    inputRef.current?.focus();
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="ai-input-row">
            <input
              ref={inputRef}
              className="ai-chat-input"
              type="text"
              spellCheck="true"
              autoComplete="off"
              placeholder={t('inputPlaceholder')}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={isLoadingHistory || isWaitingForResponse}
            />

            <button
              type="submit"
              className="ai-send-button"
              disabled={isLoadingHistory || isWaitingForResponse || inputValue.trim() === ''}
              aria-label="Send message"
            >
              <IoMdSend />
            </button>
          </div>
        </form>
      </section>

      <aside className="ai-side-panel">
        <article className="ai-side-card">
          <header>
            <h3>
              <VscRobot /> Quick prompts
            </h3>
          </header>
          <div className="ai-prompt-list">
            {DEFAULT_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setInputValue(prompt);
                  inputRef.current?.focus();
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </article>

        <article className="ai-side-card">
          <header>
            <h3>
              <VscInfo /> Session tools
            </h3>
          </header>
          <div className="ai-tool-grid">
            <button type="button" onClick={() => submitPrompt('/help')}>
              /help
            </button>
            <button type="button" onClick={() => submitPrompt('/clear')}>
              <VscTrash /> /clear
            </button>
          </div>
        </article>

        <article className="ai-side-card">
          <header>
            <h3>
              <VscLocation /> Location context
            </h3>
          </header>
          <p className={`ai-location-chip ${geoError ? 'is-error' : userLocation ? 'is-ok' : ''}`}>{locationText}</p>
        </article>
      </aside>
    </div>
  );
}

export default function AIAssistantPage() {
  const { loading: authLoading } = useAuth();
  const { location, error: geoError, loading: geoLoading } = useGeolocation();

  if (authLoading) {
    return (
      <div className="ai-page-loader">
        <VscLoading className="ai-spin" />
        <span>Loading session...</span>
      </div>
    );
  }

  return (
    <div className="ai-assistant-page">
      <AssistantHeader />
      <ChatWorkspace userLocation={location} geoError={geoError} geoLoading={geoLoading} />
    </div>
  );
}
