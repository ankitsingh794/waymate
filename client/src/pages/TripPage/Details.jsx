import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-icons/vsc';
import { GiForkKnifeSpoon, GiTakeMyMoney, GiTicket } from 'react-icons/gi';
import { IoPeopleSharp } from 'react-icons/io5';
import { FaTrainSubway } from 'react-icons/fa6';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './Details.css';

const STATUS_OPTIONS = [
  'planning',
  'upcoming',
  'active',
  'completed',
  'canceled',
  'planned',
  'ongoing',
  'in_progress',
  'pending_confirmation',
  'unconfirmed',
];

const AGE_GROUP_OPTIONS = ['<18', '18-35', '36-60', '>60'];
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];
const TRACKING_MODE_OPTIONS = ['walking', 'running', 'cycling', 'driving', 'public_transport', 'still', 'unknown'];
const RECOMMENDATION_FALLBACK_IMAGES = {
  attractions: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=640&q=80',
  food: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=640&q=80',
  stays: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=640&q=80',
};

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
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    if (firstImage && typeof firstImage === 'object') {
      candidates.push(firstImage.url, firstImage.secure_url);
    }
  }

  return candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(value)) || '';
}

function getRecommendationMeta(place) {
  if (!place || typeof place !== 'object') return '';

  const numericRating = Number(place.rating);
  const hasRating = Number.isFinite(numericRating) && numericRating > 0;
  const locationText = place.vicinity || place.address || place.reason || '';

  if (hasRating && locationText) {
    return `★ ${numericRating.toFixed(1)} • ${locationText}`;
  }

  if (hasRating) {
    return `★ ${numericRating.toFixed(1)}`;
  }

  return typeof locationText === 'string' ? locationText : '';
}

function toCoordinate(point) {
  if (!point) return null;

  const latitude = Number(point.latitude ?? point.lat);
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

  const longitudes = coordinates.map((point) => point[0]);
  const latitudes = coordinates.map((point) => point[1]);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
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

    const label = activityParts.join(' - ') || `Activity ${index + 1}`;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(label);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, activities]) => ({
      day,
      title: `Day ${day}`,
      activities,
      editable: false,
    }));
}

function TripDetailsLoading() {
  return (
    <div className="trip-details-loading">
      <div className="trip-loading-hero" />
      <div className="trip-loading-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="trip-loading-card" />
        ))}
      </div>
    </div>
  );
}

