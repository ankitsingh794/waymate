import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscEdit,
  VscHistory,
  VscLocation,
  VscSparkle,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Loading, Modal } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './ModeConfirmationStudio.css';

const MODE_CHOICES = [
  'walking',
  'running',
  'cycling',
  'driving',
  'public_transport',
  'still',
];

export default function ModeConfirmationStudio() {
  const [tripsWithSegments, setTripsWithSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(null);
  const [correctedMode, setCorrectedMode] = useState('public_transport');
  const [updating, setUpdating] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/trips?limit=20');
      const list = res?.data?.data?.data || res?.data?.data || [];
      const withSegs = (Array.isArray(list) ? list : list.data || []).filter(
        (t) => t.segments && t.segments.length > 0
      );
      setTripsWithSegments(withSegs);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load transit segments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleConfirmMode = async (tripId, segmentIndex, mode) => {
    try {
      await api.post(`/tracking/trips/${tripId}/confirm`, {
        segmentIndex,
        confirmedMode: mode,
        isConfirmed: true,
      });
      setBanner({
        type: 'success',
        text: `Confirmed mode as ${mode.replace('_', ' ')} for NATPAC research dataset!`,
      });
      fetchTrips();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not confirm transit mode.');
    }
  };

  const handleOpenCorrectModal = (tripId, segmentIndex, currentMode) => {
    setSelectedTripId(tripId);
    setSelectedSegmentIndex(segmentIndex);
    setCorrectedMode(currentMode);
    setEditModalOpen(true);
  };

  const handleSaveCorrection = async () => {
    try {
      setUpdating(true);
      await api.post(`/tracking/trips/${selectedTripId}/confirm`, {
        segmentIndex: selectedSegmentIndex,
        confirmedMode: correctedMode,
        isConfirmed: true,
      });
      setEditModalOpen(false);
      setBanner({
        type: 'success',
        text: `Transit mode corrected to ${correctedMode.replace('_', ' ')}. Thank you for contributing to citizen science!`,
      });
      fetchTrips();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit corrected mode.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="mode-studio-page">
        <DashboardNavbar />
        <div className="mode-studio-loading">
          <Loading size="lg" />
          <p>Analyzing AI transit classifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mode-studio-page">
      <DashboardNavbar />

      <div className="mode-studio-ambient" aria-hidden="true">
        <div className="mode-studio-orb mode-studio-orb-1" />
        <div className="mode-studio-orb mode-studio-orb-2" />
      </div>

      <main className="mode-studio-shell">
        <div className="mode-studio-top-nav">
          <Link to="/tracking" className="mode-studio-back-link">
            <VscArrowLeft /> Back to Tracking Cockpit
          </Link>
        </div>

        <header className="mode-studio-header">
          <div>
            <div className="mode-studio-eyebrow">
              <span className="mode-studio-live-dot" />
              <span>Citizen Science Ground Truth</span>
            </div>
            <h1>Transit Mode Confirmation Studio</h1>
            <p>
              Review AI-classified transport legs (e.g. Metro vs Bus vs Walking). Confirming or correcting these legs feeds supervised machine learning datasets for transportation research agencies.
            </p>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {banner && (
          <Alert variant={banner.type} closable onClose={() => setBanner(null)}>
            {banner.text}
          </Alert>
        )}

        <section className="mode-segments-feed">
          {tripsWithSegments.length === 0 ? (
            <div className="mode-empty-card">
              <VscSparkle className="empty-icon" />
              <h3>All Transit Legs Verified</h3>
              <p>
                No unconfirmed journey segments pending review. When you run live GPS tracking sessions, AI-detected legs will appear here for validation.
              </p>
              <Link to="/tracking" className="btn btn-primary">
                Open Tracking Cockpit →
              </Link>
            </div>
          ) : (
            tripsWithSegments.map((trip) => {
              const tripId = trip._id || trip.tripId;
              return (
                <div key={tripId} className="trip-segments-group">
                  <div className="group-title">
                    <VscLocation />
                    <h3>{trip.destination}</h3>
                    <span>{new Date(trip.startDate).toLocaleDateString()}</span>
                  </div>

                  <div className="segments-list">
                    {trip.segments.map((seg, sIdx) => {
                      const detected = seg.mode || 'unknown';
                      const confidence = Math.round((seg.confidence || 0.85) * 100);
                      const isConfirmed = seg.isConfirmed;

                      return (
                        <article key={sIdx} className="segment-card">
                          <div className="segment-meta">
                            <span className="leg-label">Leg #{sIdx + 1}</span>
                            <div className="mode-tag">
                              <strong>{detected.replace('_', ' ').toUpperCase()}</strong>
                              <span className="confidence-pill">{confidence}% AI confidence</span>
                            </div>
                            {isConfirmed ? (
                              <Badge variant="success" size="sm">
                                Verified ✓
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Pending Ground Truth
                              </Badge>
                            )}
                          </div>

                          <div className="segment-actions">
                            {!isConfirmed && (
                              <button
                                type="button"
                                className="confirm-btn"
                                onClick={() => handleConfirmMode(tripId, sIdx, detected)}
                              >
                                <VscCheck /> Confirm ({detected.replace('_', ' ')})
                              </button>
                            )}
                            <button
                              type="button"
                              className="correct-btn"
                              onClick={() => handleOpenCorrectModal(tripId, sIdx, detected)}
                            >
                              <VscEdit /> Correct Mode
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Correction Modal */}
        {editModalOpen && (
          <Modal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            title="Correct Transport Mode for Leg"
          >
            <div className="correct-modal-body">
              <p>What actual mode of transport did you use for this leg?</p>
              <div className="mode-options-grid">
                {MODE_CHOICES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`mode-choice-btn ${correctedMode === m ? 'is-selected' : ''}`}
                    onClick={() => setCorrectedMode(m)}
                  >
                    <span>{m.replace('_', ' ').toUpperCase()}</span>
                  </button>
                ))}
              </div>

              <div className="correct-modal-footer">
                <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={updating} onClick={handleSaveCorrection}>
                  Save Ground Truth
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
