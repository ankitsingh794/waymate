import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCheck,
  VscChevronDown,
  VscClose,
  VscError,
  VscInfo,
  VscOrganization,
  VscSend,
  VscSparkle,
} from 'react-icons/vsc';
import {
  FaCamera,
  FaImage,
  FaPaperclip,
  FaRegFaceSmile,
  FaUsers,
  FaXmark,
} from 'react-icons/fa6';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socketManager';
import { Loading } from '../../components/UI';
import './GroupMessenger.css';

const PAGE_LIMIT = 80;

function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateDivider(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getSenderId(message) {
  if (!message) return '';
  if (typeof message.sender === 'string') return message.sender;
  return message.sender?._id || '';
}

function getSenderName(message) {
  if (!message) return 'Squad Traveler';
  if (typeof message.sender === 'object') {
    return message.sender?.name || message.sender?.email?.split('@')[0] || 'Squad Traveler';
  }
  return message.senderName || 'Squad Traveler';
}

function getSenderAvatar(message) {
  if (typeof message?.sender === 'object') {
    return message.sender?.profileImage || '';
  }
  return '';
}

function isEmojiOnly(str) {
  if (!str) return false;
  const trimmed = str.trim();
  // Check if string contains only 1 to 4 emojis without alphanumeric characters
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\uFE0F|\u200D){1,6}$/u;
  return emojiRegex.test(trimmed);
}

