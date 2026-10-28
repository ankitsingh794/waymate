import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  VscAdd,
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscEdit,
  VscError,
  VscHeart,
  VscInfo,
  VscLocation,
  VscLoading,
  VscMilestone,
  VscOrganization,
  VscSave,
  VscShare,
  VscSparkle,
  VscTrash,
  VscWarning,
} from 'react-icons/vsc';
import { GiForkKnifeSpoon, GiTakeMyMoney, GiTicket } from 'react-icons/gi';
import { IoPeopleSharp } from 'react-icons/io5';
import { FaTrainSubway } from 'react-icons/fa6';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { Toast, useConfirm } from '../../components/UI';
import './Details.css';

/* ─── Constants ────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  'planning', 'upcoming', 'active', 'completed', 'canceled',
  'planned', 'ongoing', 'in_progress', 'pending_confirmation', 'unconfirmed',
];
const AGE_GROUP_OPTIONS = ['<18', '18-35', '36-60', '>60'];
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];
const TRACKING_MODE_OPTIONS = [
  'walking', 'running', 'cycling', 'driving', 'public_transport', 'still', 'unknown',
];
const RECOMMENDATION_FALLBACK_IMAGES = {
  attractions: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=640&q=80',
  food:        'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=640&q=80',
  stays:       'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=640&q=80',
};

const DONUT_COLORS = ['#173328', '#2a5a46', '#d7bc9c', '#1f4333', '#6e8278'];
const CATEGORY_KEYS = ['travel', 'accommodation', 'activities', 'food', 'other'];

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'itinerary',  label: 'Itinerary' },
  { id: 'places',     label: 'Places' },
  { id: 'budget',     label: 'Budget' },
  { id: 'tracking',   label: 'Tracking' },
  { id: 'members',    label: 'Members' },
];

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

function formatDuration(milliseconds) {
  const value = Number(milliseconds);
  if (!Number.isFinite(value) || value <= 0) return 'Unknown';
  const totalMinutes = Math.round(value / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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

function toCoordinate(point) {
  if (!point) return null;
  const latitude  = Number(point.latitude  ?? point.lat);
  const longitude = Number(point.longitude ?? point.lon ?? point.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [longitude, latitude];
}

function sampleCoordinates(coordinates, maxPoints = 180) {
  if (!Array.isArray(coordinates) || coordinates.length <= maxPoints) return coordinates || [];
  const step = Math.ceil(coordinates.length / maxPoints);
  return coordinates.filter((_, index) => index % step === 0 || index === coordinates.length - 1);
}

function toSvgPolylinePoints(coordinates, width = 600, height = 220, padding = 14) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
  const longitudes = coordinates.map((p) => p[0]);
  const latitudes  = coordinates.map((p) => p[1]);
  const minLon = Math.min(...longitudes); const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);  const maxLat = Math.max(...latitudes);
  const lonRange = maxLon - minLon || 0.000001;
  const latRange = maxLat - minLat || 0.000001;
  return coordinates
    .map(([lon, lat]) => {
      const x = padding + ((lon - minLon) / lonRange) * (width - padding * 2);
      const y = height - padding - ((lat - minLat) / latRange) * (height - padding * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
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
          editable: typeof item?.day === 'number',
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
    .map(([day, activities]) => ({ day, title: `Day ${day}`, activities, editable: false }));
}

/* ─── StarRating helper ────────────────────────────────────────────────────── */
function StarRating({ value }) {
  return (
    <div className="td-place-rating" aria-label={`Rating: ${value.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={value >= n ? 'td-star-fill' : value >= n - 0.5 ? 'td-star-half' : 'td-star-empty'}
        >
          ★
        </span>
      ))}
      <span className="td-place-rating-val">{value.toFixed(1)}</span>
    </div>
  );
}

/* ─── Donut chart helper ────────────────────────────────────────────────────── */
function DonutChart({ segments, size = 140 }) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;
  return (
    <svg
      viewBox="0 0 120 120"
      className="td-donut-svg"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {segments.map((seg, i) => {
        const frac = seg.value / total;
        const dash = frac * circ;
        const gap  = circ - dash;
        const el = (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={18}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ / total + circ / 4}
            style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        );
        offset += frac;
        return el;
      })}
      {/* Center label */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#173328" fontFamily="Playfair Display, Georgia, serif">
        Budget
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7.5" fill="#6e8278" fontFamily="Inter, sans-serif">
        breakdown
      </text>
    </svg>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
function TripDetailsLoading() {
  return (
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
  );
}

/* ─── Day Edit Modal ────────────────────────────────────────────────────────── */
function DayEditModal({ day, value, onChange, onClose, onSave, saving }) {
  if (!day) return null;
  return (
    <div className="td-modal-backdrop" onClick={onClose} role="presentation">
      <div className="td-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="td-modal-head">
          <h3>Edit {day.title}</h3>
          <button type="button" onClick={onClose} className="td-btn-ghost">Close</button>
        </div>
        <p className="td-muted">Add one activity per line and save to update trip itinerary.</p>
        <textarea
          className="td-textarea"
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Morning city walk\nLunch near central station\nMuseum visit'}
        />
        <div className="td-modal-actions">
          <button type="button" className="td-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="td-btn-primary" onClick={onSave} disabled={saving}>
            {saving ? <VscLoading className="td-spin" /> : <VscSave />} Save Day Plan
          </button>
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
  const confirm  = useConfirm();

  /* ── State ────────────────────────────────────────────────────────────────── */
  const [trip,      setTrip]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const [budget,    setBudget]    = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [isFavorite,           setIsFavorite]           = useState(false);
  const [statusDraft,          setStatusDraft]          = useState('');
  const [modeCorrectionDraft,  setModeCorrectionDraft]  = useState('unknown');
  const [mlBannerDismissed,    setMlBannerDismissed]    = useState(false);

  const [feedback, setFeedback] = useState({ type: 'info', text: '' });

  const [inviteToken,  setInviteToken]  = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');

  const [actionState, setActionState] = useState({
    refreshing: false, togglingFavorite: false, savingStatus: false,
    downloadingPdf: false, generatingInvite: false, upgradingSchedule: false,
    confirmingMode: false, savingMemberDetails: false, savingItinerary: false,
    memberActionKey: '',
  });

  const [memberForm, setMemberForm] = useState({ ageGroup: '', gender: '', relation: '' });
  const [editingDay,     setEditingDay]     = useState(null);
  const [editingDayText, setEditingDayText] = useState('');

  /* ── Tab state ────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('overview');
  const [placesTab, setPlacesTab] = useState('attractions');

  /* Packing checklist local state */
  const [packingChecked, setPackingChecked] = useState({});

  const tabNavRef   = useRef(null);
  const indicatorRef = useRef(null);
  const tabBtnRefs  = useRef({});

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const members = useMemo(() => trip?.group?.members || [], [trip?.group?.members]);
  const itineraryDays = useMemo(
    () => normalizeItinerary(trip?.itinerary, trip?.startDate),
    [trip?.itinerary, trip?.startDate]
  );
  const supportsDayEdits = useMemo(
    () => Array.isArray(trip?.itinerary) && trip.itinerary.some((item) => typeof item?.day === 'number'),
    [trip?.itinerary]
  );

  const currentMember = useMemo(() => {
    if (!user?._id || members.length === 0) return null;
    return members.find((member) => {
      const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
      return String(memberUserId) === String(user._id);
    });
  }, [members, user?._id]);

  const canEditTrip = currentMember?.role === 'owner' || currentMember?.role === 'editor';
  const isOwner     = currentMember?.role === 'owner';

  const statusOptions = useMemo(() => {
    const unique = new Set(STATUS_OPTIONS);
    if (trip?.status) unique.add(trip.status);
    return Array.from(unique);
  }, [trip?.status]);

  const hasRecommendations =
    (trip?.attractions?.length || 0) > 0 ||
    (trip?.foodRecommendations?.length || 0) > 0 ||
    (trip?.accommodationSuggestions?.length || 0) > 0;

  const trackingData = useMemo(() => {
    const segments = Array.isArray(trip?.segments) ? trip.segments.filter(Boolean) : [];
    const allCoordinates = [];

    segments.forEach((segment) => {
      if (Array.isArray(segment?.path?.coordinates) && segment.path.coordinates.length > 0) {
        segment.path.coordinates.forEach((coordinate) => {
          if (!Array.isArray(coordinate) || coordinate.length < 2) return;
          const longitude = Number(coordinate[0]);
          const latitude  = Number(coordinate[1]);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            allCoordinates.push([longitude, latitude]);
          }
        });
        return;
      }
      if (Array.isArray(segment?.rawDataPoints) && segment.rawDataPoints.length > 0) {
        segment.rawDataPoints.forEach((point) => {
          const coord = toCoordinate(point);
          if (coord) allCoordinates.push(coord);
        });
      }
    });

    if (allCoordinates.length === 0 && Array.isArray(trip?.path?.coordinates)) {
      trip.path.coordinates.forEach((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) return;
        const longitude = Number(coordinate[0]);
        const latitude  = Number(coordinate[1]);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          allCoordinates.push([longitude, latitude]);
        }
      });
    }
    if (allCoordinates.length === 0 && Array.isArray(trip?.rawDataPoints)) {
      trip.rawDataPoints.forEach((point) => {
        const coord = toCoordinate(point);
        if (coord) allCoordinates.push(coord);
      });
    }

    const sampledCoordinates = sampleCoordinates(allCoordinates, 180);
    const polylinePoints = toSvgPolylinePoints(sampledCoordinates);

    const segmentStart = segments[0]?.startTime ? new Date(segments[0].startTime) : null;
    const lastSegment  = segments[segments.length - 1];
    const segmentEnd   = lastSegment?.endTime ? new Date(lastSegment.endTime) : null;
    const tripStart    = trip?.startDate ? new Date(trip.startDate) : null;
    const tripEnd      = trip?.endDate   ? new Date(trip.endDate)   : null;

    const start = segmentStart && !Number.isNaN(segmentStart.getTime()) ? segmentStart : tripStart;
    const end   = segmentEnd   && !Number.isNaN(segmentEnd.getTime())   ? segmentEnd   : tripEnd;
    const durationMs =
      start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
        ? end.getTime() - start.getTime()
        : 0;

    const modeMap = new Map();
    segments.forEach((segment) => {
      const mode = titleCase(segment?.confirmedMode || segment?.mode || 'unknown');
      modeMap.set(mode, (modeMap.get(mode) || 0) + 1);
    });
    const modeSummary = Array.from(modeMap.entries())
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);

    const detectedMode =
      trip?.confirmedMode ||
      trip?.mlPrediction?.detectedMode ||
      trip?.passiveData?.confirmedMode ||
      trip?.passiveData?.detectedMode ||
      'unknown';

    const confidencePercent = Math.round(
      Number(
        trip?.mlPrediction?.accuracy ||
        trip?.mlPrediction?.confidence ||
        trip?.passiveData?.modeConfidence ||
        trip?.confidence ||
        0
      ) * 100
    );

    const needsConfirmation =
      Boolean(trip?.mlPrediction?.requiresUserConfirmation) || trip?.status === 'unconfirmed';

    return {
      segments,
      totalPoints: allCoordinates.length,
      sampledCoordinates,
      polylinePoints,
      modeSummary,
      duration: formatDuration(durationMs),
      detectedMode: titleCase(detectedMode),
      confidencePercent,
      needsConfirmation,
      hasTrackingData:
        segments.length > 0 ||
        allCoordinates.length > 1 ||
        Boolean(trip?.passiveData?.isPassivelyDetected) ||
        Boolean(trip?.mlPrediction?.detectedMode),
    };
  }, [trip]);

  /* Budget donut segments */
  const donutSegments = useMemo(() => {
    if (!budget?.categoryStatus) return [];
    return CATEGORY_KEYS
      .map((key, i) => ({
        label: titleCase(key),
        value: Number(budget.categoryStatus[key]?.percentage) || 0,
        color: DONUT_COLORS[i] || '#ccc',
      }))
      .filter((s) => s.value > 0);
  }, [budget]);

  /* ── Tab indicator (sliding underline) ────────────────────────────────────── */
  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeTab];
    const indicator = indicatorRef.current;
    const nav = tabNavRef.current;
    if (!btn || !indicator || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const scrollLeft = nav.scrollLeft || 0;
    indicator.style.left    = `${btnRect.left - navRect.left + scrollLeft}px`;
    indicator.style.width   = `${btnRect.width}px`;
    indicator.style.opacity = '1';
  }, [activeTab]);

  /* ── Feedback auto-dismiss ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!feedback.text) return undefined;
    const id = window.setTimeout(() => setFeedback((prev) => ({ ...prev, text: '' })), 4200);
    return () => window.clearTimeout(id);
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
    setModeCorrectionDraft(
      trip.confirmedMode ||
      trip.mlPrediction?.detectedMode ||
      trip.passiveData?.confirmedMode ||
      trip.passiveData?.detectedMode ||
      'unknown'
    );
    if (currentMember) {
      setMemberForm({
        ageGroup: currentMember.ageGroup || '',
        gender:   currentMember.gender   || '',
        relation: currentMember.relation || '',
      });
    }
  }, [trip, currentMember]);

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
      const token    = data?.data?.inviteToken || '';
      const expiresAt = data?.data?.expiresAt || '';
      setInviteToken(token);
      setInviteExpiry(expiresAt);
      if (token) setFeedback({ type: 'success', text: 'Invite token generated.' });
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
      setFeedback({ type: 'success', text: 'Smart schedule generated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to generate smart schedule.') });
    } finally {
      setActionState((prev) => ({ ...prev, upgradingSchedule: false }));
    }
  };

  const handleConfirmTrackingMode = async () => {
    if (!modeCorrectionDraft) return;
    setActionState((prev) => ({ ...prev, confirmingMode: true }));
    try {
      const { data } = await api.post(`/tracking/trips/${id}/confirm`, { correctedMode: modeCorrectionDraft });
      const confirmedTrip = data?.data?.trip;
      if (confirmedTrip) {
        setTrip((prev) => ({ ...prev, ...confirmedTrip }));
      } else {
        await loadTripDetails(false);
      }
      setFeedback({ type: 'success', text: 'Tracking mode confirmed successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to confirm tracking mode.') });
    } finally {
      setActionState((prev) => ({ ...prev, confirmingMode: false }));
    }
  };

  const handleSaveMyMemberDetails = async () => {
    setActionState((prev) => ({ ...prev, savingMemberDetails: true }));
    try {
      const payload = {
        ageGroup: memberForm.ageGroup || undefined,
        gender:   memberForm.gender   || undefined,
        relation: memberForm.relation.trim() || undefined,
      };
      const { data } = await api.patch(`/trips/${id}/members/me`, payload);
      const updatedMember = data?.data?.member;
      if (updatedMember && user?._id) {
        setTrip((prev) => {
          if (!prev?.group?.members) return prev;
          const nextMembers = prev.group.members.map((member) => {
            const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
            if (String(memberUserId) !== String(user._id)) return member;
            return { ...member, ageGroup: updatedMember.ageGroup, gender: updatedMember.gender, relation: updatedMember.relation };
          });
          return { ...prev, group: { ...prev.group, members: nextMembers } };
        });
      }
      setFeedback({ type: 'success', text: 'Your member profile has been updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to update your member details.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingMemberDetails: false }));
    }
  };

  const handleMemberRoleChange = async (memberId, role) => {
    if (!memberId) return;
    const actionKey = `${memberId}:role`;
    setActionState((prev) => ({ ...prev, memberActionKey: actionKey }));
    try {
      const { data } = await api.patch(`/trips/${id}/members/${memberId}/role`, { role });
      const nextMembers = data?.data?.members;
      if (Array.isArray(nextMembers)) {
        setTrip((prev) => (prev ? { ...prev, group: { ...prev.group, members: nextMembers } } : prev));
      } else {
        setTrip((prev) => {
          if (!prev?.group?.members) return prev;
          return {
            ...prev,
            group: {
              ...prev.group,
              members: prev.group.members.map((member) => {
                const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
                if (String(memberUserId) !== String(memberId)) return member;
                return { ...member, role };
              }),
            },
          };
        });
      }
      setFeedback({ type: 'success', text: 'Member role updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to update member role.') });
    } finally {
      setActionState((prev) => ({ ...prev, memberActionKey: '' }));
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!memberId) return;
    const confirmed = await confirm({
      title: 'Remove member',
      message: `Remove ${memberName || 'this member'} from the trip? This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'error',
    });
    if (!confirmed) return;

    const actionKey = `${memberId}:remove`;
    setActionState((prev) => ({ ...prev, memberActionKey: actionKey }));
    try {
      const { data } = await api.delete(`/trips/${id}/members/${memberId}`);
      const nextMembers = data?.data?.members;
      if (Array.isArray(nextMembers)) {
        setTrip((prev) => (prev ? { ...prev, group: { ...prev.group, members: nextMembers } } : prev));
      } else {
        setTrip((prev) => {
          if (!prev?.group?.members) return prev;
          const filtered = prev.group.members.filter((member) => {
            const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
            return String(memberUserId) !== String(memberId);
          });
          return { ...prev, group: { ...prev.group, members: filtered } };
        });
      }
      setFeedback({ type: 'success', text: 'Member removed from trip.' });
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to remove member.') });
    } finally {
      setActionState((prev) => ({ ...prev, memberActionKey: '' }));
    }
  };

  const openDayEditor = (day) => {
    if (!day?.editable || !supportsDayEdits || !canEditTrip) return;
    setEditingDay(day);
    setEditingDayText(day.activities.join('\n'));
  };

  const handleSaveDayPlan = async () => {
    if (!editingDay?.day) return;
    const activities = editingDayText
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean);

    if (activities.length === 0) {
      setFeedback({ type: 'error', text: 'Please add at least one activity.' });
      return;
    }

    setActionState((prev) => ({ ...prev, savingItinerary: true }));
    try {
      const { data } = await api.patch(`/trips/${id}/itinerary/${editingDay.day}`, { activities });
      const updatedDay = data?.data?.day;
      setTrip((prev) => {
        if (!prev?.itinerary) return prev;
        const nextItinerary = prev.itinerary.map((item) => {
          if (Number(item?.day) !== Number(editingDay.day)) return item;
          return { ...item, ...(updatedDay || {}), activities };
        });
        return { ...prev, itinerary: nextItinerary };
      });
      setFeedback({ type: 'success', text: `Updated itinerary for Day ${editingDay.day}.` });
      setEditingDay(null);
      setEditingDayText('');
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Failed to update itinerary day.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingItinerary: false }));
    }
  };

  /* ── Render guards ────────────────────────────────────────────────────────── */
  if (loading)       return <TripDetailsLoading />;
  if (error || !trip) return (
    <div className="td-error">
      <VscError />
      <h2>{error || 'Trip data not found.'}</h2>
      <div className="td-error-actions">
        <button type="button" className="td-btn-primary" onClick={() => loadTripDetails(true)}>
          <VscLoading className={actionState.refreshing ? 'td-spin' : ''} /> Retry
        </button>
        <button type="button" className="td-btn-ghost" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>
    </div>
  );

  const currencyCode = budget?.currency || trip?.preferences?.currency || 'USD';
  const isPassive = trip?.source === 'passive_detection_v3_ml';
  const isEco     = trip?.natpacMetrics?.sustainableMode === true;
  const isChained = Boolean(trip?.tripChain?.chainId);

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="td-page">

      {/* ── HERO ── */}
      <header className="td-hero">
        <img
          src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1400&q=80'}
          alt={trip.destination}
          className="td-hero-img"
          loading="lazy"
          decoding="async"
        />
        <div className="td-hero-overlay" />

        {/* Top row: back link + actions */}
        <div className="td-hero-top">
          <Link to="/dashboard" className="td-back-link">
            <VscArrowLeft /> {t('tripDetails:backToDashboard', { defaultValue: 'Dashboard' })}
          </Link>
          <div className="td-hero-actions">
            <button
              type="button"
              className={`td-icon-btn ${isFavorite ? 'is-active' : ''}`}
              onClick={handleFavoriteToggle}
              disabled={actionState.togglingFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <VscHeart />
            </button>
            {canEditTrip && (
              <Link to={`/trip/${trip._id}/edit`} className="td-icon-btn" aria-label="Edit trip">
                <VscEdit />
              </Link>
            )}
          </div>
        </div>

        {/* Bottom: trip info */}
        <div className="td-hero-content">
          {/* Badges row */}
          <div className="td-hero-badges">
            <span className="td-hero-badge">{titleCase(trip.status)}</span>
            {isPassive && <span className="td-hero-badge is-auto">✦ Auto-detected</span>}
            {isEco     && <span className="td-hero-badge is-eco">🌿 Eco trip</span>}
          </div>

          <h1 className="td-hero-title">{trip.destination}</h1>

          <div className="td-hero-meta">
            <span className="td-hero-meta-item">
              <VscCalendar /> {formatDate(trip.startDate)}
            </span>
            <span className="td-hero-meta-sep">→</span>
            <span className="td-hero-meta-item">{formatDate(trip.endDate)}</span>

            <span className="td-hero-meta-sep">·</span>
            <span className="td-hero-meta-item">
              <IoPeopleSharp /> {trip.travelers || 1} traveler{(trip.travelers || 1) > 1 ? 's' : ''}
            </span>

            <span className="td-hero-meta-sep">·</span>
            <span className="td-hero-meta-item">
              {titleCase(trip.purpose || 'leisure')}
            </span>

            {trackingData.detectedMode && trackingData.detectedMode !== 'Unknown' && (
              <>
                <span className="td-hero-meta-sep">·</span>
                <span className="td-hero-meta-item">
                  <FaTrainSubway /> {trackingData.detectedMode}
                </span>
              </>
            )}
          </div>

          {isChained && (
            <div className="td-chain-row">
              <VscMilestone /> Part of trip chain #{trip.tripChain.chainId.slice(-6)}
            </div>
          )}
        </div>
      </header>

      {/* ── ML CONFIRMATION BANNER ── */}
      {trackingData.needsConfirmation && !mlBannerDismissed && (
        <div className="td-ml-banner" role="alert">
          <div className="td-ml-banner-icon"><VscWarning /></div>
          <div className="td-ml-banner-copy">
            <strong>Detected: {trackingData.detectedMode} — please confirm</strong>
            <p>Our model detected this transport mode. Confirm below to improve tracking accuracy.</p>
            {Number.isFinite(trackingData.confidencePercent) && (
              <div className="td-ml-conf-bar">
                <progress
                  value={trackingData.confidencePercent}
                  max={100}
                  aria-label={`Confidence: ${trackingData.confidencePercent}%`}
                />
                <span>{trackingData.confidencePercent}% confidence</span>
              </div>
            )}
          </div>
          <div className="td-ml-banner-actions">
            <select
              className="td-select is-compact"
              value={modeCorrectionDraft}
              onChange={(e) => setModeCorrectionDraft(e.target.value)}
            >
              {TRACKING_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>{titleCase(mode)}</option>
              ))}
            </select>
            <button
              type="button"
              className="td-btn-primary"
              onClick={handleConfirmTrackingMode}
              disabled={actionState.confirmingMode}
            >
              {actionState.confirmingMode ? <VscLoading className="td-spin" /> : <VscCheck />} Confirm
            </button>
            <button type="button" className="td-btn-ghost" onClick={() => setMlBannerDismissed(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        variant={feedback.type}
        message={feedback.text}
        onClose={() => setFeedback((prev) => ({ ...prev, text: '' }))}
      />

      {/* ── INVITE TOKEN CARD ── */}
      {inviteToken && (
        <div className="td-invite-card">
          <div>
            <h3>Trip Invite Token</h3>
            <p>Share this token so others can join from the invite acceptance flow.</p>
            <code>{inviteToken}</code>
            <small>Expires: {formatDateTime(inviteExpiry)}</small>
          </div>
          <button type="button" className="td-btn-ghost" onClick={handleCopyToken}>
            <VscCheck /> Copy Token
          </button>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <nav className="td-tab-nav" aria-label="Trip sections">
        <div className="td-tab-nav-inner" ref={tabNavRef}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`td-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              role="tab"
              ref={(el) => { tabBtnRefs.current[tab.id] = el; }}
            >
              {tab.label}
            </button>
          ))}
          <span className="td-tab-indicator" ref={indicatorRef} aria-hidden="true" />

          {/* Quick actions (right side of tab bar) */}
          <div className="td-tab-actions">
            <button
              type="button"
              className="td-btn-ghost"
              onClick={() => loadTripDetails(false)}
              disabled={actionState.refreshing}
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.7rem' }}
            >
              {actionState.refreshing ? <VscLoading className="td-spin" /> : <VscInfo />} Refresh
            </button>
            <button
              type="button"
              className="td-btn-ghost"
              onClick={handleDownloadPdf}
              disabled={actionState.downloadingPdf}
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.7rem' }}
            >
              {actionState.downloadingPdf ? <VscLoading className="td-spin" /> : <VscShare />} PDF
            </button>
            <button
              type="button"
              className="td-btn-ghost"
              onClick={handleGenerateInvite}
              disabled={actionState.generatingInvite}
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.7rem' }}
            >
              {actionState.generatingInvite ? <VscLoading className="td-spin" /> : <VscAdd />} Invite
            </button>
            <Link to={`/trip/${trip._id}/expenses`} className="td-btn-sand" style={{ fontSize: '0.76rem', padding: '0.4rem 0.7rem' }}>
              <GiTakeMyMoney /> Expenses
            </Link>
            <Link to="/assistant" className="td-btn-sand" style={{ fontSize: '0.76rem', padding: '0.4rem 0.7rem' }}>
              <VscSparkle /> AI
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB PANELS
          ════════════════════════════════════════════════════════════════════ */}

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="td-content">
          <div className="td-content-split">
            <div className="td-col-main">

              {/* Status controls */}
              <div className="td-card">
                <div className="td-card-head">
                  <h2><VscInfo /> Status &amp; Controls</h2>
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
                    className="td-btn-primary"
                    onClick={handleStatusSave}
                    disabled={actionState.savingStatus || statusDraft === trip.status}
                  >
                    {actionState.savingStatus ? <VscLoading className="td-spin" /> : <VscSave />} Save
                  </button>
                  <button
                    type="button"
                    className="td-btn-ghost"
                    onClick={handleUpgradeSmartSchedule}
                    disabled={actionState.upgradingSchedule}
                  >
                    {actionState.upgradingSchedule ? <VscLoading className="td-spin" /> : <FaTrainSubway />} Smart Schedule
                  </button>
                </div>
              </div>

              {/* AI Summary */}
              {trip.aiSummary && (
                <div className="td-ai-panel">
                  <div className="td-ai-panel-head">
                    <VscSparkle size={16} />
                    <h3>AI Summary</h3>
                    <span className="td-section-kicker" style={{ marginLeft: 'auto' }}>Generated</span>
                  </div>
                  <div className="td-ai-panel-body">
                    {trip.aiSummary.overview && (
                      <blockquote className="td-ai-overview">{trip.aiSummary.overview}</blockquote>
                    )}

                    {trip.aiSummary.highlights?.length > 0 && (
                      <div>
                        <p className="td-ai-sub-title">Highlights</p>
                        <div className="td-ai-highlights">
                          {trip.aiSummary.highlights.map((item, i) => (
                            <span key={`${item}-${i}`} className="td-ai-highlight-chip">✦ {item}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {trip.aiSummary.tips?.length > 0 && (
                      <div>
                        <p className="td-ai-sub-title">Tips</p>
                        <ol className="td-ai-tips">
                          {trip.aiSummary.tips.map((item, i) => (
                            <li key={`${item}-${i}`}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {trip.aiSummary.packingChecklist?.length > 0 && (
                      <div>
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
                </div>
              )}

              {!trip.aiSummary && (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscSparkle /> AI Summary</h2></div>
                  <p className="td-muted">AI summary will appear once generated by planning flows.</p>
                </div>
              )}

              {/* Active Alerts */}
              {trip.alerts?.length > 0 && (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscWarning /> Active Alerts</h2></div>
                  <div className="td-alert-list">
                    {trip.alerts.map((alert, i) => (
                      <div key={i} className="td-alert-item">
                        <VscWarning />
                        <p>{typeof alert === 'string' ? alert : alert?.message || JSON.stringify(alert)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local Events */}
              {trip.localEvents?.length > 0 && (
                <div className="td-card">
                  <div className="td-card-head"><h2><GiTicket /> Local Events</h2></div>
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
                </div>
              )}

              {/* Smart Schedule */}
              {trip.smartSchedule?.options?.length > 0 && (
                <div className="td-card">
                  <div className="td-card-head"><h2><FaTrainSubway /> Smart Train Schedule</h2></div>
                  <div className="td-schedule-list">
                    {trip.smartSchedule.options.slice(0, 4).map((opt, i) => (
                      <div key={`${opt.trainNumber}-${i}`} className="td-schedule-item">
                        <h4>{opt.trainName} ({opt.trainNumber})</h4>
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
                  </div>
                </div>
              )}

              {/* Route Options */}
              {(trip.routeInfo?.fastest || trip.routeInfo?.cheapest) && (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscLocation /> Route Options</h2></div>
                  <div className="td-route-grid">
                    {trip.routeInfo.fastest && (
                      <div className="td-route-card">
                        <span className="td-route-card-label">⚡ Fastest</span>
                        <h4>{trip.routeInfo.fastest.name || 'Fastest Route'}</h4>
                        <p>{trip.routeInfo.fastest.duration || trip.routeInfo.fastest.description || ''}</p>
                      </div>
                    )}
                    {trip.routeInfo.cheapest && (
                      <div className="td-route-card">
                        <span className="td-route-card-label">💰 Cheapest</span>
                        <h4>{trip.routeInfo.cheapest.name || 'Cheapest Route'}</h4>
                        <p>{trip.routeInfo.cheapest.cost || trip.routeInfo.cheapest.description || ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Side column: budget snapshot + analytics */}
            <div className="td-col-side">
              {budget ? (
                <div className="td-card">
                  <div className="td-card-head"><h2><GiTakeMyMoney /> Budget</h2></div>
                  <div className="td-metric-row">
                    <div className="td-metric-item"><span>Total</span><strong>{formatCurrency(budget.total, currencyCode)}</strong></div>
                    <div className="td-metric-item"><span>Spent</span><strong>{formatCurrency(budget.spent, currencyCode)}</strong></div>
                    <div className="td-metric-item"><span>Left</span><strong>{formatCurrency(budget.remaining, currencyCode)}</strong></div>
                  </div>
                  <div className="td-progress-wrap">
                    <div className="td-progress-label">
                      <span>Usage</span>
                      <span>{Math.min(100, Number(budget.percentageUsed) || 0).toFixed(0)}%</span>
                    </div>
                    <div className="td-progress-bar">
                      <div
                        className={`td-progress-fill ${Number(budget.percentageUsed) > 100 ? 'is-over' : ''}`}
                        style={{ width: `${Math.min(100, Number(budget.percentageUsed) || 0)}%` }}
                      />
                    </div>
                  </div>
                  <Link to={`/trip/${trip._id}/expenses`} className="td-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    <GiTakeMyMoney /> Open Expenses
                  </Link>
                </div>
              ) : (
                <div className="td-card">
                  <div className="td-card-head"><h2><GiTakeMyMoney /> Budget</h2></div>
                  <p className="td-muted">Budget data unavailable.</p>
                </div>
              )}

              {analytics ? (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscInfo /> Expense Analytics</h2></div>
                  <div className="td-metric-row">
                    <div className="td-metric-item"><span>Total Spent</span><strong>{formatCurrency(analytics.totalSpent, analytics.currency)}</strong></div>
                    <div className="td-metric-item"><span>Expenses</span><strong>{analytics.totalExpenses || 0}</strong></div>
                    <div className="td-metric-item"><span>Avg</span><strong>{formatCurrency(analytics.averageExpense, analytics.currency)}</strong></div>
                  </div>
                  {analytics.topSpenders?.length > 0 && (
                    <div className="td-top-list">
                      <h4>Top Spenders</h4>
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
                </div>
              ) : (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscInfo /> Analytics</h2></div>
                  <p className="td-muted">Analytics not available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ITINERARY ── */}
      {activeTab === 'itinerary' && (
        <div className="td-content">
          <div className="td-card">
            <div className="td-card-head">
              <h2><VscMilestone /> Itinerary</h2>
              {canEditTrip && supportsDayEdits && (
                <span className="td-section-kicker">Editable</span>
              )}
            </div>

            {itineraryDays.length > 0 ? (
              <div className="td-timeline">
                {itineraryDays.map((day) => (
                  <div key={day.day} className="td-day-block">
                    <div className="td-day-dot" aria-hidden="true">{day.day}</div>
                    <div className="td-day-content">
                      <div className="td-day-header">
                        <div>
                          <h4>{day.title}</h4>
                          <small>Day {day.day}</small>
                        </div>
                        {canEditTrip && day.editable && supportsDayEdits && (
                          <button
                            type="button"
                            className="td-btn-ghost"
                            onClick={() => openDayEditor(day)}
                            style={{ fontSize: '0.76rem', padding: '0.35rem 0.65rem' }}
                          >
                            <VscEdit /> Edit
                          </button>
                        )}
                      </div>
                      <div className="td-activity-chips">
                        {day.activities.map((activity, i) => (
                          <span key={`${activity}-${i}`} className="td-activity-chip">
                            <VscCheck /> {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="td-muted">No itinerary data available for this trip yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── PLACES ── */}
      {activeTab === 'places' && (
        <div className="td-content">
          {hasRecommendations ? (
            <div className="td-card">
              <div className="td-card-head">
                <h2><GiTicket /> Places</h2>
              </div>

              {/* Sub-tab switcher */}
              <div className="td-sub-tabs">
                <button
                  type="button"
                  className={`td-sub-tab-btn ${placesTab === 'attractions' ? 'is-active' : ''}`}
                  onClick={() => setPlacesTab('attractions')}
                >
                  <GiTicket /> Attractions {trip.attractions?.length > 0 && `(${trip.attractions.length})`}
                </button>
                <button
                  type="button"
                  className={`td-sub-tab-btn ${placesTab === 'food' ? 'is-active' : ''}`}
                  onClick={() => setPlacesTab('food')}
                >
                  <GiForkKnifeSpoon /> Food {trip.foodRecommendations?.length > 0 && `(${trip.foodRecommendations.length})`}
                </button>
                <button
                  type="button"
                  className={`td-sub-tab-btn ${placesTab === 'stays' ? 'is-active' : ''}`}
                  onClick={() => setPlacesTab('stays')}
                >
                  <VscOrganization /> Stays {trip.accommodationSuggestions?.length > 0 && `(${trip.accommodationSuggestions.length})`}
                </button>
              </div>

              {/* Attractions */}
              {placesTab === 'attractions' && (
                <div className="td-places-scroll">
                  {(trip.attractions || []).slice(0, 8).map((place, i) => {
                    const name  = getRecommendationName(place, `Attraction ${i + 1}`);
                    const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.attractions;
                    const { rating, location } = getRecommendationMeta(place);
                    return (
                      <div key={`${name}-${i}`} className="td-place-item">
                        <img src={image} alt={name} className="td-place-img" loading="lazy" decoding="async" />
                        <div className="td-place-copy">
                          <strong>{name}</strong>
                          {rating > 0 && <StarRating value={rating} />}
                          {location && <small>{location}</small>}
                          {place?.website && <a href={place.website} target="_blank" rel="noopener noreferrer">Visit website →</a>}
                        </div>
                      </div>
                    );
                  })}
                  {!trip.attractions?.length && <p className="td-muted">No attraction recommendations for this trip.</p>}
                </div>
              )}

              {/* Food */}
              {placesTab === 'food' && (
                <div className="td-places-scroll">
                  {(trip.foodRecommendations || []).slice(0, 8).map((place, i) => {
                    const name  = getRecommendationName(place, `Food spot ${i + 1}`);
                    const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.food;
                    const { rating, location } = getRecommendationMeta(place);
                    return (
                      <div key={`${name}-${i}`} className="td-place-item">
                        <img src={image} alt={name} className="td-place-img" loading="lazy" decoding="async" />
                        <div className="td-place-copy">
                          <strong>{name}</strong>
                          {rating > 0 && <StarRating value={rating} />}
                          {location && <small>{location}</small>}
                          {place?.website && <a href={place.website} target="_blank" rel="noopener noreferrer">Visit website →</a>}
                        </div>
                      </div>
                    );
                  })}
                  {!trip.foodRecommendations?.length && <p className="td-muted">No food recommendations for this trip.</p>}
                </div>
              )}

              {/* Stays */}
              {placesTab === 'stays' && (
                <div className="td-places-scroll">
                  {(trip.accommodationSuggestions || []).slice(0, 8).map((place, i) => {
                    const name  = getRecommendationName(place, `Stay ${i + 1}`);
                    const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.stays;
                    const { rating, location } = getRecommendationMeta(place);
                    return (
                      <div key={`${name}-${i}`} className="td-place-item">
                        <img src={image} alt={name} className="td-place-img" loading="lazy" decoding="async" />
                        <div className="td-place-copy">
                          <strong>{name}</strong>
                          {rating > 0 && <StarRating value={rating} />}
                          {location && <small>{location}</small>}
                          {place?.website && <a href={place.website} target="_blank" rel="noopener noreferrer">Visit website →</a>}
                        </div>
                      </div>
                    );
                  })}
                  {!trip.accommodationSuggestions?.length && <p className="td-muted">No accommodation suggestions for this trip.</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="td-card">
              <div className="td-card-head"><h2><GiTicket /> Places</h2></div>
              <p className="td-muted">No places recommendations for this trip yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── BUDGET ── */}
      {activeTab === 'budget' && (
        <div className="td-content">
          <div className="td-content-split">
            <div className="td-col-main">
              {budget ? (
                <>
                  <div className="td-card">
                    <div className="td-card-head"><h2><GiTakeMyMoney /> Budget Breakdown</h2></div>

                    {/* Donut + legend */}
                    {donutSegments.length > 0 && (
                      <div className="td-donut-wrap">
                        <DonutChart segments={donutSegments} />
                        <div className="td-donut-legend">
                          {donutSegments.map((seg) => (
                            <div key={seg.label} className="td-donut-legend-item">
                              <span className="td-donut-swatch" style={{ background: seg.color }} />
                              <span>{seg.label}</span>
                              <em>{seg.value.toFixed(0)}%</em>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metric row */}
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

                    {/* Spend tracker */}
                    <div className="td-progress-wrap">
                      <div className="td-progress-label">
                        <span>
                          {Number(budget.percentageUsed) > 100 ? '⚠ Over budget' : 'On track'}
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

                    {/* Category breakdown */}
                    {budget.categoryStatus && (
                      <div className="td-category-list">
                        {Object.entries(budget.categoryStatus).map(([category, status]) => (
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
                  </div>
                  <Link to={`/trip/${trip._id}/expenses`} className="td-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    <GiTakeMyMoney /> Open Full Expenses
                  </Link>
                </>
              ) : (
                <div className="td-card">
                  <div className="td-card-head"><h2><GiTakeMyMoney /> Budget</h2></div>
                  <p className="td-muted">Budget data unavailable for now.</p>
                </div>
              )}
            </div>

            <div className="td-col-side">
              {analytics ? (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscInfo /> Expense Analytics</h2></div>
                  <div className="td-metric-row">
                    <div className="td-metric-item"><span>Total Spent</span><strong>{formatCurrency(analytics.totalSpent, analytics.currency)}</strong></div>
                    <div className="td-metric-item"><span>Expenses</span><strong>{analytics.totalExpenses || 0}</strong></div>
                    <div className="td-metric-item"><span>Avg Expense</span><strong>{formatCurrency(analytics.averageExpense, analytics.currency)}</strong></div>
                  </div>
                  {analytics.topSpenders?.length > 0 && (
                    <div className="td-top-list">
                      <h4>Top Spenders</h4>
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
                </div>
              ) : (
                <div className="td-card">
                  <div className="td-card-head"><h2><VscInfo /> Analytics</h2></div>
                  <p className="td-muted">Analytics not available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRACKING ── */}
      {activeTab === 'tracking' && (
        <div className="td-content">
          {trackingData.hasTrackingData ? (
            <div className="td-card">
              <div className="td-card-head">
                <h2><VscLocation /> Tracking Visualization</h2>
                <span className="td-muted" style={{ fontSize: '0.78rem' }}>Passive tracking summary</span>
              </div>

              {/* Metrics */}
              <div className="td-metric-row">
                <div className="td-metric-item">
                  <span>Detected Mode</span>
                  <strong>{trackingData.detectedMode}</strong>
                </div>
                <div className="td-metric-item">
                  <span>Confidence</span>
                  <strong>
                    {Number.isFinite(trackingData.confidencePercent)
                      ? `${trackingData.confidencePercent}%`
                      : '--'}
                  </strong>
                </div>
                <div className="td-metric-item">
                  <span>Duration</span>
                  <strong>{trackingData.duration}</strong>
                </div>
              </div>

              {/* Route polyline */}
              <div className="td-track-map" aria-label="Trip movement path">
                {trackingData.polylinePoints ? (
                  <svg viewBox="0 0 600 220" preserveAspectRatio="none" role="img" aria-label="Route path">
                    <polyline points={trackingData.polylinePoints} className="td-track-line" />
                  </svg>
                ) : (
                  <p className="td-muted" style={{ color: 'rgba(215,188,156,0.6)', padding: '1rem', margin: 0 }}>
                    Coordinates limited — map path unavailable.
                  </p>
                )}
              </div>

              {/* Mode chips */}
              {trackingData.modeSummary.length > 0 && (
                <div className="td-mode-chips">
                  {trackingData.modeSummary.map((item) => (
                    <span key={item.mode} className="td-mode-chip">
                      {item.mode} × {item.count}
                    </span>
                  ))}
                </div>
              )}

              {/* Mode correction (if needsConfirmation) */}
              {trackingData.needsConfirmation && !mlBannerDismissed && (
                <div className="td-confirm-mode-row">
                  <select
                    className="td-select"
                    value={modeCorrectionDraft}
                    onChange={(e) => setModeCorrectionDraft(e.target.value)}
                  >
                    {TRACKING_MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>{titleCase(mode)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="td-btn-primary"
                    onClick={handleConfirmTrackingMode}
                    disabled={actionState.confirmingMode}
                  >
                    {actionState.confirmingMode ? <VscLoading className="td-spin" /> : <VscCheck />} Confirm Mode
                  </button>
                </div>
              )}

              {/* Segment feed */}
              {trackingData.segments.length > 0 && (
                <>
                  <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: 'var(--td-forest-900)' }}>
                    Segment Timeline
                  </h4>
                  <div className="td-segment-list">
                    {trackingData.segments.slice(0, 6).map((segment, i) => (
                      <div key={`${segment.startTime || 'seg'}-${i}`} className="td-segment-item">
                        <div>
                          <strong>{titleCase(segment.confirmedMode || segment.mode || 'unknown')}</strong>
                          <small>
                            {formatDateTime(segment.startTime)} —{' '}
                            {segment.endTime ? formatDateTime(segment.endTime) : 'In progress'}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="td-card">
              <div className="td-card-head"><h2><VscLocation /> Tracking</h2></div>
              <p className="td-muted">No tracking data was captured for this trip yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {activeTab === 'members' && (
        <div className="td-content">
          <div className="td-content-split">
            <div className="td-col-main">
              <div className="td-card">
                <div className="td-card-head">
                  <h2><IoPeopleSharp /> Trip Members</h2>
                  <span className="td-muted" style={{ fontSize: '0.78rem' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>

                {members.length > 0 ? (
                  <ul className="td-members-list">
                    {members.map((member) => {
                      const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
                      const memberName   = typeof member?.userId === 'string' ? 'Member' : member?.userId?.name || 'Member';
                      const profileImage =
                        typeof member?.userId === 'string'
                          ? null
                          : member?.userId?.profileImage ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=173328&color=d7bc9c`;
                      const isCurrentUser  = String(memberUserId) === String(user?._id || '');
                      const roleActionKey  = `${memberUserId}:role`;
                      const removeActionKey = `${memberUserId}:remove`;
                      const initials = memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                      return (
                        <li key={memberUserId || memberName} className="td-member-item">
                          {profileImage
                            ? <img src={profileImage} alt={memberName} className="td-member-avatar" loading="lazy" decoding="async" />
                            : <div className="td-avatar-fallback" aria-hidden="true">{initials}</div>
                          }

                          <div className="td-member-info">
                            <strong>{memberName}{isCurrentUser ? ' (You)' : ''}</strong>
                            <small>{isCurrentUser ? user?.email || 'Your account' : member?.userId?.email || 'Trip member'}</small>
                          </div>

                          <div className="td-member-controls">
                            {isOwner && !isCurrentUser ? (
                              <select
                                className="td-select is-compact"
                                value={member.role}
                                onChange={(e) => handleMemberRoleChange(memberUserId, e.target.value)}
                                disabled={actionState.memberActionKey === roleActionKey}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                              </select>
                            ) : (
                              <span className="td-role-pill">{titleCase(member.role)}</span>
                            )}
                            {isOwner && !isCurrentUser && member.role !== 'owner' && (
                              <button
                                type="button"
                                className="td-btn-danger"
                                onClick={() => handleRemoveMember(memberUserId, memberName)}
                                disabled={actionState.memberActionKey === removeActionKey}
                                aria-label={`Remove ${memberName}`}
                              >
                                {actionState.memberActionKey === removeActionKey
                                  ? <VscLoading className="td-spin" />
                                  : <VscTrash />}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="td-muted">No members found for this trip.</p>
                )}
              </div>

              {/* Generate Invite */}
              <div className="td-card">
                <div className="td-card-head"><h2><VscAdd /> Invite People</h2></div>
                <button
                  type="button"
                  className="td-btn-primary"
                  onClick={handleGenerateInvite}
                  disabled={actionState.generatingInvite}
                >
                  {actionState.generatingInvite ? <VscLoading className="td-spin" /> : <VscAdd />} Generate Invite Token
                </button>
              </div>
            </div>

            {/* My Details */}
            <div className="td-col-side">
              <div className="td-card">
                <div className="td-card-head"><h2><VscOrganization /> My Details</h2></div>
                <div className="td-member-form">
                  <label>
                    Age Group
                    <select
                      className="td-select"
                      value={memberForm.ageGroup}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, ageGroup: e.target.value }))}
                    >
                      <option value="">Not set</option>
                      {AGE_GROUP_OPTIONS.map((ag) => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Gender
                    <select
                      className="td-select"
                      value={memberForm.gender}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="">Not set</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{titleCase(g)}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Relation
                    <input
                      className="td-input"
                      type="text"
                      value={memberForm.relation}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, relation: e.target.value }))}
                      placeholder="Friend, sibling, colleague"
                    />
                  </label>

                  <button
                    type="button"
                    className="td-btn-primary"
                    onClick={handleSaveMyMemberDetails}
                    disabled={actionState.savingMemberDetails}
                  >
                    {actionState.savingMemberDetails ? <VscLoading className="td-spin" /> : <VscSave />} Save My Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DAY EDIT MODAL ── */}
      <DayEditModal
        day={editingDay}
        value={editingDayText}
        onChange={setEditingDayText}
        onClose={() => { setEditingDay(null); setEditingDayText(''); }}
        onSave={handleSaveDayPlan}
        saving={actionState.savingItinerary}
      />
    </div>
  );
}
