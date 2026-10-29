import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCheck,
  VscCompass,
  VscHistory,
  VscLocation,
  VscPlay,
  VscPulse,
  VscDebugStop,
  VscSync,
} from 'react-icons/vsc';
import { FaTrainSubway, FaCar, FaPersonWalking, FaPersonBiking, FaBus } from 'react-icons/fa6';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Modal } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TrackingCockpit.css';

const MODES = [
  { id: 'walking', label: 'Walking / Foot', icon: FaPersonWalking },
  { id: 'running', label: 'Running / Jog', icon: FaPersonWalking },
  { id: 'cycling', label: 'Bicycle / Cycle', icon: FaPersonBiking },
  { id: 'public_transport', label: 'Metro / Rail / Bus', icon: FaTrainSubway },
  { id: 'driving', label: 'Car / Cab / Ride', icon: FaCar },
];

export default function TrackingCockpit() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentMode, setCurrentMode] = useState('walking');
  const [tripId, setTripId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [coords, setCoords] = useState(null);
  const [breadcrumbsCount, setBreadcrumbsCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modeModalOpen, setModeModalOpen] = useState(false);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);

  // Timer tick
  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTracking]);

  const formatDuration = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hrs = Math.floor(mins / 60);
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins % 60}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleStartTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, speed } = position.coords;
          setCoords({ lat: latitude, lon: longitude });

          try {
            const res = await api.post('/tracking/start', {
              mode: currentMode,
              lat: latitude,
              lon: longitude,
              timestamp: new Date().toISOString(),
            });

            const activeTripId = res?.data?.data?.tripId || res?.data?.data?._id;
            setTripId(activeTripId);
            setIsTracking(true);
            setElapsedSeconds(0);
            setDistanceMeters(0);
            setBreadcrumbsCount(1);

            // Start watch position
            watchIdRef.current = navigator.geolocation.watchPosition(
              async (pos) => {
                const newLat = pos.coords.latitude;
                const newLon = pos.coords.longitude;
                const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
                setCurrentSpeedKmh(speedKmh);
                setCoords({ lat: newLat, lon: newLon });
                setBreadcrumbsCount((c) => c + 1);

                // Append telemetry to backend
                try {
                  await api.post('/tracking/append', {
                    lat: newLat,
                    lon: newLon,
                    speed: pos.coords.speed || 0,
                    mode: currentMode,
                    timestamp: new Date().toISOString(),
                  });
                } catch {
                  // Silent background append error
                }
              },
              (watchErr) => {
                setError(`Location stream error: ${watchErr.message}`);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
          } catch (err) {
            setError(err?.response?.data?.message || 'Could not initiate tracking session on server.');
          } finally {
            setLoading(false);
          }
        },
        (posErr) => {
          setLoading(false);
          setError(`Permission denied or GPS unavailable: ${posErr.message}`);
        },
        { enableHighAccuracy: true }
      );
    } catch (err) {
      setLoading(false);
      setError('Unexpected error starting tracking.');
    }
  };

  const handleEndTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      setLoading(true);
      await api.post('/tracking/end', {
        tripId,
        distanceMeters,
        timestamp: new Date().toISOString(),
      });
      setIsTracking(false);
      alert('Expedition tracking session completed and recorded for NATPAC citizen science!');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save completed tracking session.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMode = async (newMode) => {
    setCurrentMode(newMode);
    setModeModalOpen(false);
    if (isTracking) {
      try {
        await api.post('/tracking/change-mode', { mode: newMode });
      } catch {
        // silent
      }
    }
  };

  const CurrentModeIcon = MODES.find((m) => m.id === currentMode)?.icon || FaPersonWalking;

  return (
    <div className="tracking-page">
      <DashboardNavbar />

      <div className="tracking-ambient" aria-hidden="true">
        <div className="tracking-orb tracking-orb-1" />
        <div className="tracking-orb tracking-orb-2" />
      </div>

      <main className="tracking-shell">
        <div className="tracking-top-nav">
          <Link to="/dashboard" className="tracking-back-link">
            <VscArrowLeft /> Back to Command Center
          </Link>
        </div>

        <header className="tracking-header">
          <div>
            <div className="tracking-eyebrow">
              <span className={`tracking-dot ${isTracking ? 'is-live' : ''}`} />
              <span>{isTracking ? 'Live Transit Telemetry' : 'Mobility Sensor Cockpit'}</span>
            </div>
            <h1>Live GPS Transit Tracker</h1>
            <p>
              Passive and active transit data capture. Your anonymized telemetry trains NATPAC models to eliminate urban transit congestion.
            </p>
          </div>

          <div className="tracking-header-actions">
            <Link to="/tracking/history" className="btn btn-outline">
              <VscHistory className="btn-icon" />
              <span>Confirm Detected Legs</span>
            </Link>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Cockpit HUD Main Display */}
        <div className="tracking-hud-card">
          <div className="hud-status-banner">
            <div className="hud-mode-pill">
              <CurrentModeIcon />
              <span>Mode: {currentMode.replace('_', ' ').toUpperCase()}</span>
            </div>
            <button
              type="button"
              className="hud-change-mode-btn"
              onClick={() => setModeModalOpen(true)}
            >
              Change Mode 🔀
            </button>
          </div>

          <div className="hud-telemetry-metrics">
            <div className="metric-pod">
              <span className="metric-label">Elapsed Time</span>
              <strong className="metric-value">{formatDuration(elapsedSeconds)}</strong>
            </div>
            <div className="metric-pod">
              <span className="metric-label">Current Velocity</span>
              <strong className="metric-value">{currentSpeedKmh} km/h</strong>
            </div>
            <div className="metric-pod">
              <span className="metric-label">GPS Waypoints</span>
              <strong className="metric-value">{breadcrumbsCount}</strong>
            </div>
            <div className="metric-pod">
              <span className="metric-label">Sensor Status</span>
              <strong className="metric-value status-online">
                {isTracking ? 'Active Recording' : 'Standby'}
              </strong>
            </div>
          </div>

          {/* Coordinates readout */}
          {coords && (
            <div className="hud-coords-readout">
              <VscLocation />
              <span>
                Coordinates: {coords.lat.toFixed(5)}° N, {coords.lon.toFixed(5)}° E
              </span>
            </div>
          )}

          {/* Master Cockpit Controls */}
          <div className="hud-controls-dock">
            {!isTracking ? (
              <Button
                variant="primary"
                size="lg"
                icon={VscPlay}
                loading={loading}
                onClick={handleStartTracking}
              >
                Start Live Expedition Tracking
              </Button>
            ) : (
              <Button
                variant="danger"
                size="lg"
                icon={VscDebugStop}
                loading={loading}
                onClick={handleEndTracking}
              >
                End & Submit Expedition
              </Button>
            )}
          </div>
        </div>

        {/* Change Mode Modal */}
        {modeModalOpen && (
          <Modal
            isOpen={modeModalOpen}
            onClose={() => setModeModalOpen(false)}
            title="Select Active Transport Mode"
          >
            <div className="mode-select-grid">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`mode-select-tile ${currentMode === m.id ? 'is-selected' : ''}`}
                    onClick={() => handleChangeMode(m.id)}
                  >
                    <Icon className="tile-icon" />
                    <span className="tile-title">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}
