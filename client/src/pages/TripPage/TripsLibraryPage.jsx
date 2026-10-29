import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  VscArrowLeft,
  VscArrowRight,
  VscCalendar,
  VscCompass,
  VscHeart,
  VscLocation,
  VscAdd,
  VscRefresh,
  VscSearch,
} from 'react-icons/vsc';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Loading } from '../../components/UI';
import api from '../../utils/axiosInstance';
import './TripsLibraryPage.css';

const FALLBACK_TRIP_IMAGE =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Journeys' },
  { id: 'planned', label: 'Planned' },
  { id: 'ongoing', label: 'In Motion' },
  { id: 'completed', label: 'Completed' },
  { id: 'canceled', label: 'Canceled' },
];

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Timeline TBD';
  const start = new Date(startDate).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${start} - ${end}`;
}

export default function TripsLibraryPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);

  const fetchTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (activeStatus !== 'all') {
        params.set('status', activeStatus);
      }
      if (searchQuery.trim()) {
        params.set('destination', searchQuery.trim());
      }

      const res = await api.get(`/trips?${params.toString()}`);
      const data = res?.data?.data?.data || res?.data?.data || [];
      const list = Array.isArray(data) ? data : data.data || [];
      setTrips(list);
      setTotalPages(res?.data?.data?.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load your trips archive.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, activeStatus, searchQuery]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleToggleFavorite = async (e, tripId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setFavoriteLoadingId(tripId);
      await api.patch(`/trips/${tripId}/favorite`);
      setTrips((prev) =>
        prev.map((t) =>
          (t._id || t.tripId) === tripId ? { ...t, isFavorite: !t.isFavorite } : t
        )
      );
    } catch (err) {
      // silent or handled gracefully
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  return (
    <div className="trips-lib-page">
      <DashboardNavbar />

      <div className="trips-lib-ambient" aria-hidden="true">
        <div className="trips-lib-orb trips-lib-orb-1" />
        <div className="trips-lib-orb trips-lib-orb-2" />
      </div>

      <main className="trips-lib-shell">
        {/* Top Header: Ergonomic Universal Header Pattern */}
        <header className="trips-lib-header">
          <div>
            <Link to="/dashboard" className="trips-lib-back-link">
              <VscArrowLeft /> Back to Command Center
            </Link>
            <div className="trips-lib-eyebrow">
              <span className="trips-lib-live-dot" />
              <span>Expedition Archive</span>
            </div>
            <h1>All Journeys & Routes</h1>
            <p>Browse, filter, and orchestrate all active, planned, and archived travel itineraries.</p>
          </div>

          <div className="trips-lib-header-actions">
            <Button
              variant="outline"
              icon={VscRefresh}
              onClick={() => fetchTrips(true)}
              loading={refreshing}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={VscAdd}
              onClick={() => navigate('/trips/new')}
            >
              Create New Trip
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="error" closable onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Sub-Header: Search on Left, Filter segmented pill control on Right */}
        <section className="trips-lib-controls">
          <div className="trips-lib-search">
            <VscSearch className="trips-lib-search-icon" />
            <input
              type="search"
              placeholder="Filter by destination or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="trips-lib-filters" role="tablist">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`trips-lib-filter-btn ${activeStatus === filter.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveStatus(filter.id);
                  setPage(1);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {/* Grid or Empty State */}
        {loading ? (
          <div className="trips-lib-loading">
            <Loading size="lg" />
            <p>Accessing expedition records...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="trips-lib-empty">
            <div className="trips-lib-empty-icon">
              <VscCompass />
            </div>
            <h3>No Journeys Found</h3>
            <p>
              {searchQuery || activeStatus !== 'all'
                ? 'No trips match your current filter criteria. Try resetting your search or status.'
                : 'You have not created any expeditions yet. Launch the wizard or plan with AI in seconds.'}
            </p>
            <Button
              variant="primary"
              icon={VscAdd}
              onClick={() => navigate('/trips/new')}
            >
              Plan Your First Trip
            </Button>
          </div>
        ) : (
          <>
            <div className="trips-lib-grid">
              {trips.map((trip) => {
                const tripId = trip._id || trip.tripId;
                const status = (trip.status || 'planned').toLowerCase();
                return (
                  <article key={tripId} className="trips-lib-card">
                    <div className="trips-lib-card-media">
                      <img
                        src={trip.coverImage || FALLBACK_TRIP_IMAGE}
                        alt={trip.destination || 'Trip cover'}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="trips-lib-card-scrim" />
                      <div className="trips-lib-card-top-bar">
                        <Badge
                          variant={
                            status === 'ongoing' || status === 'active'
                              ? 'success'
                              : status === 'completed'
                                ? 'secondary'
                                : status === 'canceled'
                                  ? 'error'
                                  : 'info'
                          }
                          size="sm"
                        >
                          {status}
                        </Badge>
                        <button
                          type="button"
                          className={`trips-lib-fav-btn ${trip.isFavorite ? 'is-fav' : ''}`}
                          onClick={(e) => handleToggleFavorite(e, tripId)}
                          aria-label="Toggle favorite"
                        >
                          <VscHeart />
                        </button>
                      </div>
                    </div>

                    <div className="trips-lib-card-content">
                      <div className="trips-lib-card-meta">
                        <span>
                          <VscCalendar /> {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                        <span>{trip.travelers || 1} Traveler(s)</span>
                      </div>

                      <h3>{trip.destination || 'Untitled Journey'}</h3>
                      <p>
                        <VscLocation /> {trip.origin?.city ? `${trip.origin.city} → ` : ''}
                        {trip.destination || 'Destination'}
                      </p>

                      <div className="trips-lib-card-footer">
                        <Link to={`/trip/${tripId}`} className="trips-lib-card-link">
                          <span>Open Itinerary Studio</span>
                          <VscArrowRight />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="trips-lib-pagination">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
