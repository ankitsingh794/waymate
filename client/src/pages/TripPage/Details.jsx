import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  VscAdd,
  VscArrowLeft,
  VscArrowRight,
  VscCalendar,
  VscCheck,
  VscCommentDiscussion,
  VscError,
  VscHeart,
  VscInfo,
  VscLocation,
  VscLoading,
  VscMilestone,
  VscOrganization,
  VscSave,
  VscSettingsGear,
  VscShare,
  VscSparkle,
  VscWarning,
} from 'react-icons/vsc';
import { GiForkKnifeSpoon, GiTakeMyMoney, GiTicket } from 'react-icons/gi';
import { FaTrainSubway } from 'react-icons/fa6';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../components/UI';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import './Details.css';

/* ─── Constants ────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  'planning', 'upcoming', 'in_progress', 'completed', 'canceled',
];

const RECOMMENDATION_FALLBACK_IMAGES = {
  attractions: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=640&q=80',
  food:        'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=640&q=80',
  stays:       'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=640&q=80',
};

/* ─── Pure helpers ─────────────────────────────────────────────────────────── */

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function titleCase(value) {
  if (!value) return 'Unknown';
  return String(value)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
}

function formatCurrency(amount, currency = 'USD') {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return '--';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(0)} ${currency || 'USD'}`;
  }
}

function getRecommendationName(place, fallback) {
  if (typeof place === 'string' && place.trim()) return place.trim();
  if (place && typeof place === 'object') {
    const name = place.name || place.title || place.placeName;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return fallback;
}

function getRecommendationImage(place) {
  if (!place || typeof place === 'string') return '';
  const candidates = [place.image, place.imageUrl, place.photoUrl, place.photo, place.thumbnail, place.coverImage];
  if (Array.isArray(place.images) && place.images.length > 0) {
    const firstImage = place.images[0];
    if (typeof firstImage === 'string') candidates.push(firstImage);
    if (firstImage && typeof firstImage === 'object') candidates.push(firstImage.url, firstImage.secure_url);
  }
  return candidates.find((v) => typeof v === 'string' && /^https?:\/\//i.test(v)) || '';
}

function getRecommendationMeta(place) {
  if (!place || typeof place !== 'object') return { rating: 0, location: '' };
  const numericRating = Number(place.rating);
  const hasRating = Number.isFinite(numericRating) && numericRating > 0;
  const location = place.vicinity || place.address || place.reason || '';
  return { rating: hasRating ? numericRating : 0, location };
}

function normalizeItinerary(itinerary, startDate) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return [];

  const hasDayShape = itinerary.some((item) => typeof item?.day === 'number' || Array.isArray(item?.activities));
  if (hasDayShape) {
    return itinerary
      .map((item, index) => {
        const activities = Array.isArray(item?.activities) ? item.activities.filter(Boolean) : [];
        const dayNumber = Number(item?.day) || index + 1;
        return {
          day: dayNumber,
          title: item?.title || `Day ${dayNumber}`,
          activities: activities.length > 0 ? activities : ['No activities added yet.'],
        };
      })
      .sort((a, b) => a.day - b.day);
  }

  const start = startDate ? new Date(startDate) : null;
  const grouped = new Map();

  itinerary.forEach((item, index) => {
    let day = 1;
    const startTime = item?.startTime ? new Date(item.startTime) : null;
    if (start && startTime && !Number.isNaN(start.getTime()) && !Number.isNaN(startTime.getTime())) {
      const diffDays = Math.floor((startTime.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      day = Math.max(1, diffDays + 1);
    } else if (typeof item?.sequence === 'number') {
      day = Math.max(1, item.sequence);
    }
    const activityParts = [];
    if (item?.description) activityParts.push(item.description);
    if (item?.type) activityParts.push(titleCase(item.type));
    if (item?.mode) activityParts.push(`via ${titleCase(item.mode)}`);
    const label = activityParts.join(' — ') || `Activity ${index + 1}`;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(label);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, activities]) => ({ day, title: `Day ${day}`, activities }));
}

/* ─── Loading Skeleton ─────────────────────────────────────────────────────── */
function TripDetailsLoading() {
  return (
    <div className="td-page">
      <DashboardNavbar />
      <div className="td-loading">
        <div className="td-loading-hero" />
        <div className="td-loading-content">
          <div className="td-loading-bar" />
          <div className="td-loading-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="td-loading-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

export default function TripDetails() {
  const { t } = useTranslation(['tripDetails', 'common']);
  const { id }  = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── State ────────────────────────────────────────────────────────────────── */
  const [trip,      setTrip]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [budget,    setBudget]    = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [isFavorite,  setIsFavorite]  = useState(false);
  const [statusDraft, setStatusDraft] = useState('');

  const [feedback, setFeedback] = useState({ type: 'info', text: '' });

  const [inviteToken,  setInviteToken]  = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');

  const [actionState, setActionState] = useState({
    refreshing: false,
    togglingFavorite: false,
    savingStatus: false,
    downloadingPdf: false,
    generatingInvite: false,
    upgradingSchedule: false,
  });

  /* Packing checklist local state */
  const [packingChecked, setPackingChecked] = useState({});

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const members = useMemo(() => trip?.group?.members || [], [trip?.group?.members]);
  const itineraryDays = useMemo(
    () => normalizeItinerary(trip?.itinerary, trip?.startDate),
    [trip?.itinerary, trip?.startDate]
  );

  const currentMember = useMemo(() => {
    if (!user?._id || members.length === 0) return null;
    return members.find((member) => {
      const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
      return String(memberUserId) === String(user._id);
    });
  }, [members, user?._id]);

  const canEditTrip = currentMember?.role === 'owner' || currentMember?.role === 'editor';

  const statusOptions = useMemo(() => {
    const unique = new Set(STATUS_OPTIONS);
    if (trip?.status) unique.add(trip.status);
    return Array.from(unique);
  }, [trip?.status]);

  /* ── Feedback auto-dismiss ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!feedback.text) return undefined;
    const timer = window.setTimeout(() => setFeedback((prev) => ({ ...prev, text: '' })), 4200);
    return () => window.clearTimeout(timer);
  }, [feedback.text]);

  /* ── Data fetching ────────────────────────────────────────────────────────── */
  const loadTripDetails = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setActionState((prev) => ({ ...prev, refreshing: true }));
    }
    setError('');

    try {
      const [tripRes, budgetRes, analyticsRes] = await Promise.allSettled([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/expenses/budget`),
        api.get(`/trips/${id}/expenses/analytics`),
      ]);

      if (tripRes.status === 'fulfilled') {
        const nextTrip = tripRes.value?.data?.data?.trip || tripRes.value?.data?.trip || null;
        if (!nextTrip) setError('Trip data not found.');
        setTrip(nextTrip);
      } else {
        throw tripRes.reason;
      }

      if (budgetRes.status === 'fulfilled') {
        setBudget(budgetRes.value?.data?.data?.budget || budgetRes.value?.data?.budget || null);
      } else {
        setBudget(null);
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value?.data?.data?.analytics || analyticsRes.value?.data?.analytics || null);
      } else {
        setAnalytics(null);
      }
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch trip details.'));
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setActionState((prev) => ({ ...prev, refreshing: false }));
      }
    }
  }, [id]);

  useEffect(() => { loadTripDetails(true); }, [loadTripDetails]);

  useEffect(() => {
    if (!trip) return;
    setIsFavorite(Boolean(trip.favorite));
    setStatusDraft(trip.status || '');
  }, [trip]);

  /* ── Action handlers ──────────────────────────────────────────────────────── */
  const handleFavoriteToggle = async () => {
    if (!trip) return;
    const previous = isFavorite;
    setIsFavorite(!previous);
    setActionState((prev) => ({ ...prev, togglingFavorite: true }));
    try {
      const { data } = await api.patch(`/trips/${id}/favorite`);
      const savedFavorite = data?.data?.favorite;
      if (typeof savedFavorite === 'boolean') setIsFavorite(savedFavorite);
      setTrip((prev) => (prev ? { ...prev, favorite: typeof savedFavorite === 'boolean' ? savedFavorite : !previous } : prev));
    } catch (err) {
      setIsFavorite(previous);
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to update favorite status.') });
    } finally {
      setActionState((prev) => ({ ...prev, togglingFavorite: false }));
    }
  };

  const handleStatusSave = async () => {
    if (!statusDraft || !trip || statusDraft === trip.status) return;
    setActionState((prev) => ({ ...prev, savingStatus: true }));
    try {
      const { data } = await api.patch(`/trips/${id}/status`, { status: statusDraft });
      const nextTrip = data?.data?.trip;
      if (nextTrip) {
        setTrip((prev) => ({ ...prev, ...nextTrip }));
        setStatusDraft(nextTrip.status || statusDraft);
      } else {
        setTrip((prev) => (prev ? { ...prev, status: statusDraft } : prev));
      }
      setFeedback({ type: 'success', text: 'Trip status updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to update trip status.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingStatus: false }));
    }
  };

  const handleDownloadPdf = async () => {
    setActionState((prev) => ({ ...prev, downloadingPdf: true }));
    try {
      const response = await api.get(`/trips/${id}/download`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      const destName = (trip?.destination || 'trip').replace(/\s+/g, '-').toLowerCase();
      link.download = `waymate-${destName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setFeedback({ type: 'success', text: 'Trip PDF downloaded.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to download trip PDF.') });
    } finally {
      setActionState((prev) => ({ ...prev, downloadingPdf: false }));
    }
  };

  const handleGenerateInvite = async () => {
    setActionState((prev) => ({ ...prev, generatingInvite: true }));
    try {
      const { data } = await api.post(`/trips/${id}/generate-invite`);
      const token     = data?.data?.inviteToken || '';
      const expiresAt = data?.data?.expiresAt || '';
      setInviteToken(token);
      setInviteExpiry(expiresAt);
      if (token) setFeedback({ type: 'success', text: 'Invite token generated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to generate invite token.') });
    } finally {
      setActionState((prev) => ({ ...prev, generatingInvite: false }));
    }
  };

  const handleCopyToken = async () => {
    if (!inviteToken) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteToken);
      } else {
        const helper = document.createElement('textarea');
        helper.value = inviteToken;
        helper.setAttribute('readonly', '');
        helper.style.position = 'absolute';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      setFeedback({ type: 'success', text: 'Invite token copied to clipboard.' });
    } catch {
      setFeedback({ type: 'error', text: 'Could not copy invite token.' });
    }
  };

  const handleUpgradeSmartSchedule = async () => {
    setActionState((prev) => ({ ...prev, upgradingSchedule: true }));
    try {
      const { data } = await api.post(`/trips/${id}/smart-schedule`);
      const schedule = data?.data?.schedule;
      if (schedule) setTrip((prev) => (prev ? { ...prev, smartSchedule: schedule } : prev));
      setFeedback({ type: 'success', text: 'Smart transit schedule generated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to generate smart schedule.') });
    } finally {
      setActionState((prev) => ({ ...prev, upgradingSchedule: false }));
    }
  };

  /* ── Render guards ────────────────────────────────────────────────────────── */
  if (loading) return <TripDetailsLoading />;

  if (error || !trip) {
    return (
      <div className="td-page">
        <DashboardNavbar />
        <div className="td-error">
          <VscError />
          <h2>{error || 'Trip data not found.'}</h2>
          <div className="td-error-actions">
            <button type="button" className="td-btn-primary" onClick={() => loadTripDetails(true)}>
              <VscLoading className={actionState.refreshing ? 'td-spin' : ''} /> Retry
            </button>
            <button type="button" className="td-btn-ghost" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currencyCode = budget?.currency || trip?.preferences?.currency || 'USD';
  const isPassive = trip?.source === 'passive_detection_v3_ml';
  const isEco     = trip?.natpacMetrics?.sustainableMode === true;

  const totalPointsOfInterest =
    (trip?.attractions?.length || 0) +
    (trip?.foodRecommendations?.length || 0) +
    (trip?.accommodationSuggestions?.length || 0);

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="td-page">
      <DashboardNavbar />

      {/* Atmospheric ambient lighting */}
      <div className="td-ambient" aria-hidden="true">
        <div className="td-orb td-orb-1" />
        <div className="td-orb td-orb-2" />
      </div>

      {/* ── HERO BANNER ── */}
      <header className="td-hero">
        <img
          src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1400&q=80'}
          alt={trip.destination}
          className="td-hero-img"
          loading="lazy"
          decoding="async"
        />
        <div className="td-hero-overlay" />

        {/* Hero Top Navigation & Controls */}
        <div className="td-hero-top">
          <Link to="/trips" className="td-back-link">
            <VscArrowLeft /> {t('tripDetails:backToDashboard', { defaultValue: 'All Journeys' })}
          </Link>
          <div className="td-hero-actions">
            <button
              type="button"
              className={`td-icon-btn ${isFavorite ? 'is-active' : ''}`}
              onClick={handleFavoriteToggle}
              disabled={actionState.togglingFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <VscHeart />
            </button>
            {canEditTrip && (
              <Link
                to={`/trip/${trip._id}/settings`}
                className="td-icon-btn"
                aria-label="Expedition Settings"
                title="Expedition Settings"
              >
                <VscSettingsGear />
              </Link>
            )}
          </div>
        </div>

        {/* Hero Expedition Summary */}
        <div className="td-hero-content">
          <div className="td-hero-badges">
            <span className="td-hero-badge">{titleCase(trip.status)}</span>
            {isPassive && <span className="td-hero-badge is-auto">✦ Auto-detected</span>}
            {isEco     && <span className="td-hero-badge is-eco">🌿 Eco Transit</span>}
          </div>

          <h1 className="td-hero-title">{trip.destination}</h1>

          <div className="td-hero-meta">
            <span className="td-hero-meta-item">
              <VscCalendar /> {formatDate(trip.startDate)}
            </span>
            <span className="td-hero-meta-sep">→</span>
            <span className="td-hero-meta-item">
              <VscCalendar /> {formatDate(trip.endDate)}
            </span>
            <span className="td-hero-meta-sep">·</span>
            <span className="td-hero-meta-item">
              <VscOrganization /> {trip.travelers || 1} Traveler{trip.travelers !== 1 ? 's' : ''}
            </span>
            {budget?.total > 0 && (
              <>
                <span className="td-hero-meta-sep">·</span>
                <span className="td-hero-meta-item">
                  <GiTakeMyMoney /> {formatCurrency(budget.total, currencyCode)} Budget
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── TOAST FEEDBACK ── */}
      {feedback.text && (
        <div className="td-toast-wrap">
          <Toast
            type={feedback.type}
            message={feedback.text}
            onClose={() => setFeedback({ type: 'info', text: '' })}
          />
        </div>
      )}

      {/* ── INVITE TOKEN POPUP ── */}
      {inviteToken && (
        <div className="td-invite-card">
          <div>
            <h3>Squad Invitation Generated</h3>
            <p>Share this token with co-travelers to grant immediate squad access.</p>
            <code>{inviteToken}</code>
            <small>Expires: {formatDateTime(inviteExpiry)}</small>
          </div>
          <button type="button" className="td-btn-sand" onClick={handleCopyToken}>
            <VscCheck /> Copy Token
          </button>
        </div>
      )}

      {/* ── CANONICAL EXPEDITION SUB-NAV ── */}
      <div className="td-subnav-container">
        <TripSubNav />
      </div>

      {/* ── EXECUTIVE ACTIONS DOCK ── */}
      <div className="td-executive-dock">
        <div className="td-dock-title">
          <span className="td-dock-dot" />
          <span>Master Journey Telemetry</span>
        </div>

        <div className="td-dock-actions">
          <button
            type="button"
            className="td-btn-ghost"
            onClick={() => loadTripDetails(false)}
            disabled={actionState.refreshing}
          >
            {actionState.refreshing ? <VscLoading className="td-spin" /> : <VscInfo />} Refresh
          </button>
          <button
            type="button"
            className="td-btn-ghost"
            onClick={handleDownloadPdf}
            disabled={actionState.downloadingPdf}
          >
            {actionState.downloadingPdf ? <VscLoading className="td-spin" /> : <VscShare />} PDF Brief
          </button>
          <button
            type="button"
            className="td-btn-ghost"
            onClick={handleGenerateInvite}
            disabled={actionState.generatingInvite}
          >
            {actionState.generatingInvite ? <VscLoading className="td-spin" /> : <VscAdd />} Invite Squad
          </button>
          <Link to={`/trip/${trip._id}/chat`} className="td-btn-ghost">
            <VscCommentDiscussion /> Squad Chat
          </Link>
          <Link to="/assistant" className="td-btn-ghost">
            <VscSparkle /> AI Co-Pilot
          </Link>
          {canEditTrip && (
            <Link to={`/trip/${trip._id}/settings`} className="td-btn-sand">
              <VscSettingsGear /> Settings
            </Link>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MASTER OVERVIEW CONTENT
          ════════════════════════════════════════════════════════════════════ */}
      <main className="td-content">
        <div className="td-content-split">

          {/* ── MAIN COLUMN ── */}
          <div className="td-col-main">

            {/* Status & Lifecycle Controls */}
            <section className="td-card">
              <div className="td-card-head">
                <h2><VscInfo /> Expedition Status & Lifecycle</h2>
                <span className="td-section-kicker">Operational Control</span>
              </div>
              <div className="td-status-row">
                <select
                  className="td-select"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{titleCase(s)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="td-btn-sand"
                  onClick={handleStatusSave}
                  disabled={actionState.savingStatus || statusDraft === trip.status}
                >
                  {actionState.savingStatus ? <VscLoading className="td-spin" /> : <VscSave />} Update Status
                </button>
                <button
                  type="button"
                  className="td-btn-ghost"
                  onClick={handleUpgradeSmartSchedule}
                  disabled={actionState.upgradingSchedule}
                  title="Generate multi-modal train & transit timings"
                >
                  {actionState.upgradingSchedule ? <VscLoading className="td-spin" /> : <FaTrainSubway />} Upgrade Transit
                </button>
              </div>
            </section>

            {/* AI Editorial Summary */}
            {trip.aiSummary && (
              <section className="td-ai-panel">
                <div className="td-ai-panel-head">
                  <VscSparkle size={18} />
                  <h3>Curated Travel Design</h3>
                  <span className="td-section-kicker" style={{ marginLeft: 'auto' }}>Editorial Intelligence</span>
                </div>
                <div className="td-ai-panel-body">
                  {trip.aiSummary.overview && (
                    <blockquote className="td-ai-overview">{trip.aiSummary.overview}</blockquote>
                  )}

                  {trip.aiSummary.highlights?.length > 0 && (
                    <div className="td-ai-section">
                      <p className="td-ai-sub-title">Signature Highlights</p>
                      <div className="td-ai-highlights">
                        {trip.aiSummary.highlights.map((item, i) => (
                          <span key={`${item}-${i}`} className="td-ai-highlight-chip">✦ {item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {trip.aiSummary.tips?.length > 0 && (
                    <div className="td-ai-section">
                      <p className="td-ai-sub-title">Local Curator Tips</p>
                      <ol className="td-ai-tips">
                        {trip.aiSummary.tips.map((item, i) => (
                          <li key={`${item}-${i}`}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {trip.aiSummary.packingChecklist?.length > 0 && (
                    <div className="td-ai-section">
                      <p className="td-ai-sub-title">Packing Checklist</p>
                      <ul className="td-ai-checklist">
                        {trip.aiSummary.packingChecklist.map((item, i) => {
                          const key = `pack-${i}`;
                          return (
                            <li key={key}>
                              <input
                                type="checkbox"
                                id={key}
                                checked={Boolean(packingChecked[key])}
                                onChange={() =>
                                  setPackingChecked((prev) => ({ ...prev, [key]: !prev[key] }))
                                }
                              />
                              <label htmlFor={key} style={{ cursor: 'pointer' }}>{item}</label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Itinerary Preview & Studio Launcher */}
            <section className="td-card">
              <div className="td-card-head">
                <h2><VscMilestone /> Scheduled Itinerary</h2>
                <span className="td-section-kicker">
                  {itineraryDays.length} Planned Day{itineraryDays.length !== 1 ? 's' : ''}
                </span>
              </div>

              {itineraryDays.length > 0 ? (
                <div className="td-itinerary-preview-list">
                  {itineraryDays.slice(0, 3).map((day) => (
                    <div key={day.day} className="td-preview-day-card">
                      <div className="td-preview-day-header">
                        <span className="td-preview-day-tag">Day {day.day}</span>
                        <h4>{day.title}</h4>
                      </div>
                      <div className="td-activity-chips">
                        {day.activities.slice(0, 3).map((activity, i) => (
                          <span key={`${activity}-${i}`} className="td-activity-chip">
                            <VscCheck /> {activity}
                          </span>
                        ))}
                        {day.activities.length > 3 && (
                          <span className="td-activity-chip is-more">
                            +{day.activities.length - 3} more activities
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="td-preview-card-footer">
                    <Link to={`/trip/${trip._id}/itinerary`} className="td-btn-sand">
                      <span>Launch Day-by-Day Studio</span>
                      <VscArrowRight />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="td-empty-preview">
                  <p className="td-muted">No custom activities configured for this itinerary yet.</p>
                  <Link to={`/trip/${trip._id}/itinerary`} className="td-btn-sand">
                    <span>Build Itinerary Schedule</span>
                    <VscArrowRight />
                  </Link>
                </div>
              )}
            </section>

            {/* Curated Places Preview & Launcher */}
            <section className="td-card">
              <div className="td-card-head">
                <h2><GiTicket /> Curated Points of Interest</h2>
                <span className="td-section-kicker">
                  {totalPointsOfInterest} Recommendations
                </span>
              </div>

              {totalPointsOfInterest > 0 ? (
                <div className="td-places-preview-grid">
                  {(trip.attractions || []).slice(0, 2).map((place, i) => {
                    const name = getRecommendationName(place, `Attraction ${i + 1}`);
                    const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.attractions;
                    const { location } = getRecommendationMeta(place);
                    return (
                      <div key={`att-${i}`} className="td-place-preview-item">
                        <img src={image} alt={name} className="td-place-preview-thumb" loading="lazy" decoding="async" />
                        <div className="td-place-preview-info">
                          <span className="td-place-tag">Must-See Sight</span>
                          <strong>{name}</strong>
                          {location && <small>{location}</small>}
                        </div>
                      </div>
                    );
                  })}
                  {(trip.foodRecommendations || []).slice(0, 2).map((place, i) => {
                    const name = getRecommendationName(place, `Food spot ${i + 1}`);
                    const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.food;
                    const { location } = getRecommendationMeta(place);
                    return (
                      <div key={`food-${i}`} className="td-place-preview-item">
                        <img src={image} alt={name} className="td-place-preview-thumb" loading="lazy" decoding="async" />
                        <div className="td-place-preview-info">
                          <span className="td-place-tag is-dining">Authentic Dining</span>
                          <strong>{name}</strong>
                          {location && <small>{location}</small>}
                        </div>
                      </div>
                    );
                  })}
                  <div className="td-preview-card-footer" style={{ gridColumn: '1 / -1' }}>
                    <Link to={`/trip/${trip._id}/places`} className="td-btn-sand">
                      <span>Explore All Verified Places</span>
                      <VscArrowRight />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="td-empty-preview">
                  <p className="td-muted">Curated area recommendations will appear once intelligence pipelines complete.</p>
                  <Link to={`/trip/${trip._id}/places`} className="td-btn-sand">
                    <span>Browse Curated Directory</span>
                    <VscArrowRight />
                  </Link>
                </div>
              )}
            </section>

            {/* Smart Rail & Transit Schedule Preview */}
            {trip.smartSchedule?.options?.length > 0 && (
              <section className="td-card">
                <div className="td-card-head">
                  <h2><FaTrainSubway /> Multi-Modal Smart Rail Schedule</h2>
                  <span className="td-section-kicker">Live Connections</span>
                </div>
                <div className="td-schedule-list">
                  {trip.smartSchedule.options.slice(0, 3).map((opt, i) => (
                    <div key={`${opt.trainNumber}-${i}`} className="td-schedule-item">
                      <div className="td-schedule-train-head">
                        <h4>{opt.trainName}</h4>
                        <span className="td-train-num">#{opt.trainNumber}</span>
                      </div>
                      <p>{opt.departureTime} → {opt.arrivalTime} · {opt.duration}</p>
                      {opt.availableClasses?.length > 0 && (
                        <div className="td-class-chips">
                          {opt.availableClasses.map((cls) => (
                            <span key={cls} className="td-class-chip">{cls}</span>
                          ))}
                        </div>
                      )}
                      {opt.recommendationReason && <em>{opt.recommendationReason}</em>}
                    </div>
                  ))}
                  <div className="td-preview-card-footer">
                    <Link to={`/trip/${trip._id}/transit`} className="td-btn-ghost">
                      <span>View Full Transit Hub</span>
                      <VscArrowRight />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Active Alerts */}
            {trip.alerts?.length > 0 && (
              <section className="td-card td-card--alert">
                <div className="td-card-head">
                  <h2><VscWarning /> Expedition Alerts</h2>
                </div>
                <div className="td-alert-list">
                  {trip.alerts.map((alert, i) => (
                    <div key={i} className="td-alert-item">
                      <VscWarning />
                      <p>{typeof alert === 'string' ? alert : alert?.message || JSON.stringify(alert)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Local Events */}
            {trip.localEvents?.length > 0 && (
              <section className="td-card">
                <div className="td-card-head">
                  <h2><GiTicket /> Local Destination Events</h2>
                </div>
                <div className="td-events-list">
                  {trip.localEvents.slice(0, 4).map((event, i) => {
                    const d = event.date ? new Date(event.date) : null;
                    return (
                      <div key={i} className="td-event-item">
                        {d && !Number.isNaN(d.getTime()) ? (
                          <div className="td-event-date">
                            <span>{d.toLocaleString('default', { month: 'short' })}</span>
                            <strong>{d.getDate()}</strong>
                          </div>
                        ) : null}
                        <div className="td-event-copy">
                          <strong>{event.name || event.title || 'Local Event'}</strong>
                          {event.description && <p>{event.description}</p>}
                          {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer">View details →</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Route Options */}
            {(trip.routeInfo?.fastest || trip.routeInfo?.cheapest) && (
              <section className="td-card">
                <div className="td-card-head">
                  <h2><VscLocation /> Route Intelligence</h2>
                </div>
                <div className="td-route-grid">
                  {trip.routeInfo.fastest && (
                    <div className="td-route-card">
                      <span className="td-route-card-label">⚡ Fastest Route</span>
                      <h4>{trip.routeInfo.fastest.name || 'Optimal Velocity'}</h4>
                      <p>{trip.routeInfo.fastest.duration || trip.routeInfo.fastest.description || ''}</p>
                    </div>
                  )}
                  {trip.routeInfo.cheapest && (
                    <div className="td-route-card">
                      <span className="td-route-card-label">💰 Economical Route</span>
                      <h4>{trip.routeInfo.cheapest.name || 'Budget Efficient'}</h4>
                      <p>{trip.routeInfo.cheapest.cost || trip.routeInfo.cheapest.description || ''}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* ── SIDE COLUMN ── */}
          <div className="td-col-side">

            {/* Financial Telemetry Snapshot */}
            <section className="td-card">
              <div className="td-card-head">
                <h2><GiTakeMyMoney /> Budget Telemetry</h2>
              </div>
              {budget ? (
                <div className="td-budget-snapshot">
                  <div className="td-metric-row">
                    <div className="td-metric-item">
                      <span>Total Budget</span>
                      <strong>{formatCurrency(budget.total, currencyCode)}</strong>
                    </div>
                    <div className="td-metric-item">
                      <span>Spent</span>
                      <strong>{formatCurrency(budget.spent, currencyCode)}</strong>
                    </div>
                    <div className="td-metric-item">
                      <span>Remaining</span>
                      <strong>{formatCurrency(budget.remaining, currencyCode)}</strong>
                    </div>
                  </div>

                  <div className="td-progress-wrap">
                    <div className="td-progress-label">
                      <span>
                        {Number(budget.percentageUsed) > 100 ? '⚠ Over Budget' : 'Spend Pace'}
                      </span>
                      <span>{Math.min(100, Number(budget.percentageUsed) || 0).toFixed(0)}%</span>
                    </div>
                    <div className="td-progress-bar">
                      <div
                        className={`td-progress-fill ${Number(budget.percentageUsed) > 100 ? 'is-over' : ''}`}
                        style={{ width: `${Math.min(100, Number(budget.percentageUsed) || 0)}%` }}
                      />
                    </div>
                  </div>

                  {budget.categoryStatus && (
                    <div className="td-category-list">
                      {Object.entries(budget.categoryStatus).slice(0, 4).map(([category, status]) => (
                        <div key={category} className="td-category-row">
                          <div className="td-category-head">
                            <span>{titleCase(category)}</span>
                            <small>{Math.round(Number(status?.percentage) || 0)}%</small>
                          </div>
                          <div className="td-progress-bar">
                            <div
                              className="td-progress-fill"
                              style={{ width: `${Math.min(100, Number(status?.percentage) || 0)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link to={`/trip/${trip._id}/expenses`} className="td-btn-sand" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                    <GiTakeMyMoney /> Open Expense Ledger
                  </Link>
                </div>
              ) : (
                <div className="td-empty-card">
                  <p className="td-muted">No budget targets initialized yet.</p>
                  <Link to={`/trip/${trip._id}/expenses`} className="td-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    <GiTakeMyMoney /> Set Budget &amp; Log Expenses
                  </Link>
                </div>
              )}
            </section>

            {/* Expense Analytics */}
            {analytics && (
              <section className="td-card">
                <div className="td-card-head">
                  <h2><VscInfo /> Financial Analytics</h2>
                </div>
                <div className="td-metric-row">
                  <div className="td-metric-item">
                    <span>Total Outflow</span>
                    <strong>{formatCurrency(analytics.totalSpent, analytics.currency)}</strong>
                  </div>
                  <div className="td-metric-item">
                    <span>Logs</span>
                    <strong>{analytics.totalExpenses || 0}</strong>
                  </div>
                  <div className="td-metric-item">
                    <span>Avg</span>
                    <strong>{formatCurrency(analytics.averageExpense, analytics.currency)}</strong>
                  </div>
                </div>

                {analytics.topSpenders?.length > 0 && (
                  <div className="td-top-list">
                    <h4>Top Contributors</h4>
                    <ul>
                      {analytics.topSpenders.slice(0, 4).map((s) => (
                        <li key={s.userId}>
                          <span>{s.name}</span>
                          <strong>{formatCurrency(s.amount, analytics.currency)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Squad Roster Snapshot */}
            <section className="td-card">
              <div className="td-card-head">
                <h2><VscOrganization /> Expedition Squad</h2>
                <span className="td-section-kicker">{members.length} Member{members.length !== 1 ? 's' : ''}</span>
              </div>
              {members.length > 0 ? (
                <div className="td-squad-snapshot">
                  <ul className="td-squad-list">
                    {members.slice(0, 4).map((member) => {
                      const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
                      const memberName   = typeof member?.userId === 'string' ? 'Member' : member?.userId?.name || 'Member';
                      const initials     = memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      const isCurrentUser = String(memberUserId) === String(user?._id || '');

                      return (
                        <li key={memberUserId || memberName} className="td-squad-item">
                          <div className="td-avatar-badge" aria-hidden="true">{initials}</div>
                          <div className="td-squad-info">
                            <strong>{memberName}{isCurrentUser ? ' (You)' : ''}</strong>
                            <small>{titleCase(member.role || 'viewer')}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <Link to={`/trip/${trip._id}/members`} className="td-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}>
                    <VscOrganization /> Manage Squad &amp; Demographics
                  </Link>
                </div>
              ) : (
                <div className="td-empty-card">
                  <p className="td-muted">No squad members attached to this expedition.</p>
                  <Link to={`/trip/${trip._id}/members`} className="td-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    <VscAdd /> Invite Squad Members
                  </Link>
                </div>
              )}
            </section>

          </div>

        </div>
      </main>
    </div>
  );
}