function DayEditModal({ day, value, onChange, onClose, onSave, saving }) {
  if (!day) return null;

  return (
    <div className="trip-modal-backdrop" onClick={onClose} role="presentation">
      <div className="trip-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="trip-modal-head">
          <h3>Edit {day.title}</h3>
          <button type="button" onClick={onClose} className="trip-ghost-button">
            Close
          </button>
        </div>

        <p className="trip-muted">Add one activity per line and save to update trip itinerary.</p>
        <textarea
          className="trip-textarea"
          rows={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Morning city walk\nLunch near central station\nMuseum visit"
        />

        <div className="trip-modal-actions">
          <button type="button" className="trip-ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="trip-primary-button" onClick={onSave} disabled={saving}>
            {saving ? <VscLoading className="spin" /> : <VscSave />} Save Day Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripDetails() {
  const { t } = useTranslation(['tripDetails', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [budget, setBudget] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [modeCorrectionDraft, setModeCorrectionDraft] = useState('unknown');

  const [feedback, setFeedback] = useState({ type: 'info', text: '' });

  const [inviteToken, setInviteToken] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');

  const [actionState, setActionState] = useState({
    refreshing: false,
    togglingFavorite: false,
    savingStatus: false,
    downloadingPdf: false,
    generatingInvite: false,
    upgradingSchedule: false,
    confirmingMode: false,
    savingMemberDetails: false,
    savingItinerary: false,
    memberActionKey: '',
  });

  const [memberForm, setMemberForm] = useState({
    ageGroup: '',
    gender: '',
    relation: '',
  });

  const [editingDay, setEditingDay] = useState(null);
  const [editingDayText, setEditingDayText] = useState('');

  const members = useMemo(() => trip?.group?.members || [], [trip?.group?.members]);
  const itineraryDays = useMemo(() => normalizeItinerary(trip?.itinerary, trip?.startDate), [trip?.itinerary, trip?.startDate]);
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
  const isOwner = currentMember?.role === 'owner';

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
          const latitude = Number(coordinate[1]);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            allCoordinates.push([longitude, latitude]);
          }
        });
        return;
      }

      if (Array.isArray(segment?.rawDataPoints) && segment.rawDataPoints.length > 0) {
        segment.rawDataPoints.forEach((point) => {
          const coordinate = toCoordinate(point);
          if (coordinate) allCoordinates.push(coordinate);
        });
      }
    });

    if (allCoordinates.length === 0 && Array.isArray(trip?.path?.coordinates)) {
      trip.path.coordinates.forEach((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) return;
        const longitude = Number(coordinate[0]);
        const latitude = Number(coordinate[1]);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          allCoordinates.push([longitude, latitude]);
        }
      });
    }

    if (allCoordinates.length === 0 && Array.isArray(trip?.rawDataPoints)) {
      trip.rawDataPoints.forEach((point) => {
        const coordinate = toCoordinate(point);
        if (coordinate) allCoordinates.push(coordinate);
      });
    }

    const sampledCoordinates = sampleCoordinates(allCoordinates, 180);
    const polylinePoints = toSvgPolylinePoints(sampledCoordinates);

    const segmentStart = segments[0]?.startTime ? new Date(segments[0].startTime) : null;
    const lastSegment = segments[segments.length - 1];
    const segmentEnd = lastSegment?.endTime ? new Date(lastSegment.endTime) : null;
    const tripStart = trip?.startDate ? new Date(trip.startDate) : null;
    const tripEnd = trip?.endDate ? new Date(trip.endDate) : null;

    const start = segmentStart && !Number.isNaN(segmentStart.getTime()) ? segmentStart : tripStart;
    const end = segmentEnd && !Number.isNaN(segmentEnd.getTime()) ? segmentEnd : tripEnd;

    const durationMs =
      start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) ? end.getTime() - start.getTime() : 0;

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
        (trip?.mlPrediction?.accuracy || trip?.mlPrediction?.confidence || trip?.passiveData?.modeConfidence || trip?.confidence || 0) *
          100
      )
    );

    const needsConfirmation = Boolean(trip?.mlPrediction?.requiresUserConfirmation) || trip?.status === 'unconfirmed';

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

  useEffect(() => {
    if (!feedback.text) return undefined;
    const timeoutId = window.setTimeout(() => {
      setFeedback((prev) => ({ ...prev, text: '' }));
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [feedback.text]);

  const loadTripDetails = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setActionState((prev) => ({ ...prev, refreshing: true }));
      }
      setError('');

      try {
        const [tripResponse, budgetResponse, analyticsResponse] = await Promise.allSettled([
          api.get(`/trips/${id}`),
          api.get(`/trips/${id}/expenses/budget`),
          api.get(`/trips/${id}/expenses/analytics`),
        ]);

        if (tripResponse.status === 'fulfilled') {
          const nextTrip = tripResponse.value?.data?.data?.trip || tripResponse.value?.data?.trip || null;
          if (!nextTrip) {
            setError('Trip data not found.');
          }
          setTrip(nextTrip);
        } else {
          throw tripResponse.reason;
        }

        if (budgetResponse.status === 'fulfilled') {
          const nextBudget = budgetResponse.value?.data?.data?.budget || budgetResponse.value?.data?.budget || null;
          setBudget(nextBudget);
        } else {
          setBudget(null);
        }

        if (analyticsResponse.status === 'fulfilled') {
          const nextAnalytics =
            analyticsResponse.value?.data?.data?.analytics || analyticsResponse.value?.data?.analytics || null;
          setAnalytics(nextAnalytics);
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
    },
    [id]
  );

  useEffect(() => {
    loadTripDetails(true);
  }, [loadTripDetails]);

  useEffect(() => {
    if (!trip) return;
    setIsFavorite(Boolean(trip.favorite));
    setStatusDraft(trip.status || '');
    setModeCorrectionDraft(
      trip.confirmedMode || trip.mlPrediction?.detectedMode || trip.passiveData?.confirmedMode || trip.passiveData?.detectedMode || 'unknown'
    );

    if (currentMember) {
      setMemberForm({
        ageGroup: currentMember.ageGroup || '',
        gender: currentMember.gender || '',
        relation: currentMember.relation || '',
      });
    }
  }, [trip, currentMember]);

  const handleFavoriteToggle = async () => {
    if (!trip) return;
    const previous = isFavorite;
    setIsFavorite(!previous);
    setActionState((prev) => ({ ...prev, togglingFavorite: true }));

    try {
      const { data } = await api.patch(`/trips/${id}/favorite`);
      const savedFavorite = data?.data?.favorite;
      if (typeof savedFavorite === 'boolean') {
        setIsFavorite(savedFavorite);
      }
      setTrip((prev) => (prev ? { ...prev, favorite: typeof savedFavorite === 'boolean' ? savedFavorite : !previous } : prev));
    } catch (toggleError) {
      setIsFavorite(previous);
      setFeedback({ type: 'error', text: getErrorMessage(toggleError, 'Failed to update favorite status.') });
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
    } catch (statusError) {
      setFeedback({ type: 'error', text: getErrorMessage(statusError, 'Failed to update trip status.') });
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
      const destinationName = (trip?.destination || 'trip').replace(/\s+/g, '-').toLowerCase();
      link.download = `waymate-${destinationName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setFeedback({ type: 'success', text: 'Trip PDF downloaded.' });
    } catch (downloadError) {
      setFeedback({ type: 'error', text: getErrorMessage(downloadError, 'Failed to download trip PDF.') });
    } finally {
      setActionState((prev) => ({ ...prev, downloadingPdf: false }));
    }
  };

  const handleGenerateInvite = async () => {
    setActionState((prev) => ({ ...prev, generatingInvite: true }));
    try {
      const { data } = await api.post(`/trips/${id}/generate-invite`);
      const token = data?.data?.inviteToken || '';
      const expiresAt = data?.data?.expiresAt || '';
      setInviteToken(token);
      setInviteExpiry(expiresAt);
      if (token) {
        setFeedback({ type: 'success', text: 'Invite token generated.' });
      }
    } catch (inviteError) {
      setFeedback({ type: 'error', text: getErrorMessage(inviteError, 'Failed to generate invite token.') });
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
      if (schedule) {
        setTrip((prev) => (prev ? { ...prev, smartSchedule: schedule } : prev));
      }
      setFeedback({ type: 'success', text: 'Smart schedule generated successfully.' });
    } catch (scheduleError) {
      setFeedback({ type: 'error', text: getErrorMessage(scheduleError, 'Failed to generate smart schedule.') });
    } finally {
      setActionState((prev) => ({ ...prev, upgradingSchedule: false }));
    }
  };

  const handleConfirmTrackingMode = async () => {
    if (!modeCorrectionDraft) return;

    setActionState((prev) => ({ ...prev, confirmingMode: true }));
    try {
      const { data } = await api.post(`/tracking/trips/${id}/confirm`, {
        correctedMode: modeCorrectionDraft,
      });

      const confirmedTrip = data?.data?.trip;
      if (confirmedTrip) {
        setTrip((prev) => ({ ...prev, ...confirmedTrip }));
      } else {
        await loadTripDetails(false);
      }

      setFeedback({ type: 'success', text: 'Tracking mode confirmed successfully.' });
    } catch (trackingError) {
      setFeedback({ type: 'error', text: getErrorMessage(trackingError, 'Failed to confirm tracking mode.') });
    } finally {
      setActionState((prev) => ({ ...prev, confirmingMode: false }));
    }
  };

  const handleSaveMyMemberDetails = async () => {
    setActionState((prev) => ({ ...prev, savingMemberDetails: true }));
    try {
      const payload = {
        ageGroup: memberForm.ageGroup || undefined,
        gender: memberForm.gender || undefined,
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
            return {
              ...member,
              ageGroup: updatedMember.ageGroup,
              gender: updatedMember.gender,
              relation: updatedMember.relation,
            };
          });
          return { ...prev, group: { ...prev.group, members: nextMembers } };
        });
      }

      setFeedback({ type: 'success', text: 'Your member profile has been updated.' });
    } catch (memberError) {
      setFeedback({ type: 'error', text: getErrorMessage(memberError, 'Failed to update your member details.') });
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
    } catch (roleError) {
      setFeedback({ type: 'error', text: getErrorMessage(roleError, 'Failed to update member role.') });
    } finally {
      setActionState((prev) => ({ ...prev, memberActionKey: '' }));
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!memberId) return;
    const confirmed = window.confirm(`Remove ${memberName || 'this member'} from the trip?`);
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
    } catch (removeError) {
      setFeedback({ type: 'error', text: getErrorMessage(removeError, 'Failed to remove member.') });
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
      .map((activity) => activity.trim())
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
          return {
            ...item,
            ...(updatedDay || {}),
            activities,
          };
        });

        return { ...prev, itinerary: nextItinerary };
      });

      setFeedback({ type: 'success', text: `Updated itinerary for Day ${editingDay.day}.` });
      setEditingDay(null);
      setEditingDayText('');
    } catch (itineraryError) {
      setFeedback({ type: 'error', text: getErrorMessage(itineraryError, 'Failed to update itinerary day.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingItinerary: false }));
    }
  };

  if (loading) {
    return <TripDetailsLoading />;
  }

  if (error || !trip) {
    return (
      <div className="trip-details-error">
        <VscError />
        <h2>{error || 'Trip data not found.'}</h2>
        <div className="trip-error-actions">
          <button type="button" className="trip-primary-button" onClick={() => loadTripDetails(true)}>
            <VscLoading className={actionState.refreshing ? 'spin' : ''} /> Retry
          </button>
          <button type="button" className="trip-ghost-button" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const currencyCode = budget?.currency || trip?.preferences?.currency || 'USD';

  return (
    <div className="trip-details-page">
      <header className="trip-hero">
        <img
          src={trip.coverImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1400&q=80'}
          alt={trip.destination}
          className="trip-hero-image"
          loading="lazy"
          decoding="async"
        />
        <div className="trip-hero-overlay" />

        <div className="trip-hero-top-row">
          <Link to="/dashboard" className="trip-back-link">
            <VscArrowLeft /> {t('tripDetails:backToDashboard', { defaultValue: 'Back to dashboard' })}
          </Link>

          <div className="trip-hero-actions">
            <button
              type="button"
              className={`trip-icon-action ${isFavorite ? 'is-active' : ''}`}
              onClick={handleFavoriteToggle}
              disabled={actionState.togglingFavorite}
              aria-label="Toggle favorite"
            >
              <VscHeart />
            </button>

            <Link to={`/trip/${trip._id}/edit`} className="trip-icon-action" aria-label="Edit trip">
              <VscEdit />
            </Link>
          </div>
        </div>

        <div className="trip-hero-content">
          <h1>{trip.destination}</h1>
          <p>
            <VscCalendar /> {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
          </p>

          <div className="trip-hero-meta">
            <span>{titleCase(trip.status)}</span>
            <span>{trip.travelers || 1} traveler{(trip.travelers || 1) > 1 ? 's' : ''}</span>
            <span>{titleCase(trip.purpose || 'leisure')}</span>
          </div>
        </div>
      </header>

      {feedback.text && <div className={`trip-feedback is-${feedback.type}`}>{feedback.text}</div>}

      <section className="trip-quick-actions">
        <button type="button" className="trip-primary-button" onClick={handleDownloadPdf} disabled={actionState.downloadingPdf}>
          {actionState.downloadingPdf ? <VscLoading className="spin" /> : <VscShare />} Download PDF
        </button>

        <button
          type="button"
          className="trip-primary-button"
          onClick={handleGenerateInvite}
          disabled={actionState.generatingInvite}
        >
          {actionState.generatingInvite ? <VscLoading className="spin" /> : <VscAdd />} Generate Invite
        </button>

        <button
          type="button"
          className="trip-primary-button"
          onClick={handleUpgradeSmartSchedule}
          disabled={actionState.upgradingSchedule}
        >
          {actionState.upgradingSchedule ? <VscLoading className="spin" /> : <FaTrainSubway />} Smart Schedule
        </button>

        <Link to={`/trip/${trip._id}/expenses`} className="trip-outline-link">
          <GiTakeMyMoney /> Open Expenses
        </Link>

        <Link to="/assistant" className="trip-outline-link">
          <VscSparkle /> Ask AI Assistant
        </Link>
      </section>

      {inviteToken && (
        <section className="trip-token-card">
          <div>
            <h3>Trip Invite Token</h3>
            <p>Share this token so others can join from invite acceptance flow.</p>
            <code>{inviteToken}</code>
            <small>Expires: {formatDateTime(inviteExpiry)}</small>
          </div>
          <button type="button" className="trip-ghost-button" onClick={handleCopyToken}>
            <VscCheck /> Copy Token
          </button>
        </section>
      )}

      <main className="trip-layout">
        <section className="trip-main-column">
          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscInfo /> Status and Controls
              </h2>
            </div>

            <div className="trip-status-row">
              <select className="trip-select" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="trip-primary-button"
                onClick={handleStatusSave}
                disabled={actionState.savingStatus || statusDraft === trip.status}
              >
                {actionState.savingStatus ? <VscLoading className="spin" /> : <VscSave />} Save Status
              </button>

              <button
                type="button"
                className="trip-ghost-button"
                onClick={() => loadTripDetails(false)}
                disabled={actionState.refreshing}
              >
                {actionState.refreshing ? <VscLoading className="spin" /> : <VscInfo />} Refresh Data
              </button>
            </div>
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscSparkle /> AI Summary
              </h2>
            </div>

            {trip.aiSummary ? (
              <div className="trip-ai-grid">
                <section>
                  <h4>Overview</h4>
                  <p>{trip.aiSummary.overview || 'No overview available yet.'}</p>
                </section>
                <section>
                  <h4>Highlights</h4>
                  <ul>
                    {(trip.aiSummary.highlights || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Tips</h4>
                  <ul>
                    {(trip.aiSummary.tips || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4>Packing Checklist</h4>
                  <ul>
                    {(trip.aiSummary.packingChecklist || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <p className="trip-muted">AI summary will appear once generated by planning flows.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscMilestone /> Itinerary
              </h2>
            </div>

            {itineraryDays.length > 0 ? (
              <div className="trip-itinerary-list">
                {itineraryDays.map((day) => (
                  <section key={day.day} className="trip-itinerary-day">
                    <div className="trip-itinerary-head">
                      <div>
                        <h4>{day.title}</h4>
                        <small>Day {day.day}</small>
                      </div>

                      {canEditTrip && day.editable && supportsDayEdits && (
                        <button type="button" className="trip-ghost-button" onClick={() => openDayEditor(day)}>
                          <VscEdit /> Edit Day
                        </button>
                      )}
                    </div>

                    <ul>
                      {day.activities.map((activity, index) => (
                        <li key={`${activity}-${index}`}>
                          <VscCheck />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="trip-muted">No itinerary data available for this trip yet.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <FaTrainSubway /> Smart Train Schedule
              </h2>
            </div>

            {trip.smartSchedule?.options?.length ? (
              <div className="trip-schedule-list">
                {trip.smartSchedule.options.slice(0, 4).map((option, index) => (
                  <div key={`${option.trainNumber}-${index}`} className="trip-schedule-item">
                    <h4>
                      {option.trainName} ({option.trainNumber})
                    </h4>
                    <p>
                      {option.departureTime} to {option.arrivalTime} • {option.duration}
                    </p>
                    {option.availableClasses?.length > 0 && <small>{option.availableClasses.join(' | ')}</small>}
                    {option.recommendationReason && <em>{option.recommendationReason}</em>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="trip-muted">No smart schedule generated yet. Use the action button above to generate one.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscLocation /> Tracking Visualization
              </h2>
              <span className="trip-muted">Passive tracking summary and confirmation</span>
            </div>

            {trackingData.hasTrackingData ? (
              <>
                <div className="trip-metric-grid">
                  <div className="trip-metric-item">
                    <span>Detected mode</span>
                    <strong>{trackingData.detectedMode}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Confidence</span>
                    <strong>{Number.isFinite(trackingData.confidencePercent) ? `${trackingData.confidencePercent}%` : '--'}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Duration</span>
                    <strong>{trackingData.duration}</strong>
                  </div>
                </div>

                <div className="trip-track-map" aria-label="Trip movement path">
                  {trackingData.polylinePoints ? (
                    <svg viewBox="0 0 600 220" preserveAspectRatio="none" role="img">
                      <polyline points={trackingData.polylinePoints} className="trip-track-line" />
                    </svg>
                  ) : (
                    <p className="trip-muted">Coordinates are limited for this trip, so map path is unavailable.</p>
                  )}
                </div>

                {trackingData.modeSummary.length > 0 && (
                  <div className="trip-mode-chip-grid">
                    {trackingData.modeSummary.map((item) => (
                      <span key={item.mode} className="trip-mode-chip">
                        {item.mode}: {item.count}
                      </span>
                    ))}
                  </div>
                )}

                {trackingData.segments.length > 0 && (
                  <div className="trip-segment-feed">
                    <h4>Segment timeline</h4>
                    <ul>
                      {trackingData.segments.slice(0, 6).map((segment, index) => (
                        <li key={`${segment.startTime || 'segment'}-${index}`}>
                          <strong>{titleCase(segment.confirmedMode || segment.mode || 'unknown')}</strong>
                          <small>
                            {formatDateTime(segment.startTime)} - {segment.endTime ? formatDateTime(segment.endTime) : 'In progress'}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trackingData.needsConfirmation && (
                  <div className="trip-confirm-mode-row">
                    <select
                      className="trip-select"
                      value={modeCorrectionDraft}
                      onChange={(event) => setModeCorrectionDraft(event.target.value)}
                    >
                      {TRACKING_MODE_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {titleCase(mode)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="trip-primary-button"
                      onClick={handleConfirmTrackingMode}
                      disabled={actionState.confirmingMode}
                    >
                      {actionState.confirmingMode ? <VscLoading className="spin" /> : <VscCheck />} Confirm Mode
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="trip-muted">No tracking data was captured for this trip yet.</p>
            )}
          </article>

          {hasRecommendations && (
            <article className="trip-card">
              <div className="trip-card-head">
                <h2>
                  <GiTicket /> Recommendations
                </h2>
              </div>

              <div className="trip-recommendations-grid">
                {trip.attractions?.length > 0 && (
                  <section>
                    <h4>
                      <GiTicket /> Attractions
                    </h4>
                    <ul className="trip-recommendation-list">
                      {trip.attractions.slice(0, 5).map((place, index) => {
                        const name = getRecommendationName(place, `Attraction ${index + 1}`);
                        const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.attractions;
                        const meta = getRecommendationMeta(place);

                        return (
                          <li key={`${name}-${index}`} className="trip-recommendation-item">
                            <img src={image} alt={name} loading="lazy" decoding="async" />
                            <div>
                              <strong>{name}</strong>
                              {meta ? <small>{meta}</small> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {trip.foodRecommendations?.length > 0 && (
                  <section>
                    <h4>
                      <GiForkKnifeSpoon /> Food
                    </h4>
                    <ul className="trip-recommendation-list">
                      {trip.foodRecommendations.slice(0, 5).map((place, index) => {
                        const name = getRecommendationName(place, `Food spot ${index + 1}`);
                        const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.food;
                        const meta = getRecommendationMeta(place);

                        return (
                          <li key={`${name}-${index}`} className="trip-recommendation-item">
                            <img src={image} alt={name} loading="lazy" decoding="async" />
                            <div>
                              <strong>{name}</strong>
                              {meta ? <small>{meta}</small> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {trip.accommodationSuggestions?.length > 0 && (
                  <section>
                    <h4>
                      <VscOrganization /> Stays
                    </h4>
                    <ul className="trip-recommendation-list">
                      {trip.accommodationSuggestions.slice(0, 5).map((place, index) => {
                        const name = getRecommendationName(place, `Stay ${index + 1}`);
                        const image = getRecommendationImage(place) || RECOMMENDATION_FALLBACK_IMAGES.stays;
                        const meta = getRecommendationMeta(place);

                        return (
                          <li key={`${name}-${index}`} className="trip-recommendation-item">
                            <img src={image} alt={name} loading="lazy" decoding="async" />
                            <div>
                              <strong>{name}</strong>
                              {meta ? <small>{meta}</small> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            </article>
          )}
        </section>

        <aside className="trip-side-column">
          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <GiTakeMyMoney /> Budget
              </h2>
            </div>

            {budget ? (
              <>
                <div className="trip-metric-grid">
                  <div className="trip-metric-item">
                    <span>Total</span>
                    <strong>{formatCurrency(budget.total, currencyCode)}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Spent</span>
                    <strong>{formatCurrency(budget.spent, currencyCode)}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Remaining</span>
                    <strong>{formatCurrency(budget.remaining, currencyCode)}</strong>
                  </div>
                </div>

                <div className="trip-progress-shell" aria-label="Budget usage">
                  <div className="trip-progress-fill" style={{ width: `${Math.min(100, Number(budget.percentageUsed) || 0)}%` }} />
                </div>

                {budget.categoryStatus && (
                  <div className="trip-category-list">
                    {Object.entries(budget.categoryStatus).map(([category, status]) => (
                      <div key={category}>
                        <div className="trip-category-head">
                          <span>{titleCase(category)}</span>
                          <small>{Math.round(Number(status?.percentage) || 0)}%</small>
                        </div>
                        <div className="trip-progress-shell is-thin">
                          <div
                            className="trip-progress-fill"
                            style={{ width: `${Math.min(100, Number(status?.percentage) || 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="trip-muted">Budget data unavailable for now.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscInfo /> Expense Analytics
              </h2>
            </div>

            {analytics ? (
              <>
                <div className="trip-metric-grid">
                  <div className="trip-metric-item">
                    <span>Total spent</span>
                    <strong>{formatCurrency(analytics.totalSpent, analytics.currency)}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Expenses</span>
                    <strong>{analytics.totalExpenses || 0}</strong>
                  </div>
                  <div className="trip-metric-item">
                    <span>Avg expense</span>
                    <strong>{formatCurrency(analytics.averageExpense, analytics.currency)}</strong>
                  </div>
                </div>

                {Array.isArray(analytics.topSpenders) && analytics.topSpenders.length > 0 && (
                  <div className="trip-top-list">
                    <h4>Top Spenders</h4>
                    <ul>
                      {analytics.topSpenders.slice(0, 4).map((spender) => (
                        <li key={spender.userId}>
                          <span>{spender.name}</span>
                          <strong>{formatCurrency(spender.amount, analytics.currency)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="trip-muted">Analytics not available yet.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <IoPeopleSharp /> Trip Members
              </h2>
            </div>

            {members.length > 0 ? (
              <ul className="trip-members-list">
                {members.map((member) => {
                  const memberUserId = typeof member?.userId === 'string' ? member.userId : member?.userId?._id;
                  const memberName = typeof member?.userId === 'string' ? 'Member' : member?.userId?.name || 'Member';
                  const profileImage =
                    typeof member?.userId === 'string'
                      ? null
                      : member?.userId?.profileImage ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=0E3B4C&color=ffffff`;
                  const isCurrentUser = String(memberUserId) === String(user?._id || '');
                  const roleActionKey = `${memberUserId}:role`;
                  const removeActionKey = `${memberUserId}:remove`;

                  return (
                    <li key={memberUserId || memberName} className="trip-member-item">
                      {profileImage ? <img src={profileImage} alt={memberName} loading="lazy" decoding="async" /> : <div className="avatar-fallback" />}

                      <div className="trip-member-main">
                        <strong>{memberName}</strong>
                        <small>{isCurrentUser ? 'You' : member?.userId?.email || 'Trip member'}</small>
                      </div>

                      <div className="trip-member-controls">
                        {isOwner && !isCurrentUser ? (
                          <select
                            className="trip-select is-compact"
                            value={member.role}
                            onChange={(event) => handleMemberRoleChange(memberUserId, event.target.value)}
                            disabled={actionState.memberActionKey === roleActionKey}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                        ) : (
                          <span className="member-role-pill">{titleCase(member.role)}</span>
                        )}

                        {isOwner && !isCurrentUser && member.role !== 'owner' && (
                          <button
                            type="button"
                            className="trip-danger-button"
                            onClick={() => handleRemoveMember(memberUserId, memberName)}
                            disabled={actionState.memberActionKey === removeActionKey}
                          >
                            {actionState.memberActionKey === removeActionKey ? <VscLoading className="spin" /> : <VscTrash />}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="trip-muted">No members found for this trip.</p>
            )}
          </article>

          <article className="trip-card">
            <div className="trip-card-head">
              <h2>
                <VscOrganization /> My Member Details
              </h2>
            </div>

            <div className="trip-member-form">
              <label>
                Age Group
                <select
                  className="trip-select"
                  value={memberForm.ageGroup}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, ageGroup: event.target.value }))}
                >
                  <option value="">Not set</option>
                  {AGE_GROUP_OPTIONS.map((ageGroup) => (
                    <option key={ageGroup} value={ageGroup}>
                      {ageGroup}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Gender
                <select
                  className="trip-select"
                  value={memberForm.gender}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, gender: event.target.value }))}
                >
                  <option value="">Not set</option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender}>
                      {titleCase(gender)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Relation
                <input
                  className="trip-input"
                  type="text"
                  value={memberForm.relation}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, relation: event.target.value }))}
                  placeholder="Friend, sibling, colleague"
                />
              </label>

              <button
                type="button"
                className="trip-primary-button"
                onClick={handleSaveMyMemberDetails}
                disabled={actionState.savingMemberDetails}
              >
                {actionState.savingMemberDetails ? <VscLoading className="spin" /> : <VscSave />} Save My Details
              </button>
            </div>
          </article>

        </aside>
      </main>

      <DayEditModal
        day={editingDay}
        value={editingDayText}
        onChange={setEditingDayText}
        onClose={() => {
          setEditingDay(null);
          setEditingDayText('');
        }}
        onSave={handleSaveDayPlan}
        saving={actionState.savingItinerary}
      />
    </div>
  );
}
