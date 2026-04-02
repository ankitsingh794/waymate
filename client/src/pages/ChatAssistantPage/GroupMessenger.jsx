import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscError,
  VscInfo,
  VscLoading,
  VscOrganization,
  VscSend,
  VscSparkle,
} from 'react-icons/vsc';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socketManager';
import './GroupMessenger.css';

const PAGE_LIMIT = 60;

function createTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSenderId(message) {
  if (!message) return '';
  if (typeof message.sender === 'string') return message.sender;
  return message.sender?._id || '';
}

function getSenderName(message) {
  if (!message) return 'Participant';
  if (typeof message.sender === 'object') {
    return message.sender?.name || message.sender?.email || 'Participant';
  }
  return message.senderName || 'Participant';
}

function MessageBubble({ message, prevMessage, nextMessage, currentUserId }) {
  const senderId = getSenderId(message);
  const prevSenderId = getSenderId(prevMessage);
  const nextSenderId = getSenderId(nextMessage);

  const senderName = getSenderName(message);
  const isMine = senderId && String(senderId) === String(currentUserId);
  const isFirst = !prevMessage || prevSenderId !== senderId;
  const isLast = !nextMessage || nextSenderId !== senderId;

  const bubbleClass = isMine ? 'is-mine' : 'is-other';

  return (
    <article className={`group-msg-row ${bubbleClass}`}>
      {!isMine && isFirst && <p className="group-msg-sender">{senderName}</p>}

      <div className={`group-msg-bubble ${bubbleClass} ${isFirst ? 'is-first' : ''} ${isLast ? 'is-last' : ''}`}>
        <p>{message.text || ''}</p>
      </div>

      {isLast && <time>{formatTime(message.createdAt)}</time>}
    </article>
  );
}

export default function GroupMessenger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const appendMessage = useCallback((incomingMessage) => {
    if (!incomingMessage) return;

    setMessages((prev) => {
      if (incomingMessage._id && prev.some((item) => item._id === incomingMessage._id)) {
        return prev;
      }
      return [...prev, incomingMessage];
    });
  }, []);

  const loadMessages = useCallback(async (targetSessionId) => {
    const { data } = await api.get(`/messages/session/${targetSessionId}?page=1&limit=${PAGE_LIMIT}`);
    const fetched = Array.isArray(data?.data?.messages) ? data.data.messages : [];
    setMessages(fetched);
  }, []);

  const ensureGroupSession = useCallback(async () => {
    const groupResponse = await api.get('/chat/sessions/group');
    const sessions = Array.isArray(groupResponse?.data?.data?.sessions) ? groupResponse.data.data.sessions : [];

    const matchedSession = sessions.find((session) => {
      const tripId = typeof session?.tripId === 'string' ? session.tripId : session?.tripId?._id;
      return String(tripId || '') === String(id);
    });

    if (matchedSession?._id) {
      return matchedSession._id;
    }

    const createResponse = await api.post('/chat/sessions/group', { tripId: id });
    return createResponse?.data?.data?.session?._id || '';
  }, [id]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [{ data: tripData }, resolvedSessionId] = await Promise.all([
        api.get(`/trips/${id}`),
        ensureGroupSession(),
      ]);

      const nextTrip = tripData?.data?.trip || tripData?.trip || null;
      if (!nextTrip) {
        throw new Error('Trip not found.');
      }

      if (!resolvedSessionId) {
        throw new Error('Group chat session is unavailable.');
      }

      setTrip(nextTrip);
      setSessionId(resolvedSessionId);
      await loadMessages(resolvedSessionId);
    } catch (initError) {
      const message = initError?.response?.data?.message || 'Could not open group chat right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ensureGroupSession, id, loadMessages]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('joinSession', sessionId);

    const onMessage = (incomingMessage) => {
      const incomingSessionId = String(incomingMessage?.chatSession || '');
      if (incomingSessionId && incomingSessionId !== String(sessionId)) {
        return;
      }
      appendMessage(incomingMessage);
    };

    socket.on('newMessage', onMessage);

    return () => {
      socket.emit('leaveSession', sessionId);
      socket.off('newMessage', onMessage);
    };
  }, [appendMessage, sessionId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  const membersLabel = useMemo(() => {
    const count = Array.isArray(trip?.group?.members) ? trip.group.members.length : 0;
    return `${count} member${count === 1 ? '' : 's'}`;
  }, [trip?.group?.members]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !sessionId || sending) return;

    setSending(true);
    setNotice('');

    try {
      const { data } = await api.post(`/messages/session/${sessionId}/text`, {
        message: trimmed,
      });

      const savedMessage = data?.data?.message;
      if (savedMessage) {
        appendMessage(savedMessage);
      }

      setText('');
      inputRef.current?.focus();
    } catch (sendError) {
      const message = sendError?.response?.data?.message || 'Message could not be sent.';
      setNotice(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="group-chat-loading">
        <VscLoading className="spin" />
        <span>Loading group chat...</span>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="group-chat-error">
        <VscError />
        <h2>{error || 'Group chat is unavailable.'}</h2>
        <div>
          <button type="button" onClick={() => initialize()}>
            Retry
          </button>
          <button type="button" onClick={() => navigate(`/trip/${id}/edit`)}>
            Back to edit trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-chat-page">
      <header className="group-chat-header">
        <Link to={`/trip/${id}/edit`} className="group-back-link">
          <VscArrowLeft />
          <span>Back to edit trip</span>
        </Link>

        <div className="group-chat-title-wrap">
          <h1>
            <VscOrganization /> {trip.destination}
          </h1>
          <p>{membersLabel} in this trip chat</p>
        </div>

        <button
          type="button"
          className="group-assistant-link"
          onClick={() =>
            navigate('/assistant', {
              state: {
                sessionMode: 'ai',
                tripId: id,
                tripName: trip?.destination || '',
                prefillMessage: `Help plan and coordinate updates for our trip to ${trip?.destination || 'our destination'}.`,
              },
            })
          }
        >
          <VscSparkle />
          <span>AI Assistant</span>
        </button>
      </header>

      <main className="group-chat-shell">
        <section className="group-chat-stream" ref={messagesRef}>
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <MessageBubble
                key={message._id || message.id || `${message.createdAt || 'msg'}-${index}`}
                message={message}
                prevMessage={messages[index - 1]}
                nextMessage={messages[index + 1]}
                currentUserId={user?._id}
              />
            ))
          ) : (
            <div className="group-chat-empty">
              <VscInfo />
              <p>No messages yet. Start the conversation.</p>
            </div>
          )}
        </section>

        {notice && <p className="group-chat-notice">{notice}</p>}

        <form className="group-chat-composer" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={1}
            placeholder="Write a message to your trip group"
            disabled={sending}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend(event);
              }
            }}
          />

          <button type="submit" disabled={sending || text.trim() === ''}>
            {sending ? <VscLoading className="spin" /> : <VscSend />}
          </button>
        </form>
      </main>
    </div>
  );
}
