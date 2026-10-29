import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscCloudDownload,
  VscEdit,
  VscError,
  VscInfo,
  VscOrganization,
  VscRefresh,
  VscSave,
  VscSparkle,
  VscTrash,
  VscWarning,
} from 'react-icons/vsc';
import {
  FaBed,
  FaCar,
  FaFileArrowDown,
  FaImage,
  FaMoneyBillWave,
  FaPlane,
  FaSuitcaseRolling,
  FaUsers,
} from 'react-icons/fa6';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import { Alert, Badge, Button, Loading, useConfirm } from '../../components/UI';
import api from '../../utils/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './EditTrip.css';

const PURPOSE_OPTIONS = [
  { id: 'leisure', label: 'Leisure & Vacation' },
  { id: 'work', label: 'Business & Work' },
  { id: 'education', label: 'Education & Study' },
  { id: 'shopping', label: 'Shopping & Exploration' },
  { id: 'personal_business', label: 'Personal Business' },
  { id: 'other', label: 'Other Journey' },
];

const TRANSPORT_OPTIONS = [
  { id: 'any', label: 'Flexible / Multi-modal' },
  { id: 'flight', label: 'Flight' },
  { id: 'train', label: 'Rail / Metro' },
  { id: 'bus', label: 'Bus / Coach' },
  { id: 'car', label: 'Car / Road Trip' },
];

const ACCOMMODATION_OPTIONS = [
  { id: 'budget', label: 'Budget (Hostels & B&Bs)' },
  { id: 'standard', label: 'Standard (Boutique Hotels)' },
  { id: 'luxury', label: 'Luxury (Resorts & 5-Star)' },
];

const STATUS_OPTIONS = [
  { id: 'planning', label: 'Planning', desc: 'Crafting itinerary, routes, and squad details' },
  { id: 'upcoming', label: 'Upcoming', desc: 'Departing soon; logistics locked' },
  { id: 'in_progress', label: 'In Progress / Active', desc: 'Currently traveling; live GPS telemetry active' },
  { id: 'completed', label: 'Completed', desc: 'Journey finished; archived with reusable AI memory' },
  { id: 'canceled', label: 'Canceled', desc: 'Expedition halted or postponed' },
];

