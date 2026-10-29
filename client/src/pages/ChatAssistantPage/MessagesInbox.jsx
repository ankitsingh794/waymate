import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  VscArrowLeft,
  VscArrowRight,
  VscCommentDiscussion,
  VscLocation,
  VscPerson,
  VscRobot,
  VscSearch,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Loading } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './MessagesInbox.css';

export default function MessagesInbox() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/chat/sessions/group');
      const list = res?.data?.data?.sessions || res?.data?.data || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load messaging channels.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const dest = s.tripId?.destination?.toLowerCase() || '';
    const name = s.name?.toLowerCase() || '';
    return dest.includes(q) || name.includes(q);
  });

  if (loading) {
    return (
      <div className="messages-inbox-page">
        <DashboardNavbar />
        <div className="messages-loading">
          <Loading size="lg" />
          <p>Connecting to squad messaging streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-inbox-page">
      <DashboardNavbar />

      <div className="messages-ambient" aria-hidden="true">
        <div className="messages-orb messages-orb-1" />
        <div className="messages-orb messages-orb-2" />
      </div>

      <main className="messages-shell">
        <div className="messages-top-nav">
          <Link to="/dashboard" className="messages-back-link">
            <VscArrowLeft /> Back to Command Center
          </Link>
        </div>

        <header className="messages-header">
          <div>
            <div className="messages-eyebrow">
              <span className="messages-live-dot" />
              <span>Squad Dispatch</span>
            </div>
            <h1>Expedition Conversation Channels</h1>
            <p>Real-time group chat rooms, itinerary coordination, and media sharing for all active journeys.</p>
          </div>

          <div className="messages-header-actions">
            <Button
              variant="primary"
              icon={VscRobot}
              onClick={() => navigate('/assistant')}
            >
              Open AI Architect
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <div className="messages-search-bar">
          <VscSearch className="search-icon" />
          <input
            type="search"
            placeholder="Search channels by destination or group name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Channels List */}
        <section className="channels-feed">
          {filteredSessions.length === 0 ? (
            <div className="channels-empty-card">
              <VscCommentDiscussion className="empty-icon" />
              <h3>No Active Messaging Channels</h3>
              <p>
                Group chat rooms are automatically created when you add co-travelers to any expedition.
              </p>
              <Link to="/trips" className="btn btn-primary">
                View Your Journeys →
              </Link>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const tripId = session.tripId?._id || session.tripId;
              const title = session.tripId?.destination || session.name || 'Trip Squad Room';
              const lastMsg = session.lastMessage?.text || 'No messages exchanged yet.';
              const lastTime = session.lastMessage?.createdAt
                ? new Date(session.lastMessage.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <article
                  key={session._id}
                  className="channel-card"
                  onClick={() => tripId && navigate(`/trip/${tripId}/chat`)}
                >
                  <div className="channel-avatar">
                    <VscCommentDiscussion />
                  </div>

                  <div className="channel-info">
                    <div className="channel-head">
                      <h3>{title}</h3>
                      {lastTime && <span className="channel-time">{lastTime}</span>}
                    </div>
                    <p className="channel-preview">{lastMsg}</p>
                  </div>

                  <div className="channel-action">
                    <VscArrowRight />
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
