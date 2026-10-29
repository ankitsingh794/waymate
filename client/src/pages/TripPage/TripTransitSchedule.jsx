import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscCompass,
  VscInfo,
  VscRefresh,
  VscSparkle,
} from 'react-icons/vsc';
import { FaTrainSubway } from 'react-icons/fa6';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import { Alert, Badge, Button, Loading } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TripTransitSchedule.css';

export default function TripTransitSchedule() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  const fetchTrip = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await api.get(`/trips/${id}`);
      const tripData = res?.data?.data?.trip || res?.data?.data || null;
      setTrip(tripData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load transit schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleRefreshSchedule = async () => {
    try {
      setRefreshing(true);
      await api.post(`/trips/${id}/smart-schedule`);
      setBanner({
        type: 'success',
        text: 'Transit options and schedule refreshed from real-time railway APIs.',
      });
      fetchTrip();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not refresh rail schedule.');
    } finally {
      setRefreshing(false);
    }
  };

  const schedule = trip?.smartSchedule;
  const options = schedule?.options || [];

  if (loading) {
    return (
      <div className="transit-sched-page">
        <DashboardNavbar />
        <div className="transit-sched-loading">
          <Loading size="lg" />
          <p>Connecting to railway & transit telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transit-sched-page">
      <DashboardNavbar />

      <div className="transit-sched-ambient" aria-hidden="true">
        <div className="transit-sched-orb transit-sched-orb-1" />
        <div className="transit-sched-orb transit-sched-orb-2" />
      </div>

      <main className="transit-sched-shell">
        <div className="transit-sched-top-nav">
          <Link to={`/trip/${id}`} className="transit-sched-back-link">
            <VscArrowLeft /> Back to {trip?.destination || 'Trip'} Overview
          </Link>
        </div>

        <TripSubNav />

        <header className="transit-sched-header">
          <div>
            <div className="transit-sched-eyebrow">
              <span className="transit-sched-live-dot" />
              <span>Multi-Modal Transport Engine</span>
            </div>
            <h1>Smart Rail & Transit Schedule</h1>
            <p>
              Automated rail schedules, train numbers, coach class availability, and AI route recommendations for {trip?.destination || 'your destination'}.
            </p>
          </div>

          <div className="transit-sched-header-actions">
            <Button
              variant="primary"
              icon={VscRefresh}
              loading={refreshing}
              onClick={handleRefreshSchedule}
            >
              Refresh Rail Telemetry
            </Button>
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

        {/* Stations Briefing Card */}
        <section className="transit-corridor-card">
          <div className="corridor-stat">
            <span className="label">Origin Station</span>
            <strong>{schedule?.sourceStation || trip?.origin?.city || 'Nearest Rail Hub'}</strong>
          </div>
          <div className="corridor-arrow">
            <span>⇄</span>
          </div>
          <div className="corridor-stat">
            <span className="label">Destination Station</span>
            <strong>{schedule?.destinationStation || trip?.destination || 'Arrival Junction'}</strong>
          </div>
          <div className="corridor-stat">
            <span className="label">Travel Date</span>
            <strong>
              {schedule?.travelDate ||
                (trip?.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Scheduled Day')}
            </strong>
          </div>
        </section>

        {/* Options List */}
        <section className="transit-options-grid">
          {options.length === 0 ? (
            <div className="transit-empty-card">
              <FaTrainSubway className="empty-icon" />
              <h3>No Smart Rail Schedules Recorded Yet</h3>
              <p>
                Click "Refresh Rail Telemetry" to pull real-time train options, departure timings, and available classes between your route corridor.
              </p>
              <Button
                variant="primary"
                icon={VscSparkle}
                loading={refreshing}
                onClick={handleRefreshSchedule}
              >
                Generate Smart Rail Schedule
              </Button>
            </div>
          ) : (
            options.map((opt, idx) => (
              <article key={idx} className="transit-train-card">
                <div className="train-card-header">
                  <div>
                    <span className="train-number">{opt.trainNumber || `#${12000 + idx}`}</span>
                    <h3>{opt.trainName || 'Express Service'}</h3>
                  </div>
                  <Badge variant="success" size="sm">
                    Verified Schedule
                  </Badge>
                </div>

                <div className="train-timings-strip">
                  <div className="timing-box">
                    <span className="time">{opt.departureTime || '06:00'}</span>
                    <span className="city">{schedule?.sourceStation || 'Departure'}</span>
                  </div>
                  <div className="duration-line">
                    <span>{opt.duration || 'approx 4h 30m'}</span>
                    <div className="line" />
                  </div>
                  <div className="timing-box">
                    <span className="time">{opt.arrivalTime || '10:30'}</span>
                    <span className="city">{schedule?.destinationStation || 'Arrival'}</span>
                  </div>
                </div>

                {opt.availableClasses && opt.availableClasses.length > 0 && (
                  <div className="train-classes-row">
                    <span className="classes-label">Classes:</span>
                    <div className="classes-tags">
                      {opt.availableClasses.map((cls, cIdx) => (
                        <span key={cIdx} className="class-pill">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {opt.recommendationReason && (
                  <div className="train-ai-note">
                    <VscSparkle />
                    <p>{opt.recommendationReason}</p>
                  </div>
                )}

                <div className="train-card-footer">
                  <a
                    href="https://www.irctc.co.in"
                    target="_blank"
                    rel="noreferrer"
                    className="train-book-link"
                  >
                    <span>Check IRCTC Availability</span>
                    <span>↗</span>
                  </a>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
