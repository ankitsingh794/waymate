import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscCloudDownload,
  VscCopy,
  VscEdit,
  VscError,
  VscHeart,
  VscInfo,
  VscLoading,
  VscOrganization,
  VscRefresh,
  VscSave,
  VscShare,
  VscTrash,
  VscWarning,
} from 'react-icons/vsc';
import { FaTrainSubway } from 'react-icons/fa6';
import { IoPeopleSharp } from 'react-icons/io5';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../components/UI';
import './EditTrip.css';

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

const STATUS_API_MAP = {
  planned: 'planning',
  ongoing: 'active',
  in_progress: 'active',
  pending_confirmation: 'active',
  unconfirmed: 'active',
};

const ACCOMMODATION_OPTIONS = ['budget', 'standard', 'luxury'];
const TRANSPORT_OPTIONS = ['any', 'flight', 'train', 'bus', 'car'];
const PURPOSE_OPTIONS = ['work', 'education', 'shopping', 'leisure', 'personal_business', 'other'];
const AGE_GROUP_OPTIONS = ['<18', '18-35', '36-60', '>60'];
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function titleCase(value) {
  if (!value) return 'Unknown';
  return String(value)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
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

function formatDateOrFallback(value) {
  if (!value) return 'Not set';
  return formatDate(value);
}

function formatTextOrFallback(value) {
  return value ? titleCase(value) : 'Not set';
}

function getMemberUserId(member) {
  if (!member) return '';
  return typeof member.userId === 'string' ? member.userId : member.userId?._id || '';
}

function normalizeStatusForEndpoint(status) {
  if (!status) return 'planning';
  return STATUS_API_MAP[status] || status;
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
  const groupedByDay = new Map();

  itinerary.forEach((item, index) => {
    let day = 1;
    const startTime = item?.startTime ? new Date(item.startTime) : null;

    if (start && startTime && !Number.isNaN(start.getTime()) && !Number.isNaN(startTime.getTime())) {
      const diffDays = Math.floor((startTime.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      day = Math.max(1, diffDays + 1);
    } else if (typeof item?.sequence === 'number') {
      day = Math.max(1, item.sequence + 1);
    }

    const parts = [];
    if (item?.description) parts.push(item.description);
    if (item?.type) parts.push(titleCase(item.type));
    if (item?.mode) parts.push(`via ${titleCase(item.mode)}`);

    const label = parts.join(' - ') || `Activity ${index + 1}`;
    if (!groupedByDay.has(day)) groupedByDay.set(day, []);
    groupedByDay.get(day).push(label);
  });

  return Array.from(groupedByDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, activities]) => ({
      day,
      title: `Day ${day}`,
      activities,
      editable: false,
    }));
}

function getFilenameFromDisposition(dispositionHeader, fallbackName) {
  if (!dispositionHeader || typeof dispositionHeader !== 'string') return fallbackName;
  const match = dispositionHeader.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const rawName = match?.[1] || match?.[2];
  if (!rawName) return fallbackName;
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function EditTripLoadingScreen() {
  return (
    <div className="edit-trip-loading">
      <div className="edit-loading-hero" />
      <div className="edit-loading-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="edit-loading-card" />
        ))}
      </div>
    </div>
  );
}