function MessageBubble({
  message,
  prevMessage,
  nextMessage,
  currentUserId,
  onImagePreview,
}) {
  const senderId = getSenderId(message);
  const prevSenderId = getSenderId(prevMessage);
  const nextSenderId = getSenderId(nextMessage);

  const senderName = getSenderName(message);
  const senderAvatar = getSenderAvatar(message);
  const isMine = senderId && String(senderId) === String(currentUserId);
  const isFirst = !prevMessage || prevSenderId !== senderId;
  const isLast = !nextMessage || nextSenderId !== senderId;

  const emojiMode = isEmojiOnly(message.text);
  const hasMedia = Boolean(message.media?.url || message.mediaUrl);
  const mediaUrl = message.media?.url || message.mediaUrl;
  const mediaType = message.media?.type || 'image';

  return (
    <article
      className={`wm-msg-row ${isMine ? 'wm-msg-row--mine' : 'wm-msg-row--other'} ${
        isFirst ? 'is-first-in-group' : ''
      } ${isLast ? 'is-last-in-group' : ''}`}
    >
      {/* Sender Avatar for squad members (only on the first message of group) */}
      {!isMine && (
        <div className="wm-msg-avatar-slot" aria-hidden="true">
          {isLast ? (
            senderAvatar ? (
              <img src={senderAvatar} alt="" className="wm-msg-avatar-img" />
            ) : (
              <div className="wm-msg-avatar-fallback">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <div className="wm-msg-avatar-spacer" />
          )}
        </div>
      )}

      <div className="wm-msg-body">
        {!isMine && isFirst && (
          <header className="wm-msg-meta">
            <span className="wm-msg-sender-name">{senderName}</span>
          </header>
        )}

        {/* Bubble container */}
        <div
          className={`wm-msg-bubble ${isMine ? 'wm-msg-bubble--mine' : 'wm-msg-bubble--other'} ${
            emojiMode ? 'wm-msg-bubble--emoji-only' : ''
          } ${hasMedia ? 'wm-msg-bubble--has-media' : ''}`}
        >
          {/* Media preview if attached */}
          {hasMedia && (
            <div className="wm-msg-media-wrap">
              {mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  controls
                  className="wm-msg-media-video"
                  preload="metadata"
                />
              ) : (
                <button
                  type="button"
                  className="wm-msg-media-btn"
                  onClick={() => onImagePreview(mediaUrl)}
                  title="Click to view image"
                >
                  <img
                    src={mediaUrl}
                    alt="Shared in squad chat"
                    className="wm-msg-media-image"
                    loading="lazy"
                  />
                </button>
              )}
            </div>
          )}

          {/* Text content */}
          {message.text && (
            <p className={`wm-msg-text ${emojiMode ? 'wm-msg-text--emoji' : ''}`}>
              {message.text}
            </p>
          )}

          {/* Footer timestamp & status */}
          <footer className="wm-msg-footer">
            <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            {isMine && (
              <span className="wm-msg-status-check" aria-label="Delivered">
                <VscCheck />
              </span>
            )}
          </footer>
        </div>
      </div>
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
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const streamContainerRef = useRef(null);
  const fileInputRef = useRef(null);

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
    const { data } = await api.get(
      `/messages/session/${targetSessionId}?page=1&limit=${PAGE_LIMIT}`
    );
    const fetched = Array.isArray(data?.data?.messages) ? data.data.messages : [];
    setMessages(fetched);
  }, []);

  const ensureGroupSession = useCallback(async () => {
    const groupResponse = await api.get('/chat/sessions/group');
    const sessions = Array.isArray(groupResponse?.data?.data?.sessions)
      ? groupResponse.data.data.sessions
      : [];

    const matchedSession = sessions.find((session) => {
      const tripId =
        typeof session?.tripId === 'string' ? session.tripId : session?.tripId?._id;
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
      const message =
        initError?.response?.data?.message || 'Could not open group chat right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ensureGroupSession, id, loadMessages]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Real-time Socket Connection
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

  // Auto-scroll to bottom on message updates (unless user scrolled up)
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom(false);
    }
  }, [messages, isScrolledUp, scrollToBottom]);

  // Detect scroll position to show / hide "Jump to Latest" button
  const handleScroll = () => {
    if (!streamContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = streamContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 160);
  };

  // Squad Members Info
  const members = useMemo(() => {
    const list = trip?.group?.members;
    if (Array.isArray(list) && list.length > 0) return list;
    return [];
  }, [trip?.group?.members]);

  const memberCount = members.length || 1;

  // Send handler (Text or File attachment)
  const handleSend = async (event) => {
    if (event) event.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !pendingFile) || !sessionId || sending) return;

    setSending(true);
    setNotice('');

    try {
      if (pendingFile) {
        // Send Media Message
        const formData = new FormData();
        formData.append('media', pendingFile);
        if (trimmed) {
          formData.append('caption', trimmed);
        }

        const { data } = await api.post(
          `/messages/session/${sessionId}/media`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        const savedMessage = data?.data?.message;
        if (savedMessage) {
          appendMessage(savedMessage);
        }

        setPendingFile(null);
      } else {
        // Send Text Message
        const { data } = await api.post(`/messages/session/${sessionId}/text`, {
          message: trimmed,
        });

        const savedMessage = data?.data?.message;
        if (savedMessage) {
          appendMessage(savedMessage);
        }
      }

      setText('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
      }
      scrollToBottom(true);
    } catch (sendError) {
      const message =
        sendError?.response?.data?.message || 'Message could not be sent. Please retry.';
      setNotice(message);
    } finally {
      setSending(false);
    }
  };

  // Quick vibe chip triggers
  const handleInsertPrompt = (prompt) => {
    setText((prev) => (prev ? `${prev} ${prompt}` : prompt));
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
    // reset input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="group-chat-page group-chat-loading-screen">
        <Loading
          size="lg"
          label={`Connecting to ${trip?.destination || 'Squad'} Frequency`}
          sublabel="Syncing squad dispatch and encrypted communication channel"
        />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="group-chat-page group-chat-error-screen">
        <div className="group-chat-error-card">
          <div className="error-icon-pill">
            <VscError />
          </div>
          <h2>Squad Frequency Unavailable</h2>
          <p>{error || 'Could not establish connection to the trip communication hub.'}</p>
          <div className="error-actions">
            <button type="button" className="btn-atelier-primary" onClick={() => initialize()}>
              Retry Connection
            </button>
            <button
              type="button"
              className="btn-atelier-secondary"
              onClick={() => navigate(`/trip/${id}`)}
            >
              Back to Trip Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group-chat-page">
      {/* Ambient background glows */}
      <div className="group-chat-ambient" aria-hidden="true">
        <div className="ambient-sphere ambient-sphere--emerald" />
        <div className="ambient-sphere ambient-sphere--sand" />
      </div>

      {/* Main ergonomic messenger shell */}
      <div className="group-chat-card">
        {/* Luxury Top Bar */}
        <header className="group-chat-topbar">
          <div className="topbar-left">
            <Link to={`/trip/${id}`} className="topbar-back-pill" title="Return to trip overview">
              <VscArrowLeft />
              <span>Trip Overview</span>
            </Link>
          </div>

          <div className="topbar-center">
            <button
              type="button"
              className="topbar-title-button"
              onClick={() => setSquadModalOpen(true)}
              title="Click to view squad roster"
            >
              <div className="topbar-title-row">
                <span className="live-squad-dot" aria-hidden="true" />
                <h1 className="topbar-destination">{trip.destination}</h1>
                <VscChevronDown className="topbar-dropdown-icon" />
              </div>
              <p className="topbar-subtitle">
                {memberCount} Squad Explorer{memberCount === 1 ? '' : 's'} · Tap for Roster
              </p>
            </button>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-assistant-btn"
              onClick={() =>
                navigate('/assistant', {
                  state: {
                    sessionMode: 'ai',
                    tripId: id,
                    tripName: trip?.destination || '',
                    prefillMessage: `Help coordinate group plans, dining spots, and itinerary for our trip to ${
                      trip?.destination || 'our destination'
                    }.`,
                  },
                })
              }
            >
              <VscSparkle className="sparkle-icon" />
              <span>AI Co-Pilot</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <main
          className="group-chat-stream-viewport"
          ref={streamContainerRef}
          onScroll={handleScroll}
        >
          <div className="group-chat-stream-content">
            {messages.length > 0 ? (
              messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const nextMessage = messages[index + 1];

                // Check date dividers
                const showDateDivider =
                  !prevMessage ||
                  new Date(message.createdAt).toDateString() !==
                    new Date(prevMessage.createdAt).toDateString();

                return (
                  <React.Fragment
                    key={message._id || message.id || `${message.createdAt || 'msg'}-${index}`}
                  >
                    {showDateDivider && (
                      <div className="wm-date-divider" role="separator">
                        <span className="wm-date-pill">
                          {formatDateDivider(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={message}
                      prevMessage={prevMessage}
                      nextMessage={nextMessage}
                      currentUserId={user?._id}
                      onImagePreview={(url) => setPreviewMediaUrl(url)}
                    />
                  </React.Fragment>
                );
              })
            ) : (
              <div className="group-chat-empty-state">
                <div className="empty-state-badge">
                  <VscOrganization />
                </div>
                <h3>Squad Frequency Live</h3>
                <p>
                  Coordinate arrivals, drop dinner picks, or brainstorm route detours with the{' '}
                  {trip.destination} squad.
                </p>
                <div className="empty-quick-prompts">
                  <button
                    type="button"
                    onClick={() => handleInsertPrompt('👋 Hey squad! Excited for this trip!')}
                  >
                    👋 Say hello to everyone
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertPrompt('📍 Any favorite food spots we should pin?')
                    }
                  >
                    📍 Propose a dinner spot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertPrompt('✈️ What time is everyone arriving on Day 1?')
                    }
                  >
                    ✈️ Check arrival times
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Jump to bottom floating pill */}
          {isScrolledUp && (
            <button
              type="button"
              className="wm-jump-bottom-btn"
              onClick={() => scrollToBottom(true)}
              aria-label="Jump to latest messages"
            >
              <span>Latest Messages</span>
              <VscChevronDown />
            </button>
          )}
        </main>

        {/* Floating Composer Area */}
        <footer className="group-chat-dock">
          {/* Notice banner if send fails */}
          {notice && (
            <div className="group-dock-notice">
              <VscInfo />
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')}>
                <VscClose />
              </button>
            </div>
          )}

          {/* Pending media attachment pill */}
          {pendingFile && (
            <div className="group-dock-attachment-pill">
              <div className="attachment-chip">
                <FaImage className="attachment-chip-icon" />
                <span className="attachment-chip-name">{pendingFile.name}</span>
                <span className="attachment-chip-size">
                  ({(pendingFile.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  className="attachment-chip-remove"
                  onClick={() => setPendingFile(null)}
                  title="Remove attachment"
                >
                  <FaXmark />
                </button>
              </div>
            </div>
          )}

          {/* Quick Vibe Chips */}
          <div className="group-vibe-chips">
            <button
              type="button"
              className="vibe-chip"
              onClick={() => handleInsertPrompt('📍 Meetup point: ')}
            >
              📍 Meetup point
            </button>
            <button
              type="button"
              className="vibe-chip"
              onClick={() => handleInsertPrompt('⏰ Departure time: ')}
            >
              ⏰ Departure
            </button>
            <button
              type="button"
              className="vibe-chip"
              onClick={() => handleInsertPrompt('🍽️ Food spot: ')}
            >
              🍽️ Food spot
            </button>
            <button
              type="button"
              className="vibe-chip"
              onClick={() => handleInsertPrompt('🎒 Packing reminder: ')}
            >
              🎒 Packing reminder
            </button>
          </div>

          {/* Modern Ergonomic Floating Form */}
          <form className="group-composer-form" onSubmit={handleSend}>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              style={{ display: 'none' }}
            />

            {/* Attachment Button */}
            <button
              type="button"
              className="composer-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo or media"
              disabled={sending}
            >
              <FaPaperclip />
            </button>

            {/* Seamless Auto-resizing Text Input */}
            <textarea
              ref={inputRef}
              className="composer-textarea"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // auto-expand up to 120px
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              rows={1}
              placeholder={`Message the ${trip.destination} squad...`}
              disabled={sending}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend(event);
                }
              }}
            />

            {/* Send Button */}
            <button
              type="submit"
              className={`composer-send-btn ${
                text.trim() || pendingFile ? 'is-active' : ''
              }`}
              disabled={sending || (!text.trim() && !pendingFile)}
              title="Send message (Enter)"
            >
              {sending ? (
                <div className="send-spinner" />
              ) : (
                <VscSend className="send-icon" />
              )}
            </button>
          </form>
        </footer>
      </div>

      {/* Squad Members Modal */}
      {squadModalOpen && (
        <div
          className="group-modal-backdrop"
          onClick={() => setSquadModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="group-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="group-modal-header">
              <div className="group-modal-title">
                <FaUsers />
                <h3>{trip.destination} Squad Roster</h3>
              </div>
              <button
                type="button"
                className="group-modal-close"
                onClick={() => setSquadModalOpen(false)}
              >
                <VscClose />
              </button>
            </header>

            <div className="group-modal-body">
              <p className="roster-desc">
                {memberCount} registered co-traveler{memberCount === 1 ? '' : 's'} collaborating
                in this trip channel.
              </p>

              <div className="squad-roster-list">
                {members.length === 0 ? (
                  <div className="squad-member-row">
                    <div className="squad-member-avatar">
                      {user?.name?.charAt(0).toUpperCase() || 'Y'}
                    </div>
                    <div className="squad-member-meta">
                      <h4>{user?.name || 'You (Trip Creator)'}</h4>
                      <span>{user?.email}</span>
                    </div>
                    <span className="squad-role-tag">Owner</span>
                  </div>
                ) : (
                  members.map((m, idx) => {
                    const memberName = m.userId?.name || m.name || `Traveler #${idx + 1}`;
                    const memberEmail = m.userId?.email || m.email || 'Squad Member';
                    const memberAvatar = m.userId?.profileImage || m.profileImage;
                    const isCurrentUser = (m.userId?._id || m.userId) === user?._id;

                    return (
                      <div key={idx} className="squad-member-row">
                        <div className="squad-member-avatar">
                          {memberAvatar ? (
                            <img src={memberAvatar} alt="" />
                          ) : (
                            memberName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="squad-member-meta">
                          <h4>
                            {memberName} {isCurrentUser && '(You)'}
                          </h4>
                          <span>{memberEmail}</span>
                        </div>
                        <span className="squad-role-tag">{m.role || 'Member'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <footer className="group-modal-footer">
              <Link
                to={`/trip/${id}/members`}
                className="btn-roster-manage"
                onClick={() => setSquadModalOpen(false)}
              >
                + Manage & Invite Members
              </Link>
            </footer>
          </div>
        </div>
      )}

      {/* Media Lightbox Modal */}
      {previewMediaUrl && (
        <div
          className="group-lightbox-backdrop"
          onClick={() => setPreviewMediaUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="group-lightbox-close"
            onClick={() => setPreviewMediaUrl(null)}
          >
            <VscClose />
          </button>
          <div
            className="group-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewMediaUrl} alt="Enlarged media" />
          </div>
        </div>
      )}
    </div>
  );
}
