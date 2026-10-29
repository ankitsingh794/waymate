import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  VscAdd,
  VscArrowLeft,
  VscCalendar,
  VscCheck,
  VscEdit,
  VscLoading,
  VscLocation,
  VscMilestone,
  VscSparkle,
  VscTrash,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import TripSubNav from './TripSubNav';
import { Alert, Badge, Button, Loading, Modal } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TripItineraryStudio.css';

export default function TripItineraryStudio() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  const [activeDay, setActiveDay] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityText, setActivityText] = useState('');

  const fetchTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/trips/${id}`);
      const tripData = res?.data?.data?.trip || res?.data?.data || null;
      setTrip(tripData);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load trip itinerary.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const itineraryList = trip?.itinerary || [];
  // Calculate total days from itinerary or dates
  const totalDays = Math.max(
    itineraryList.length,
    trip?.startDate && trip?.endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 3
  );

  // Current day itinerary object
  const currentDayPlan = itineraryList.find((item) => item.day === activeDay) || {
    day: activeDay,
    title: `Day ${activeDay} Exploration`,
    activities: [],
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityText.trim()) return;

    try {
      setSavingActivity(true);
      const updatedActivities = [...(currentDayPlan.activities || []), activityText.trim()];

      await api.patch(`/trips/${id}/itinerary/${activeDay}`, {
        activities: updatedActivities,
      });

      setTrip((prev) => {
        if (!prev) return prev;
        const existingList = prev.itinerary || [];
        const index = existingList.findIndex((item) => item.day === activeDay);
        let newList = [...existingList];
        if (index >= 0) {
          newList[index] = { ...newList[index], activities: updatedActivities };
        } else {
          newList.push({
            day: activeDay,
            title: `Day ${activeDay} Exploration`,
            activities: updatedActivities,
            sequence: activeDay,
            type: 'activity',
          });
        }
        return { ...prev, itinerary: newList };
      });

      setActivityText('');
      setModalOpen(false);
      setBanner({ type: 'success', text: `Activity added to Day ${activeDay}.` });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save activity.');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityIndex) => {
    try {
      const updatedActivities = (currentDayPlan.activities || []).filter(
        (_, idx) => idx !== activityIndex
      );

      await api.patch(`/trips/${id}/itinerary/${activeDay}`, {
        activities: updatedActivities,
      });

      setTrip((prev) => {
        if (!prev) return prev;
        const existingList = prev.itinerary || [];
        const index = existingList.findIndex((item) => item.day === activeDay);
        if (index < 0) return prev;
        const newList = [...existingList];
        newList[index] = { ...newList[index], activities: updatedActivities };
        return { ...prev, itinerary: newList };
      });
      setBanner({ type: 'success', text: 'Activity removed.' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete activity.');
    }
  };

  const handleSmartReschedule = async () => {
    try {
      setRescheduling(true);
      await api.post(`/trips/${id}/smart-schedule`);
      setBanner({
        type: 'success',
        text: 'AI Smart Schedule updated based on real-time transit and weather conditions!',
      });
      fetchTrip();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not refresh smart schedule.');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="itin-studio-page">
        <DashboardNavbar />
        <div className="itin-studio-loading">
          <Loading size="lg" />
          <p>Loading itinerary schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="itin-studio-page">
      <DashboardNavbar />

      <div className="itin-studio-ambient" aria-hidden="true">
        <div className="itin-studio-orb itin-studio-orb-1" />
        <div className="itin-studio-orb itin-studio-orb-2" />
      </div>

      <main className="itin-studio-shell">
        <div className="itin-studio-top-nav">
          <Link to={`/trip/${id}`} className="itin-studio-back-link">
            <VscArrowLeft /> Back to {trip?.destination || 'Trip'} Overview
          </Link>
        </div>

        {/* Global Sub-Nav for Trip Deep Views */}
        <TripSubNav />

        {/* Standardized Header */}
        <header className="itin-studio-header">
          <div>
            <div className="itin-studio-eyebrow">
              <span className="itin-studio-live-dot" />
              <span>Operational Timeline</span>
            </div>
            <h1>Day-by-Day Itinerary Studio</h1>
            <p>
              Fine-tune scheduled activities for {trip?.destination || 'your destination'} or let AI auto-reschedule around traffic and weather.
            </p>
          </div>

          <div className="itin-studio-header-actions">
            <Button
              variant="outline"
              icon={VscSparkle}
              loading={rescheduling}
              onClick={handleSmartReschedule}
            >
              Smart Re-Schedule
            </Button>
            <Button
              variant="primary"
              icon={VscAdd}
              onClick={() => setModalOpen(true)}
            >
              + Add Activity
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

        {/* Day Selector Pills */}
        <div className="itin-day-selector" role="tablist">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((dayNum) => (
            <button
              key={dayNum}
              type="button"
              className={`itin-day-btn ${activeDay === dayNum ? 'is-active' : ''}`}
              onClick={() => setActiveDay(dayNum)}
            >
              <span>Day {dayNum}</span>
            </button>
          ))}
        </div>

        {/* Day Content Timeline Card */}
        <div className="itin-day-card">
          <div className="itin-day-header">
            <div>
              <h2>Day {activeDay} Schedule</h2>
              <p className="itin-day-subtitle">{currentDayPlan.title || 'Exploration & Route Activities'}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={VscAdd}
              onClick={() => setModalOpen(true)}
            >
              Add Activity
            </Button>
          </div>

          <div className="itin-activities-timeline">
            {!currentDayPlan.activities || currentDayPlan.activities.length === 0 ? (
              <div className="itin-activities-empty">
                <VscMilestone className="empty-icon" />
                <h4>No activities scheduled for Day {activeDay}</h4>
                <p>Add points of interest, dining stops, or click "Smart Re-Schedule" to generate recommendations.</p>
                <Button variant="primary" icon={VscAdd} onClick={() => setModalOpen(true)}>
                  Add First Activity
                </Button>
              </div>
            ) : (
              currentDayPlan.activities.map((activity, idx) => (
                <div key={idx} className="itin-timeline-item">
                  <div className="itin-timeline-marker">
                    <span>{idx + 1}</span>
                  </div>
                  <div className="itin-timeline-card">
                    <div className="itin-timeline-text">
                      <p>{activity}</p>
                    </div>
                    <button
                      type="button"
                      className="itin-delete-btn"
                      onClick={() => handleDeleteActivity(idx)}
                      aria-label="Remove activity"
                    >
                      <VscTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Activity Modal */}
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={`Add Activity to Day ${activeDay}`}
          >
            <form onSubmit={handleAddActivity} className="itin-modal-form">
              <label htmlFor="itinActivityInput">Activity Description & Location</label>
              <textarea
                id="itinActivityInput"
                rows={3}
                placeholder="e.g. 10:00 AM - Ride the Darjeeling Himalayan Toy Train from Ghoom to Batasia Loop"
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                required
                autoFocus
              />
              <div className="itin-modal-actions">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={savingActivity}>
                  Save to Schedule
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
}