function DayPlanModal({ day, value, onChange, onClose, onSave, saving }) {
  if (!day) return null;

  return (
    <div className="edit-modal-backdrop" onClick={onClose} role="presentation">
      <div className="edit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="edit-modal-head">
          <h3>Edit {day.title}</h3>
          <button type="button" className="edit-btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="edit-muted">Add one activity per line and save to update this day.</p>

        <textarea
          className="edit-textarea"
          rows={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Morning walk&#10;Lunch stop&#10;Museum visit"
        />

        <div className="edit-modal-actions">
          <button type="button" className="edit-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="edit-btn primary" onClick={onSave} disabled={saving}>
            {saving ? <VscLoading className="spin" /> : <VscSave />} Save Day
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditTrip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [feedback, setFeedback] = useState({ type: 'info', text: '' });

  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 1,
    accommodationType: 'standard',
    transportMode: 'any',
    purpose: 'leisure',
  });
  const [statusDraft, setStatusDraft] = useState('planning');
  const [isFavorite, setIsFavorite] = useState(false);

  const [inviteToken, setInviteToken] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');

  const [memberForm, setMemberForm] = useState({
    ageGroup: '',
    gender: '',
    relation: '',
  });
  const [baselineDraft, setBaselineDraft] = useState(null);

  const [editingDay, setEditingDay] = useState(null);
  const [editingDayText, setEditingDayText] = useState('');

  const [actionState, setActionState] = useState({
    refreshing: false,
    savingDetails: false,
    savingStatus: false,
    togglingFavorite: false,
    generatingInvite: false,
    copyingInvite: false,
    downloadingPdf: false,
    upgradingSchedule: false,
    savingMemberDetails: false,
    savingItinerary: false,
    deletingTrip: false,
    memberActionKey: '',
  });

  const members = useMemo(() => trip?.group?.members || [], [trip?.group?.members]);

  const itineraryDays = useMemo(() => normalizeItinerary(trip?.itinerary, trip?.startDate), [trip?.itinerary, trip?.startDate]);

  const supportsDayEdits = useMemo(
    () => Array.isArray(trip?.itinerary) && trip.itinerary.some((item) => typeof item?.day === 'number'),
    [trip?.itinerary]
  );

  const currentMember = useMemo(() => {
    if (!user?._id || members.length === 0) return null;
    return members.find((member) => String(getMemberUserId(member)) === String(user._id));
  }, [members, user?._id]);

  const isOwner = currentMember?.role === 'owner';
  const canEditTrip = currentMember?.role === 'owner' || currentMember?.role === 'editor';

  const statusOptions = useMemo(() => {
    const unique = new Set(STATUS_OPTIONS);
    if (trip?.status) unique.add(trip.status);
    return Array.from(unique);
  }, [trip?.status]);

  const currentDraft = useMemo(
    () => ({
      startDate: formData.startDate || '',
      endDate: formData.endDate || '',
      travelers: Math.max(1, Number(formData.travelers) || 1),
      accommodationType: formData.accommodationType || 'standard',
      transportMode: formData.transportMode || 'any',
      purpose: formData.purpose || 'leisure',
      status: statusDraft || 'planning',
      ageGroup: memberForm.ageGroup || '',
      gender: memberForm.gender || '',
      relation: memberForm.relation.trim(),
    }),
    [formData, memberForm.ageGroup, memberForm.gender, memberForm.relation, statusDraft]
  );

  const draftChanges = useMemo(() => {
    if (!baselineDraft) return [];

    const fieldConfig = [
      { key: 'startDate', label: 'Start Date', format: formatDateOrFallback, emphasis: 'high' },
      { key: 'endDate', label: 'End Date', format: formatDateOrFallback, emphasis: 'high' },
      { key: 'travelers', label: 'Travelers', format: (value) => `${value}`, emphasis: 'high' },
      { key: 'accommodationType', label: 'Accommodation', format: formatTextOrFallback, emphasis: 'normal' },
      { key: 'transportMode', label: 'Transport Preference', format: formatTextOrFallback, emphasis: 'normal' },
      { key: 'purpose', label: 'Purpose', format: formatTextOrFallback, emphasis: 'normal' },
      { key: 'status', label: 'Status', format: formatTextOrFallback, emphasis: 'high' },
      { key: 'ageGroup', label: 'My Age Group', format: formatTextOrFallback, emphasis: 'normal' },
      { key: 'gender', label: 'My Gender', format: formatTextOrFallback, emphasis: 'normal' },
      {
        key: 'relation',
        label: 'My Relation',
        format: (value) => (value && value.trim() ? value.trim() : 'Not set'),
        emphasis: 'normal',
      },
    ];

    return fieldConfig
      .filter(({ key }) => String(baselineDraft[key] ?? '') !== String(currentDraft[key] ?? ''))
      .map(({ key, label, format, emphasis }) => ({
        key,
        label,
        from: format(baselineDraft[key]),
        to: format(currentDraft[key]),
        emphasis,
      }));
  }, [baselineDraft, currentDraft]);

  const hasUnsavedChanges = draftChanges.length > 0;

  const hasCoreDetailsChanges = useMemo(() => {
    if (!baselineDraft) return false;
    return [
      'startDate',
      'endDate',
      'travelers',
      'accommodationType',
      'transportMode',
      'purpose',
    ].some((key) => String(currentDraft[key] ?? '') !== String(baselineDraft[key] ?? ''));
  }, [baselineDraft, currentDraft]);

  const hasStatusChange = useMemo(() => {
    if (!baselineDraft) return false;
    return String(currentDraft.status ?? '') !== String(baselineDraft.status ?? '');
  }, [baselineDraft, currentDraft.status]);

  const hasMemberDetailsChanges = useMemo(() => {
    if (!baselineDraft) return false;
    return ['ageGroup', 'gender', 'relation'].some(
      (key) => String(currentDraft[key] ?? '') !== String(baselineDraft[key] ?? '')
    );
  }, [baselineDraft, currentDraft]);

  const attentionChecks = useMemo(() => {
    const checks = [];
    const start = currentDraft.startDate ? new Date(currentDraft.startDate) : null;
    const end = currentDraft.endDate ? new Date(currentDraft.endDate) : null;
    const now = new Date();

    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
      checks.push({
        id: 'date-invalid',
        severity: 'critical',
        message: 'Start and end dates must both be valid before saving core trip changes.',
      });
      return checks;
    }

    if (end < start) {
      checks.push({
        id: 'date-order',
        severity: 'critical',
        message: 'End date is currently earlier than start date.',
      });
    }

    if (currentDraft.travelers < members.length) {
      checks.push({
        id: 'traveler-count',
        severity: 'warning',
        message: `Traveler count (${currentDraft.travelers}) is lower than current member count (${members.length}).`,
      });
    }

    if (currentDraft.status === 'completed' && end > now) {
      checks.push({
        id: 'future-completed',
        severity: 'warning',
        message: 'Status is set to Completed, but the trip end date is still in the future.',
      });
    }

    if (currentDraft.status === 'active' && start > now) {
      checks.push({
        id: 'future-active',
        severity: 'warning',
        message: 'Status is Active, but the trip start date is in the future.',
      });
    }

    if (checks.length === 0) {
      checks.push({
        id: 'all-good',
        severity: 'info',
        message: 'No critical blockers detected. This draft is ready for safe updates.',
      });
    }

    return checks;
  }, [currentDraft.endDate, currentDraft.startDate, currentDraft.status, currentDraft.travelers, members.length]);

  const hasCriticalAttention = attentionChecks.some((item) => item.severity === 'critical');

  const hydrateFromTrip = useCallback(
    (nextTrip) => {
      setTrip(nextTrip);
      setIsFavorite(Boolean(nextTrip?.favorite));
      const nextDraft = {
        startDate: formatDateInput(nextTrip?.startDate),
        endDate: formatDateInput(nextTrip?.endDate),
        travelers: Number(nextTrip?.travelers) || 1,
        accommodationType: nextTrip?.preferences?.accommodationType || 'standard',
        transportMode: nextTrip?.preferences?.transportMode || 'any',
        purpose: nextTrip?.purpose || 'leisure',
        status: nextTrip?.status || 'planning',
        ageGroup: '',
        gender: '',
        relation: '',
      };

      setStatusDraft(nextDraft.status);
      setFormData({
        destination: nextTrip?.destination || '',
        startDate: nextDraft.startDate,
        endDate: nextDraft.endDate,
        travelers: nextDraft.travelers,
        accommodationType: nextDraft.accommodationType,
        transportMode: nextDraft.transportMode,
        purpose: nextDraft.purpose,
      });

      const nextMembers = Array.isArray(nextTrip?.group?.members) ? nextTrip.group.members : [];
      const myMember = nextMembers.find((member) => String(getMemberUserId(member)) === String(user?._id || ''));
      nextDraft.ageGroup = myMember?.ageGroup || '';
      nextDraft.gender = myMember?.gender || '';
      nextDraft.relation = myMember?.relation || '';

      setMemberForm({
        ageGroup: nextDraft.ageGroup,
        gender: nextDraft.gender,
        relation: nextDraft.relation,
      });
      setBaselineDraft(nextDraft);

      if (Array.isArray(nextTrip?.inviteTokens) && nextTrip.inviteTokens.length > 0) {
        const now = Date.now();
        const activeTokens = nextTrip.inviteTokens
          .filter((token) => token?.token && new Date(token.expires).getTime() > now)
          .sort((a, b) => new Date(b.expires).getTime() - new Date(a.expires).getTime());

        setInviteToken(activeTokens[0]?.token || '');
        setInviteExpiry(activeTokens[0]?.expires || '');
      } else {
        setInviteToken('');
        setInviteExpiry('');
      }
    },
    [user?._id]
  );

  const loadTripData = useCallback(
    async (showInitialLoader = true) => {
      if (showInitialLoader) {
        setLoading(true);
        setPageError('');
      } else {
        setActionState((prev) => ({ ...prev, refreshing: true }));
      }

      try {
        const { data } = await api.get(`/trips/${id}`);
        const nextTrip = data?.data?.trip || data?.trip || null;

        if (!nextTrip) {
          throw new Error('Trip data was not returned by the server.');
        }

        hydrateFromTrip(nextTrip);
      } catch (loadError) {
        const message = getErrorMessage(loadError, 'Failed to load trip data.');
        if (showInitialLoader) {
          setPageError(message);
        } else {
          setFeedback({ type: 'error', text: message });
        }
      } finally {
        if (showInitialLoader) {
          setLoading(false);
        }
        setActionState((prev) => ({ ...prev, refreshing: false }));
      }
    },
    [hydrateFromTrip, id]
  );

  useEffect(() => {
    loadTripData(true);
  }, [loadTripData]);

  useEffect(() => {
    if (!feedback.text) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFeedback((prev) => ({ ...prev, text: '' }));
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [feedback.text]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberFormChange = (event) => {
    const { name, value } = event.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetDraft = () => {
    if (!baselineDraft) return;

    setFormData((prev) => ({
      ...prev,
      startDate: baselineDraft.startDate,
      endDate: baselineDraft.endDate,
      travelers: baselineDraft.travelers,
      accommodationType: baselineDraft.accommodationType,
      transportMode: baselineDraft.transportMode,
      purpose: baselineDraft.purpose,
    }));
    setStatusDraft(baselineDraft.status);
    setMemberForm({
      ageGroup: baselineDraft.ageGroup,
      gender: baselineDraft.gender,
      relation: baselineDraft.relation,
    });

    setFeedback({ type: 'info', text: 'Draft reset to the last saved trip values.' });
  };

  const handleSaveDetails = async () => {
    if (!canEditTrip) {
      setFeedback({ type: 'error', text: 'Only owners or editors can update trip details.' });
      return;
    }

    if (hasCriticalAttention) {
      setFeedback({ type: 'error', text: 'Resolve critical attention items before saving core changes.' });
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setFeedback({ type: 'error', text: 'Please provide valid start and end dates.' });
      return;
    }

    if (endDate < startDate) {
      setFeedback({ type: 'error', text: 'End date cannot be before the start date.' });
      return;
    }

    setActionState((prev) => ({ ...prev, savingDetails: true }));
    try {
      const payload = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: Math.max(1, Number(formData.travelers) || 1),
        purpose: formData.purpose,
        preferences: {
          ...(trip?.preferences || {}),
          accommodationType: formData.accommodationType,
          transportMode: formData.transportMode,
        },
      };

      const { data } = await api.patch(`/trips/${id}/details`, payload);
      const updatedTrip = data?.data?.trip || null;
      if (updatedTrip) {
        hydrateFromTrip(updatedTrip);
      } else {
        await loadTripData(false);
      }
      setFeedback({ type: 'success', text: 'Trip details updated successfully.' });
    } catch (saveError) {
      setFeedback({ type: 'error', text: getErrorMessage(saveError, 'Failed to update trip details.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingDetails: false }));
    }
  };

  const handleSaveStatus = async () => {
    if (!canEditTrip) {
      setFeedback({ type: 'error', text: 'Only owners or editors can update trip status.' });
      return;
    }

    if (!statusDraft || statusDraft === trip?.status) return;

    setActionState((prev) => ({ ...prev, savingStatus: true }));
    try {
      const endpointStatus = normalizeStatusForEndpoint(statusDraft);
      let updatedTrip = null;

      try {
        const { data } = await api.patch(`/trips/${id}/status`, { status: endpointStatus });
        updatedTrip = data?.data?.trip || null;
      } catch {
        const { data } = await api.patch(`/trips/${id}/details`, { status: statusDraft });
        updatedTrip = data?.data?.trip || null;
      }

      if (updatedTrip) {
        hydrateFromTrip(updatedTrip);
      } else {
        setTrip((prev) => (prev ? { ...prev, status: endpointStatus } : prev));
        setStatusDraft(endpointStatus);
        setBaselineDraft((prev) => (prev ? { ...prev, status: endpointStatus } : prev));
      }

      setFeedback({ type: 'success', text: 'Trip status updated successfully.' });
    } catch (statusError) {
      setFeedback({ type: 'error', text: getErrorMessage(statusError, 'Failed to update trip status.') });
    } finally {
      setActionState((prev) => ({ ...prev, savingStatus: false }));
    }
  };

  const handleToggleFavorite = async () => {
    setActionState((prev) => ({ ...prev, togglingFavorite: true }));
    const previous = isFavorite;
    setIsFavorite((prev) => !prev);

    try {
      const { data } = await api.patch(`/trips/${id}/favorite`);
      const nextFavorite = data?.data?.favorite;
      if (typeof nextFavorite === 'boolean') {
        setIsFavorite(nextFavorite);
      }
      setFeedback({ type: 'success', text: 'Favorite status updated.' });
    } catch (favoriteError) {
      setIsFavorite(previous);
      setFeedback({ type: 'error', text: getErrorMessage(favoriteError, 'Failed to update favorite status.') });
    } finally {
      setActionState((prev) => ({ ...prev, togglingFavorite: false }));
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
      setFeedback({ type: 'success', text: token ? 'Invite token generated successfully.' : 'Invite token request completed.' });
    } catch (inviteError) {
      setFeedback({ type: 'error', text: getErrorMessage(inviteError, 'Failed to generate invite token.') });
    } finally {
      setActionState((prev) => ({ ...prev, generatingInvite: false }));
    }
  };

  const handleCopyInviteToken = async () => {
    if (!inviteToken) return;

    setActionState((prev) => ({ ...prev, copyingInvite: true }));
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
    } finally {
      setActionState((prev) => ({ ...prev, copyingInvite: false }));
    }
  };

  const handleDownloadPdf = async () => {
    setActionState((prev) => ({ ...prev, downloadingPdf: true }));
    try {
      const response = await api.get(`/trips/${id}/download`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

      const fallbackFileName = `waymate-${(trip?.destination || 'trip').replace(/\s+/g, '-').toLowerCase()}.pdf`;
      const disposition = response?.headers?.['content-disposition'] || response?.headers?.['Content-Disposition'];
      const fileName = getFilenameFromDisposition(disposition, fallbackFileName);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
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

  const handleUpgradeSmartSchedule = async () => {
    setActionState((prev) => ({ ...prev, upgradingSchedule: true }));
    try {
      const { data } = await api.post(`/trips/${id}/smart-schedule`);
      const schedule = data?.data?.schedule;
      if (schedule) {
        setTrip((prev) => (prev ? { ...prev, smartSchedule: schedule } : prev));
      } else {
        await loadTripData(false);
      }
      setFeedback({ type: 'success', text: 'Smart schedule generated successfully.' });
    } catch (scheduleError) {
      setFeedback({ type: 'error', text: getErrorMessage(scheduleError, 'Failed to generate smart schedule.') });
    } finally {
      setActionState((prev) => ({ ...prev, upgradingSchedule: false }));
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
            if (String(getMemberUserId(member)) !== String(user._id)) return member;
            return {
              ...member,
              ageGroup: updatedMember.ageGroup,
              gender: updatedMember.gender,
              relation: updatedMember.relation,
            };
          });

          return { ...prev, group: { ...prev.group, members: nextMembers } };
        });

        setBaselineDraft((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ageGroup: memberForm.ageGroup || '',
            gender: memberForm.gender || '',
            relation: memberForm.relation.trim(),
          };
        });
      }

      setFeedback({ type: 'success', text: 'Your trip member details were updated.' });
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

          const updatedMembers = prev.group.members.map((member) => {
            if (String(getMemberUserId(member)) !== String(memberId)) return member;
            return { ...member, role };
          });

          return { ...prev, group: { ...prev.group, members: updatedMembers } };
        });
      }

      setFeedback({ type: 'success', text: 'Member role updated successfully.' });
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
          const updatedMembers = prev.group.members.filter((member) => String(getMemberUserId(member)) !== String(memberId));
          return { ...prev, group: { ...prev.group, members: updatedMembers } };
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
      setFeedback({ type: 'error', text: 'Please add at least one activity for this day.' });
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

  const handleDeleteTrip = async () => {
    if (!isOwner) {
      setFeedback({ type: 'error', text: 'Only the trip owner can delete this trip.' });
      return;
    }

    const confirmed = window.confirm('Delete this trip permanently? This action cannot be undone.');
    if (!confirmed) return;

    setActionState((prev) => ({ ...prev, deletingTrip: true }));
    try {
      await api.delete(`/trips/${id}`);
      setFeedback({ type: 'success', text: 'Trip deleted successfully. Redirecting...' });
      window.setTimeout(() => navigate('/dashboard'), 900);
    } catch (deleteError) {
      setFeedback({ type: 'error', text: getErrorMessage(deleteError, 'Failed to delete this trip.') });
      setActionState((prev) => ({ ...prev, deletingTrip: false }));
    }
  };

  if (loading) {
    return <EditTripLoadingScreen />;
  }

  if (pageError || !trip) {
    return (
      <div className="edit-trip-error">
        <VscError />
        <h2>{pageError || 'Trip editor data is unavailable.'}</h2>
        <div className="edit-error-actions">
          <button type="button" className="edit-btn primary" onClick={() => loadTripData(true)}>
            <VscRefresh /> Retry
          </button>
          <button type="button" className="edit-btn ghost" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const tripDateRange = `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`;

  return (
    <div className="edit-trip-page">
      <div className="edit-trip-shell">
        <header className="edit-trip-hero">
          <img
            src={trip.coverImage || 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1600&q=80'}
            alt={trip.destination || 'Trip'}
            loading="eager"
            decoding="async"
          />

          <div className="edit-trip-hero-overlay">
            <div className="edit-trip-hero-top">
              <Link to={`/trip/${id}`} className="edit-back-link">
                <VscArrowLeft /> Back to Trip
              </Link>

              <div className="edit-trip-hero-actions">
                <button
                  type="button"
                  className="edit-icon-btn"
                  onClick={() => loadTripData(false)}
                  disabled={actionState.refreshing}
                  aria-label="Refresh trip data"
                >
                  {actionState.refreshing ? <VscLoading className="spin" /> : <VscRefresh />}
                </button>

                <button
                  type="button"
                  className={`edit-icon-btn ${isFavorite ? 'is-favorite' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={actionState.togglingFavorite}
                  aria-label="Toggle favorite"
                >
                  {actionState.togglingFavorite ? <VscLoading className="spin" /> : <VscHeart />}
                </button>
              </div>
            </div>

            <div className="edit-trip-hero-copy">
              <p className="edit-overline">Trip Workspace</p>
              <h1>Edit {trip.destination}</h1>
              <div className="edit-trip-meta">
                <span>
                  <VscCalendar /> {tripDateRange}
                </span>
                <span>
                  <IoPeopleSharp /> {trip.travelers || 1} Traveler{Number(trip.travelers || 1) > 1 ? 's' : ''}
                </span>
                <span>
                  <VscInfo /> Status: {titleCase(trip.status)}
                </span>
                {hasUnsavedChanges && (
                  <span className="edit-draft-pill">{draftChanges.length} unsaved change{draftChanges.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <Toast
          variant={feedback.type}
          message={feedback.text}
          onClose={() => setFeedback((prev) => ({ ...prev, text: '' }))}
        />

        {hasUnsavedChanges && (
          <section className="edit-draft-banner">
            <div className="edit-draft-main">
              <strong>Draft editing in progress</strong>
              <small>{draftChanges.length} field{draftChanges.length > 1 ? 's are' : ' is'} different from saved data.</small>
            </div>
            <div className="edit-draft-actions">
              <button type="button" className="edit-btn ghost" onClick={handleResetDraft}>
                <VscRefresh /> Reset Draft
              </button>
              <button
                type="button"
                className="edit-btn primary"
                onClick={handleSaveDetails}
                disabled={!canEditTrip || actionState.savingDetails || !hasCoreDetailsChanges || hasCriticalAttention}
              >
                {actionState.savingDetails ? <VscLoading className="spin" /> : <VscSave />} Save Core Changes
              </button>
            </div>
          </section>
        )}

        <section className="edit-trip-quick-actions">
          <button
            type="button"
            className="edit-btn primary"
            onClick={handleSaveDetails}
            disabled={!canEditTrip || actionState.savingDetails || !hasCoreDetailsChanges || hasCriticalAttention}
          >
            {actionState.savingDetails ? <VscLoading className="spin" /> : <VscSave />} Save Details
          </button>

          <button
            type="button"
            className="edit-btn ghost"
            onClick={handleSaveStatus}
            disabled={!canEditTrip || actionState.savingStatus || !hasStatusChange}
          >
            {actionState.savingStatus ? <VscLoading className="spin" /> : <VscCheck />} Save Status
          </button>

          <button
            type="button"
            className="edit-btn ghost"
            onClick={handleGenerateInvite}
            disabled={actionState.generatingInvite}
          >
            {actionState.generatingInvite ? <VscLoading className="spin" /> : <VscShare />} Generate Invite
          </button>

          <button
            type="button"
            className="edit-btn ghost"
            onClick={handleUpgradeSmartSchedule}
            disabled={actionState.upgradingSchedule}
          >
            {actionState.upgradingSchedule ? <VscLoading className="spin" /> : <FaTrainSubway />} Smart Schedule
          </button>

          <button
            type="button"
            className="edit-btn ghost"
            onClick={handleDownloadPdf}
            disabled={actionState.downloadingPdf}
          >
            {actionState.downloadingPdf ? <VscLoading className="spin" /> : <VscCloudDownload />} Download PDF
          </button>

          <Link to={`/trip/${id}/expenses`} className="edit-btn ghost is-link">
            <VscOrganization /> Open Expenses
          </Link>
        </section>

        {inviteToken && (
          <section className="edit-invite-banner">
            <div>
              <h3>Invite Token</h3>
              <code>{inviteToken}</code>
              <small>Expires: {formatDateTime(inviteExpiry)}</small>
            </div>
            <button
              type="button"
              className="edit-btn ghost"
              onClick={handleCopyInviteToken}
              disabled={actionState.copyingInvite}
            >
              {actionState.copyingInvite ? <VscLoading className="spin" /> : <VscCopy />} Copy
            </button>
          </section>
        )}

        <main className="edit-trip-layout">
          <section className="edit-main-column">
            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <VscEdit /> Core Details
                </h2>
                <p>Update dates, traveler count, comfort level, mode preference, and purpose.</p>
              </div>

              <div className="edit-form-grid">
                <label>
                  Destination
                  <input name="destination" value={formData.destination} onChange={handleFormChange} disabled />
                </label>

                <label>
                  Start Date
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleFormChange} />
                </label>

                <label>
                  End Date
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} />
                </label>

                <label>
                  Travelers
                  <input
                    type="number"
                    min="1"
                    name="travelers"
                    value={formData.travelers}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  Accommodation
                  <select name="accommodationType" value={formData.accommodationType} onChange={handleFormChange}>
                    {ACCOMMODATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Transport Preference
                  <select name="transportMode" value={formData.transportMode} onChange={handleFormChange}>
                    {TRANSPORT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Purpose
                  <select name="purpose" value={formData.purpose} onChange={handleFormChange}>
                    {PURPOSE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="edit-card-actions">
                <button
                  type="button"
                  className="edit-btn primary"
                  onClick={handleSaveDetails}
                  disabled={!canEditTrip || actionState.savingDetails || !hasCoreDetailsChanges || hasCriticalAttention}
                >
                  {actionState.savingDetails ? <VscLoading className="spin" /> : <VscSave />} Save Details
                </button>
              </div>
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <VscInfo /> Status Management
                </h2>
                <p>Save status updates independently without changing other details.</p>
              </div>

              <div className="edit-status-row">
                <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="edit-btn primary"
                  onClick={handleSaveStatus}
                  disabled={!canEditTrip || actionState.savingStatus || !hasStatusChange}
                >
                  {actionState.savingStatus ? <VscLoading className="spin" /> : <VscCheck />} Save Status
                </button>
              </div>
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <VscCalendar /> Itinerary Editor
                </h2>
                <p>Fine-tune day plans and keep itinerary updates synchronized.</p>
              </div>

              {itineraryDays.length > 0 ? (
                <div className="edit-itinerary-list">
                  {itineraryDays.map((day) => (
                    <section key={day.day} className="edit-itinerary-day">
                      <div className="edit-itinerary-head">
                        <div>
                          <h4>{day.title}</h4>
                          <small>Day {day.day}</small>
                        </div>

                        {canEditTrip && day.editable && supportsDayEdits && (
                          <button type="button" className="edit-btn ghost" onClick={() => openDayEditor(day)}>
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
                <p className="edit-muted">No itinerary entries available yet.</p>
              )}
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <FaTrainSubway /> Smart Schedule
                </h2>
                <p>Generate and review train recommendations for this trip.</p>
              </div>

              {trip.smartSchedule?.options?.length > 0 ? (
                <div className="edit-schedule-list">
                  {trip.smartSchedule.options.slice(0, 4).map((option, index) => (
                    <div key={`${option.trainNumber}-${index}`} className="edit-schedule-item">
                      <strong>
                        {option.trainName} ({option.trainNumber})
                      </strong>
                      <p>
                        {option.departureTime} to {option.arrivalTime} • {option.duration}
                      </p>
                      {option.availableClasses?.length > 0 && <small>{option.availableClasses.join(' | ')}</small>}
                      {option.recommendationReason && <em>{option.recommendationReason}</em>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="edit-muted">No smart schedule generated yet. Use the action button above to create one.</p>
              )}
            </article>
          </section>

          <aside className="edit-side-column">
            <article className="edit-card edit-attention-card">
              <div className="edit-card-head">
                <h2>
                  <VscWarning /> Special Attention Center
                </h2>
                <p>Edit-only checks that help prevent high-impact mistakes before saving.</p>
              </div>

              <ul className="edit-attention-list">
                {attentionChecks.map((item) => (
                  <li key={item.id} className={`edit-attention-item is-${item.severity}`}>
                    <span className={`edit-attention-badge is-${item.severity}`}>{titleCase(item.severity)}</span>
                    <p>{item.message}</p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <VscInfo /> Draft Change Review
                </h2>
                <p>Exclusive to edit mode: compare current draft values against the last saved trip snapshot.</p>
              </div>

              {hasUnsavedChanges ? (
                <ul className="edit-change-list">
                  {draftChanges.map((change) => (
                    <li key={change.key} className={`edit-change-item is-${change.emphasis}`}>
                      <strong>{change.label}</strong>
                      <small>
                        {change.from} to {change.to}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="edit-muted">No draft differences detected right now.</p>
              )}

              <div className="edit-card-actions">
                <button type="button" className="edit-btn ghost" onClick={handleResetDraft} disabled={!hasUnsavedChanges}>
                  <VscRefresh /> Reset Draft
                </button>
              </div>
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <IoPeopleSharp /> Trip Members
                </h2>
                <p>Manage roles and remove members when needed.</p>
                {!isOwner && <p className="edit-muted">Only the trip owner can update roles or remove members.</p>}
              </div>

              {members.length > 0 ? (
                <ul className="edit-members-list">
                  {members.map((member) => {
                    const memberUserId = getMemberUserId(member);
                    const memberName =
                      typeof member?.userId === 'string' ? 'Member' : member?.userId?.name || member?.userId?.email || 'Member';
                    const profileImage =
                      typeof member?.userId === 'string'
                        ? null
                        : member?.userId?.profileImage ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=0E3B4C&color=ffffff`;
                    const isCurrentUser = String(memberUserId) === String(user?._id || '');
                    const roleActionKey = `${memberUserId}:role`;
                    const removeActionKey = `${memberUserId}:remove`;

                    return (
                      <li key={memberUserId || memberName} className="edit-member-item">
                        {profileImage ? <img src={profileImage} alt={memberName} loading="lazy" decoding="async" /> : <div className="edit-avatar-fallback" />}

                        <div className="edit-member-main">
                          <strong>{memberName}</strong>
                          <small>{isCurrentUser ? 'You' : member?.userId?.email || 'Trip member'}</small>
                        </div>

                        <div className="edit-member-controls">
                          {isOwner && !isCurrentUser && member.role !== 'owner' ? (
                            <select
                              value={member.role}
                              onChange={(event) => handleMemberRoleChange(memberUserId, event.target.value)}
                              disabled={actionState.memberActionKey === roleActionKey}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                          ) : (
                            <span className="edit-role-pill">{titleCase(member.role)}</span>
                          )}

                          {isOwner && !isCurrentUser && member.role !== 'owner' && (
                            <button
                              type="button"
                              className="edit-icon-btn danger"
                              onClick={() => handleRemoveMember(memberUserId, memberName)}
                              disabled={actionState.memberActionKey === removeActionKey}
                              aria-label={`Remove ${memberName}`}
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
                <p className="edit-muted">No members found for this trip.</p>
              )}
            </article>

            <article className="edit-card">
              <div className="edit-card-head">
                <h2>
                  <VscOrganization /> My Member Details
                </h2>
                <p>Update your demographic details used for planning and analytics.</p>
              </div>

              <div className="edit-member-form">
                <label>
                  Age Group
                  <select name="ageGroup" value={memberForm.ageGroup} onChange={handleMemberFormChange}>
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
                  <select name="gender" value={memberForm.gender} onChange={handleMemberFormChange}>
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
                    type="text"
                    name="relation"
                    value={memberForm.relation}
                    onChange={handleMemberFormChange}
                    placeholder="Friend, sibling, colleague"
                  />
                </label>

                <button
                  type="button"
                  className="edit-btn primary"
                  onClick={handleSaveMyMemberDetails}
                  disabled={actionState.savingMemberDetails || !hasMemberDetailsChanges}
                >
                  {actionState.savingMemberDetails ? <VscLoading className="spin" /> : <VscSave />} Save My Details
                </button>
              </div>
            </article>

            <article className="edit-card danger-zone-card">
              <div className="edit-card-head">
                <h2>
                  <VscTrash /> Danger Zone
                </h2>
                <p>This permanently removes the trip and associated group chat.</p>
              </div>

              <button
                type="button"
                className="edit-btn danger"
                onClick={handleDeleteTrip}
                disabled={actionState.deletingTrip || !isOwner}
                title={isOwner ? 'Delete trip' : 'Only trip owner can delete'}
              >
                {actionState.deletingTrip ? <VscLoading className="spin" /> : <VscTrash />} Delete Trip
              </button>
            </article>
          </aside>
        </main>

        <DayPlanModal
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
    </div>
  );
}