const COVER_PRESETS = [
  { name: 'Alpine Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Coastal Waters', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Heritage Town', url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Green Highlands', url: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Kyoto Sanctuary', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80' },
];

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function EditTrip() {
  const { id, tripId } = useParams();
  const effectiveId = id || tripId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 1,
    purpose: 'leisure',
    transportMode: 'any',
    accommodationType: 'standard',
    budget: '',
    coverImage: '',
    status: 'planning',
  });

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/trips/${effectiveId}`);
      const tripData = res?.data?.data?.trip || res?.data?.data || null;

      if (!tripData) {
        throw new Error('Trip not found.');
      }

      setTrip(tripData);
      setFormData({
        destination: tripData.destination || '',
        startDate: formatDateInput(tripData.startDate),
        endDate: formatDateInput(tripData.endDate),
        travelers: tripData.travelers || 1,
        purpose: tripData.purpose || 'leisure',
        transportMode: tripData.preferences?.transportMode || tripData.transportMode || 'any',
        accommodationType: tripData.preferences?.accommodationType || tripData.accommodationType || 'standard',
        budget: tripData.budget?.estimatedTotal || tripData.budget || '',
        coverImage: tripData.coverImage || '',
        status: tripData.status || 'planning',
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load trip settings.');
    } finally {
      setLoading(false);
    }
  }, [effectiveId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const isOwner = useMemo(() => {
    const creatorId = trip?.user?._id || trip?.user || trip?.createdBy;
    return String(creatorId || '') === String(user?._id || '');
  }, [trip, user]);

  const handleSaveCoreDetails = async (e) => {
    e.preventDefault();
    if (!formData.destination.trim()) {
      setError('Trip destination is required.');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      setError('End date cannot precede the departure start date.');
      return;
    }

    try {
      setSavingDetails(true);
      setError(null);

      const payload = {
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: Math.max(1, Number(formData.travelers) || 1),
        purpose: formData.purpose,
        coverImage: formData.coverImage.trim() || undefined,
        budget: formData.budget ? Number(formData.budget) : undefined,
        preferences: {
          ...(trip?.preferences || {}),
          accommodationType: formData.accommodationType,
          transportMode: formData.transportMode,
        },
      };

      const res = await api.patch(`/trips/${effectiveId}/details`, payload);
      const updated = res?.data?.data?.trip || res?.data?.trip;
      if (updated) {
        setTrip(updated);
      }
      setSuccessMsg('Expedition settings saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      setError(null);
      await api.patch(`/trips/${effectiveId}/status`, { status: newStatus });
      setFormData((prev) => ({ ...prev, status: newStatus }));
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setSuccessMsg(`Trip lifecycle updated to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update trip status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportJson = () => {
    if (!trip) return;
    const jsonStr = JSON.stringify(trip, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WayMate-${(trip.destination || 'expedition').replace(/\s+/g, '_')}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTrip = async () => {
    if (!isOwner) {
      setError('Only the trip owner has permission to delete this expedition.');
      return;
    }

    const confirmed = await confirm({
      title: 'Permanently Delete Expedition?',
      message: `This will permanently erase all itinerary data, waypoints, expense records, and chat history for ${trip?.destination || 'this expedition'}. This action cannot be undone.`,
      confirmLabel: 'Delete Expedition Permanently',
      variant: 'error',
    });

    if (!confirmed) return;

    try {
      setDeletingTrip(true);
      await api.delete(`/trips/${effectiveId}`);
      navigate('/trips');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete expedition.');
      setDeletingTrip(false);
    }
  };

  if (loading) {
    return (
      <div className="trip-settings-page">
        <DashboardNavbar />
        <div className="settings-shell">
          <TripSubNav activeTab="settings" />
          <div className="settings-loading-wrap">
            <Loading
              size="lg"
              label="Accessing expedition settings..."
              sublabel="Retrieving configuration, telemetry permissions, and lifecycle state"
              dark
            />
          </div>
        </div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="trip-settings-page">
        <DashboardNavbar />
        <div className="settings-shell">
          <div className="settings-error-card">
            <VscError className="error-icon" />
            <h2>Expedition Not Found</h2>
            <p>{error}</p>
            <Link to="/trips" className="btn-back-trips">
              Return to Journeys Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-settings-page">
      <DashboardNavbar />

      {/* Atmospheric Ambient Glows */}
      <div className="settings-ambient" aria-hidden="true">
        <div className="settings-orb settings-orb-1" />
        <div className="settings-orb settings-orb-2" />
      </div>

      <main className="settings-shell">
        {/* Top Breadcrumb Link */}
        <div className="settings-top-nav">
          <Link to={`/trip/${effectiveId}`} className="settings-back-link">
            <VscArrowLeft />
            <span>Back to {trip?.destination || 'Trip'} Overview</span>
          </Link>
        </div>

        {/* Canonical Expedition Sub Navigation Dock */}
        <TripSubNav activeTab="settings" />

        {/* Page Header */}
        <header className="settings-hero-header">
          <div className="settings-title-group">
            <div className="settings-eyebrow">
              <span className="live-pulse-dot" />
              <span>EXPEDITION CONFIGURATION & LIFECYCLE</span>
            </div>
            <h1>{trip?.destination} Settings</h1>
            <p>
              Manage core journey parameters, travel dates, status lifecycle, visual identity,
              and data archives for this expedition.
            </p>
          </div>

          <div className="settings-header-badges">
            <span className="badge-owner-pill">
              {isOwner ? '👑 Trip Owner' : '👥 Squad Editor'}
            </span>
          </div>
        </header>

        {/* Banners */}
        {error && (
          <Alert variant="error" closable onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" closable onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {/* Main Settings Grid */}
        <div className="settings-grid">
          {/* Section 1: Core Expedition Details Form */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon">
                <FaSuitcaseRolling />
              </div>
              <div>
                <h2>Expedition Parameters</h2>
                <p>Destination, travel window, party size, and expedition category</p>
              </div>
            </div>

            <form onSubmit={handleSaveCoreDetails} className="settings-form">
              <div className="form-group">
                <label htmlFor="set-dest">Destination Name</label>
                <input
                  id="set-dest"
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  placeholder="e.g. Darjeeling, West Bengal, India"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="set-start">Departure Start Date</label>
                  <input
                    id="set-start"
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="set-end">Return / End Date</label>
                  <input
                    id="set-end"
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="set-travelers">Travelers Count</label>
                  <input
                    id="set-travelers"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.travelers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        travelers: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="set-purpose">Journey Purpose</label>
                  <select
                    id="set-purpose"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                  >
                    {PURPOSE_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="set-budget">Estimated Budget ($)</label>
                  <input
                    id="set-budget"
                    type="number"
                    min="0"
                    placeholder="e.g. 2500"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="set-transit">Primary Transit Mode</label>
                  <select
                    id="set-transit"
                    value={formData.transportMode}
                    onChange={(e) =>
                      setFormData({ ...formData, transportMode: e.target.value })
                    }
                  >
                    {TRANSPORT_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="set-accom">Accommodation Preference</label>
                  <select
                    id="set-accom"
                    value={formData.accommodationType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accommodationType: e.target.value,
                      })
                    }
                  >
                    {ACCOMMODATION_OPTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions-row">
                <button
                  type="submit"
                  className="btn-save-settings"
                  disabled={savingDetails}
                >
                  <VscSave className="btn-icon" />
                  <span>{savingDetails ? 'Saving Changes...' : 'Save Expedition Parameters'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Section 2: Expedition Lifecycle Status */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon">
                <VscInfo />
              </div>
              <div>
                <h2>Expedition Lifecycle Status</h2>
                <p>Current travel phase determines GPS tracking mode and dashboard visibility</p>
              </div>
            </div>

            <div className="status-selector-grid">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = formData.status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`status-option-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleUpdateStatus(opt.id)}
                    disabled={updatingStatus}
                  >
                    <div className="status-card-top">
                      <span className={`status-pill status-pill--${opt.id}`}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span className="selected-check">
                          <VscCheck /> Active Phase
                        </span>
                      )}
                    </div>
                    <p className="status-card-desc">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Visual Identity & Cover Banner */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon">
                <FaImage />
              </div>
              <div>
                <h2>Visual Identity & Cover Imagery</h2>
                <p>Customize the editorial header banner showcased in the Master Overview</p>
              </div>
            </div>

            <div className="cover-settings-wrap">
              <div className="cover-preview-frame">
                <img
                  src={
                    formData.coverImage ||
                    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt="Cover preview"
                  loading="lazy"
                />
                <div className="cover-preview-overlay">
                  <span className="preview-label">Live Header Preview</span>
                  <h3>{formData.destination || 'Destination'}</h3>
                </div>
              </div>

              <div className="cover-presets-section">
                <label>Curated Theme Presets</label>
                <div className="presets-row">
                  {COVER_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-btn"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, coverImage: p.url }))
                      }
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="set-cover-url">Custom Photo URL</label>
                  <input
                    id="set-cover-url"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.coverImage}
                    onChange={(e) =>
                      setFormData({ ...formData, coverImage: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Data Export & Archive */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon">
                <FaFileArrowDown />
              </div>
              <div>
                <h2>Expedition Telemetry & Data Export</h2>
                <p>Download full structured expedition data, route records, and squad telemetry</p>
              </div>
            </div>

            <div className="export-actions-row">
              <button
                type="button"
                className="btn-export-json"
                onClick={handleExportJson}
              >
                <VscCloudDownload className="btn-icon" />
                <span>Export Journey Data (JSON)</span>
              </button>

              <button
                type="button"
                className="btn-ai-assist"
                onClick={() =>
                  navigate('/assistant', {
                    state: {
                      sessionMode: 'ai',
                      tripId: effectiveId,
                      tripName: trip?.destination || '',
                      prefillMessage: `Review and optimize the expedition configuration for our trip to ${trip?.destination || 'our destination'}.`,
                    },
                  })
                }
              >
                <VscSparkle className="btn-icon" />
                <span>Optimize Route with AI</span>
              </button>
            </div>
          </section>

          {/* Section 5: Danger Zone */}
          <section className="settings-card settings-card--danger">
            <div className="settings-card-header">
              <div className="card-header-icon card-header-icon--danger">
                <VscWarning />
              </div>
              <div>
                <h2 style={{ color: '#f87171' }}>Danger Zone</h2>
                <p>Destructive actions affecting this expedition and all registered co-travelers</p>
              </div>
            </div>

            <div className="danger-zone-content">
              <div className="danger-desc">
                <h4>Delete this Expedition</h4>
                <p>
                  Permanently erase {trip?.destination}, all scheduled itinerary activities,
                  transit bookings, expense ledgers, and real-time chat sessions. Once deleted, this
                  data cannot be recovered.
                </p>
              </div>

              <button
                type="button"
                className="btn-delete-trip"
                onClick={handleDeleteTrip}
                disabled={deletingTrip || !isOwner}
                title={!isOwner ? 'Only trip owner can delete' : 'Delete expedition'}
              >
                <VscTrash className="btn-icon" />
                <span>{deletingTrip ? 'Deleting...' : 'Delete Expedition'}</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
