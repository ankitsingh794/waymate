import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  VscAccount,
  VscArrowRight,
  VscBell,
  VscCalendar,
  VscCheck,
  VscChevronLeft,
  VscChevronRight,
  VscCommentDiscussion,
  VscCompass,
  VscGraph,
  VscHome,
  VscLocation,
  VscRefresh,
  VscRobot,
  VscSearch,
  VscSettingsGear,
  VscWarning,
} from 'react-icons/vsc';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axiosInstance';
import DashboardNavbar from '../../components/DashboardNavbar';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, Loading } from '../../components/UI';
import './Dashboard.css';

const FALLBACK_TRIP_IMAGE =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80';

const QUICK_DISCOVERY = [
  {
    id: 'cafe',
    title: 'Find cafes with workspace vibes',
    query: 'cafes with wifi',
    description: 'Great for relaxed planning stops and remote work sessions.',
  },
  {
    id: 'food',
    title: 'Discover highly rated local food',
    query: 'local restaurants',
    description: 'Taste what locals actually love, not just tourist picks.',
  },
  {
    id: 'culture',
    title: 'Explore culture and landmarks',
    query: 'historical places',
    description: 'Add meaningful heritage and stories to your itinerary.',
  },
];

const CONSENT_LABELS = {
  data_collection: 'Data collection',
  demographic_data: 'Demographic data',
  passive_tracking: 'Passive tracking',
};

function parseTripResponse(response) {
  const directData = response?.data?.data?.data;
  if (Array.isArray(directData)) return directData;

  const nestedData = response?.data?.data?.data?.data;
  if (Array.isArray(nestedData)) return nestedData;

  return [];
}

function splitTripsByLifecycle(trips) {
  const ongoing = [];
  const upcoming = [];
  const completed = [];

  trips.forEach((trip) => {
    const state = inferTripState(trip);

    if (state === 'ongoing') {
      ongoing.push(trip);
      return;
    }

    if (state === 'completed' || state === 'canceled') {
      completed.push(trip);
      return;
    }

    upcoming.push(trip);
  });

  const byAsc = (a, b) => new Date(a?.startDate || 0) - new Date(b?.startDate || 0);
  const byDesc = (a, b) => new Date(b?.startDate || 0) - new Date(a?.startDate || 0);

  return {
    ongoing: [...ongoing].sort(byAsc),
    upcoming: [...upcoming].sort(byAsc),
    completed: [...completed].sort(byDesc),
  };
}

function formatDate(dateValue) {
  if (!dateValue) return 'TBD';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'TBD';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function getDaysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
}

function inferTripState(trip) {
  if (!trip) return 'planned';

  const status = (trip.status || '').toLowerCase();
  if (['ongoing', 'active', 'in_progress'].includes(status)) return 'ongoing';
  if (['completed', 'canceled'].includes(status)) return status;

  const now = new Date();
  const start = trip.startDate ? new Date(trip.startDate) : null;
  const end = trip.endDate ? new Date(trip.endDate) : null;

  if (start && end && start <= now && end >= now) return 'ongoing';
  if (end && end < now) return 'completed';
  return 'planned';
}

function getStatusVariant(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'ongoing') return 'success';
  if (normalized === 'completed') return 'secondary';
  if (normalized === 'canceled') return 'error';
  return 'info';
}

function compactNumber(value) {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value || 0);
}

function TripRail({ title, subtitle, trips }) {
  const railRef = useRef(null);

  const scrollByDirection = useCallback((direction) => {
    if (!railRef.current) return;

    railRef.current.scrollBy({
      left: direction === 'right' ? 320 : -320,
      behavior: 'smooth',
    });
  }, []);

  if (!trips.length) {
    return (
      <Card className="dashboard-empty-card" padding="lg">
        <CardHeader title={title} subtitle={subtitle} />
        <CardBody>
          <p className="dashboard-empty-text">No trips found in this section.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <section className="dashboard-trip-rail">
      <header className="dashboard-rail-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="dashboard-rail-nav">
          <button type="button" onClick={() => scrollByDirection('left')} aria-label="Scroll left">
            <VscChevronLeft />
          </button>
          <button type="button" onClick={() => scrollByDirection('right')} aria-label="Scroll right">
            <VscChevronRight />
          </button>
        </div>
      </header>

      <div className="dashboard-rail-track" ref={railRef}>
        {trips.map((trip) => {
          const state = inferTripState(trip);
          return (
            <article className="dashboard-trip-card" key={trip._id || trip.tripId}>
              <img
                src={trip.coverImage || FALLBACK_TRIP_IMAGE}
                alt={trip.destination || 'Trip destination'}
                loading="lazy"
                decoding="async"
              />

              <div className="dashboard-trip-card-body">
                <div className="dashboard-trip-card-meta">
                  <Badge variant={getStatusVariant(state)} size="sm">
                    {state}
                  </Badge>
                  <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                </div>

                <h4>{trip.destination || 'Untitled trip'}</h4>
                <p>
                  <VscLocation /> {trip.destination || 'Unknown location'}
                </p>
              </div>

              <div className="dashboard-trip-card-footer">
                <Link to={`/trip/${trip._id || trip.tripId}`}>Open details</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, setUpcomingTrips } = useAuth();

  const [ongoingTrips, setOngoingTrips] = useState([]);
  const [upcomingTripsLocal, setUpcomingTripsLocal] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);

  const [profileData, setProfileData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [household, setHousehold] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  const [groupSessions, setGroupSessions] = useState([]);

  const [focusTrip, setFocusTrip] = useState(null);
  const [focusTripExpenseSummary, setFocusTripExpenseSummary] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [places, setPlaces] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState({
    ai: false,
    notifications: false,
    places: false,
  });

  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);

  const hasFetched = useRef(false);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const allTrips = useMemo(
    () => [...ongoingTrips, ...upcomingTripsLocal, ...completedTrips],
    [ongoingTrips, upcomingTripsLocal, completedTrips]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredOngoingTrips = useMemo(
    () => ongoingTrips.filter((trip) => (trip.destination || '').toLowerCase().includes(normalizedSearch)),
    [ongoingTrips, normalizedSearch]
  );

  const filteredUpcomingTrips = useMemo(
    () => upcomingTripsLocal.filter((trip) => (trip.destination || '').toLowerCase().includes(normalizedSearch)),
    [upcomingTripsLocal, normalizedSearch]
  );

  const filteredCompletedTrips = useMemo(
    () => completedTrips.filter((trip) => (trip.destination || '').toLowerCase().includes(normalizedSearch)),
    [completedTrips, normalizedSearch]
  );

  const consentSnapshot = useMemo(() => {
    const source = profileData?.consents || user?.consents || {};

    return Object.entries(CONSENT_LABELS).map(([key, label]) => {
      const status = source?.[key]?.status || 'revoked';
      return {
        key,
        label,
        status,
      };
    });
  }, [profileData, user]);

  const dashboardMetrics = useMemo(() => {
    const householdMembers = household?.members?.length || 0;
    const surveyReady = Boolean(
      surveyData &&
        (surveyData.householdIncome ||
          surveyData.vehicleCount === 0 ||
          Number.isInteger(surveyData.vehicleCount) ||
          surveyData.primaryTransportModeToWork)
    );

    return [
      {
        label: 'Trips in progress',
        value: ongoingTrips.length,
        icon: VscCompass,
      },
      {
        label: 'Upcoming trips',
        value: upcomingTripsLocal.length,
        icon: VscCalendar,
      },
      {
        label: 'Unread alerts',
        value: unreadNotifications,
        icon: VscBell,
      },
      {
        label: 'Group chats',
        value: groupSessions.length,
        icon: VscCommentDiscussion,
      },
      {
        label: 'Household members',
        value: householdMembers,
        icon: VscHome,
      },
      {
        label: 'Survey status',
        value: surveyReady ? 'Done' : 'Pending',
        icon: surveyReady ? VscCheck : VscWarning,
      },
    ];
  }, [ongoingTrips.length, upcomingTripsLocal.length, unreadNotifications, groupSessions.length, household, surveyData]);

  const quickActions = useMemo(
    () => [
      {
        id: 'assistant',
        title: 'AI planner',
        description: 'Generate plans and adjust routes quickly.',
        path: '/assistant',
        icon: VscRobot,
        badge: 'Smart',
      },
      {
        id: 'alerts',
        title: 'Notifications',
        description: unreadNotifications ? `${unreadNotifications} unread updates` : 'All caught up',
        path: '/notifications',
        icon: VscBell,
        badge: unreadNotifications ? `${unreadNotifications > 9 ? '9+' : unreadNotifications}` : '0',
      },
      {
        id: 'household',
        title: 'Household hub',
        description: household?.householdName
          ? `${household.householdName} (${household.members?.length || 0} members)`
          : 'Create and manage your group',
        path: '/households',
        icon: VscHome,
        badge: household ? 'Live' : 'Setup',
      },
      {
        id: 'survey',
        title: 'Survey + settings',
        description: surveyData ? 'Data submitted and available' : 'Complete your socio-economic form',
        path: '/surveys',
        icon: VscGraph,
        badge: surveyData ? 'Done' : 'Pending',
      },
    ],
    [household, surveyData, unreadNotifications]
  );

  const fetchDashboardData = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const requests = {
          profile: api.get('/users/profile'),
          trips: api.get('/trips?limit=100&page=1'),
          notifications: api.get('/notifications?limit=6'),
          household: api.get('/households/my-household'),
          survey: api.get('/surveys/my-data'),
          groups: api.get('/chat/sessions/group'),
        };

        const requestKeys = Object.keys(requests);
        const settled = await Promise.allSettled(Object.values(requests));
        const resultMap = {};

        settled.forEach((result, index) => {
          resultMap[requestKeys[index]] = result;
        });

        const failedSections = [];
        const pickValue = (key, parser, fallback) => {
          const item = resultMap[key];
          if (item?.status === 'fulfilled') {
            return parser(item.value);
          }

          failedSections.push(key);
          return fallback;
        };

        const parsedProfile = pickValue('profile', (response) => response?.data?.data || null, null);
        const parsedTrips = pickValue('trips', parseTripResponse, []);
        const parsedNotifications = pickValue(
          'notifications',
          (response) => response?.data?.data?.notifications || [],
          []
        );
        const parsedHousehold = pickValue('household', (response) => response?.data?.data?.household || null, null);
        const parsedSurvey = pickValue('survey', (response) => response?.data?.data?.data || null, null);
        const parsedGroupSessions = pickValue(
          'groups',
          (response) => response?.data?.data?.sessions || [],
          []
        );

        const categorizedTrips = splitTripsByLifecycle(parsedTrips);
        const parsedOngoing = categorizedTrips.ongoing.slice(0, 12);
        const parsedUpcoming = categorizedTrips.upcoming.slice(0, 12);
        const parsedCompleted = categorizedTrips.completed.slice(0, 12);

        setProfileData(parsedProfile);
        setOngoingTrips(parsedOngoing);
        setUpcomingTripsLocal(parsedUpcoming);
        setCompletedTrips(parsedCompleted);
        setUpcomingTrips(parsedUpcoming);

        setNotifications(parsedNotifications);
        setHousehold(parsedHousehold);
        setSurveyData(parsedSurvey);
        setGroupSessions(parsedGroupSessions);

        const selectedFocusTrip = parsedOngoing[0] || parsedUpcoming[0] || parsedCompleted[0] || null;
        const selectedFocusTripId = selectedFocusTrip?._id || selectedFocusTrip?.tripId;
        setFocusTrip(selectedFocusTrip);

        if (selectedFocusTripId) {
          try {
            const expenseRes = await api.get(`/trips/${selectedFocusTripId}/expenses?limit=1`);
            setFocusTripExpenseSummary(expenseRes?.data?.data?.summary || null);
          } catch {
            setFocusTripExpenseSummary(null);
          }
        } else {
          setFocusTripExpenseSummary(null);
        }

        if (failedSections.length === requestKeys.length) {
          throw new Error('All dashboard sections failed to load.');
        }

        if (failedSections.length) {
          setBanner({
            type: 'warning',
            text: `Some sections could not refresh: ${failedSections.join(', ')}.`,
          });
        } else {
          setBanner((previous) => (previous?.type === 'warning' ? null : previous));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load dashboard data right now. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setUpcomingTrips]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);

  const handleLaunchAssistant = async () => {
    try {
      setActionBusy((prev) => ({ ...prev, ai: true }));
      await api.post('/chat/sessions/ai');
      navigate('/assistant');
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.message || 'Failed to open AI assistant.' });
    } finally {
      setActionBusy((prev) => ({ ...prev, ai: false }));
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!unreadNotifications) return;

    try {
      setActionBusy((prev) => ({ ...prev, notifications: true }));
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setBanner({ type: 'success', text: 'All notifications were marked as read.' });
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.message || 'Could not mark notifications as read.' });
    } finally {
      setActionBusy((prev) => ({ ...prev, notifications: false }));
    }
  };

  const runPlaceSearch = async (queryInput) => {
    const query = queryInput.trim();
    if (!query) return;

    try {
      setActionBusy((prev) => ({ ...prev, places: true }));
      const params = new URLSearchParams({ query });
      if (profileData?.location?.city) {
        params.set('location', profileData.location.city);
      }

      const placesRes = await api.get(`/find-places?${params.toString()}`);
      const results = Array.isArray(placesRes?.data?.data) ? placesRes.data.data : [];
      setPlaces(results.slice(0, 4));
      if (!results.length) {
        setBanner({ type: 'warning', text: 'No places found for that query. Try another search term.' });
      }
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.message || 'Failed to fetch places.' });
    } finally {
      setActionBusy((prev) => ({ ...prev, places: false }));
    }
  };

  const handleQuickDiscovery = (query) => {
    setPlaceQuery(query);
    runPlaceSearch(query);
  };

  const focusTripId = focusTrip?._id || focusTrip?.tripId;

  if (loading) {
    return (
      <div className="dashboard-loading-screen">
        <Loading size="lg" />
        <p>Preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardNavbar />

      <div className="dashboard-shell">
        <header className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-eyebrow">Control Center</span>
            <h1>Welcome back, {user?.name || 'Traveler'}.</h1>
            <p>
              Track trip progress, monitor alerts, use AI planning, and act quickly with live data from all key
              backend services.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <Button
              variant="primary"
              icon={VscRobot}
              onClick={handleLaunchAssistant}
              loading={actionBusy.ai}
            >
              Open AI assistant
            </Button>
            <Button
              variant="outline"
              icon={VscRefresh}
              onClick={() => fetchDashboardData({ isRefresh: true })}
              loading={refreshing}
            >
              Refresh data
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

        <section className="dashboard-kpi-grid">
          {dashboardMetrics.map((metric) => (
            <Card key={metric.label} className="dashboard-kpi-card" padding="md">
              <CardBody className="dashboard-kpi-body">
                <span className="dashboard-kpi-icon">
                  <metric.icon />
                </span>
                <div>
                  <h3>{typeof metric.value === 'number' ? compactNumber(metric.value) : metric.value}</h3>
                  <p>{metric.label}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </section>

        <section className="dashboard-quick-actions-grid">
          {quickActions.map((action) => (
            <Link key={action.id} to={action.path} className="dashboard-quick-action-card">
              <span className="dashboard-quick-action-icon">
                <action.icon />
              </span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
              <span className="dashboard-quick-action-badge">{action.badge}</span>
            </Link>
          ))}
        </section>

        <div className="dashboard-layout-grid">
          <main className="dashboard-main-column">
            <Card className="dashboard-focus-card" padding="lg">
              <CardHeader
                title="Priority trip"
                subtitle={focusTrip ? 'Most relevant trip based on current timeline.' : 'Create a trip to unlock operational insights.'}
              />
              <CardBody>
                {!focusTrip ? (
                  <div className="dashboard-empty-state">
                    <p>You do not have active trips yet. Start with the AI assistant and create one in seconds.</p>
                    <Button variant="secondary" icon={VscArrowRight} onClick={handleLaunchAssistant}>
                      Plan first trip
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="dashboard-focus-grid">
                      <div>
                        <div className="dashboard-focus-meta">
                          <Badge variant={getStatusVariant(inferTripState(focusTrip))}>
                            {inferTripState(focusTrip)}
                          </Badge>
                          <span>{formatDateRange(focusTrip.startDate, focusTrip.endDate)}</span>
                        </div>

                        <h2>{focusTrip.destination || 'Untitled trip'}</h2>

                        <p className="dashboard-focus-copy">
                          {getDaysUntil(focusTrip.startDate) > 0
                            ? `${getDaysUntil(focusTrip.startDate)} day(s) left to kickoff.`
                            : inferTripState(focusTrip) === 'ongoing'
                              ? 'Trip is currently running. Keep plans and spend in sync.'
                              : 'Trip timeline is complete. Review and reuse insights for the next plan.'}
                        </p>

                        <div className="dashboard-focus-actions">
                          <Link to={`/trip/${focusTripId}`} className="dashboard-inline-link">
                            View trip details <VscArrowRight />
                          </Link>
                          <Link to={`/trip/${focusTripId}/edit`} className="dashboard-inline-link">
                            Edit trip
                          </Link>
                          <Link to={`/trip/${focusTripId}/expenses`} className="dashboard-inline-link">
                            Open expenses
                          </Link>
                        </div>
                      </div>

                      <div className="dashboard-focus-stats">
                        <article>
                          <strong>{focusTrip.travelers || 1}</strong>
                          <span>Travelers</span>
                        </article>
                        <article>
                          <strong>{focusTripExpenseSummary?.totalSpent ? compactNumber(focusTripExpenseSummary.totalSpent) : '0'}</strong>
                          <span>Spent so far</span>
                        </article>
                        <article>
                          <strong>{focusTripExpenseSummary?.settlements?.length || 0}</strong>
                          <span>Settlements</span>
                        </article>
                      </div>
                    </div>

                    {!!focusTrip.coverImage && (
                      <img
                        className="dashboard-focus-cover"
                        src={focusTrip.coverImage}
                        alt={focusTrip.destination || 'Trip destination'}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </>
                )}
              </CardBody>
            </Card>

            <Card padding="md" className="dashboard-search-card">
              <CardBody>
                <label htmlFor="dashboardTripSearch">Search trip destinations</label>
                <div className="dashboard-search-row">
                  <VscSearch />
                  <input
                    id="dashboardTripSearch"
                    type="search"
                    placeholder="Filter by destination"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </CardBody>
            </Card>

            <TripRail
              title="Ongoing adventures"
              subtitle="Trips currently in motion"
              trips={filteredOngoingTrips}
            />

            <TripRail
              title="Upcoming trips"
              subtitle="Trips you should prepare for next"
              trips={filteredUpcomingTrips}
            />

            <TripRail
              title="Completed trips"
              subtitle="Past journeys and reusable inspiration"
              trips={filteredCompletedTrips}
            />

            <Card className="dashboard-places-card" padding="lg">
              <CardHeader
                title="Quick place discovery"
                subtitle="Uses the find-places backend endpoint for location-based suggestions."
              />
              <CardBody>
                <div className="dashboard-place-search-bar">
                  <input
                    type="search"
                    placeholder="Try: cafes, museums, street food..."
                    value={placeQuery}
                    onChange={(event) => setPlaceQuery(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    icon={VscSearch}
                    loading={actionBusy.places}
                    onClick={() => runPlaceSearch(placeQuery)}
                  >
                    Search
                  </Button>
                </div>

                <div className="dashboard-discovery-tags">
                  {QUICK_DISCOVERY.map((item) => (
                    <button key={item.id} type="button" onClick={() => handleQuickDiscovery(item.query)}>
                      {item.title}
                    </button>
                  ))}
                </div>

                {!!places.length && (
                  <ul className="dashboard-places-list">
                    {places.map((place, index) => (
                      <li key={`${place.name}-${index}`}>
                        <h4>{place.name || 'Unknown place'}</h4>
                        <p>{place.address || place.vicinity || 'Address not available'}</p>
                        <div>
                          <span>Rating: {place.rating || 'N/A'}</span>
                          {place.link && (
                            <a href={place.link} target="_blank" rel="noreferrer">
                              Open map
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </main>

          <aside className="dashboard-side-column">
            <Card className="dashboard-side-card" padding="lg">
              <CardHeader
                title="Notifications"
                subtitle={`Unread: ${unreadNotifications}`}
              />
              <CardBody>
                {notifications.length ? (
                  <ul className="dashboard-notification-list">
                    {notifications.map((notification) => (
                      <li key={notification._id}>
                        <div>
                          <p>{notification.message}</p>
                          <small>{formatDate(notification.createdAt)}</small>
                        </div>
                        {!notification.read && <Badge size="sm" variant="warning">New</Badge>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashboard-empty-text">No notifications yet.</p>
                )}
              </CardBody>
              <CardFooter>
                <Button
                  variant="outline"
                  icon={VscBell}
                  loading={actionBusy.notifications}
                  onClick={handleMarkNotificationsRead}
                  disabled={!unreadNotifications}
                >
                  Mark all as read
                </Button>
                <Link to="/notifications" className="dashboard-inline-link">
                  Open center
                </Link>
              </CardFooter>
            </Card>

            <Card className="dashboard-side-card" padding="lg">
              <CardHeader title="Household + Survey" subtitle="Household and socio-economic readiness" />
              <CardBody>
                <ul className="dashboard-snapshot-list">
                  <li>
                    <span>Household</span>
                    <strong>{household?.householdName || 'Not joined'}</strong>
                  </li>
                  <li>
                    <span>Members</span>
                    <strong>{household?.members?.length || 0}</strong>
                  </li>
                  <li>
                    <span>Survey</span>
                    <strong>{surveyData ? 'Submitted' : 'Pending'}</strong>
                  </li>
                </ul>
              </CardBody>
              <CardFooter>
                <Link to="/households" className="dashboard-inline-link">Manage household</Link>
                <Link to="/surveys" className="dashboard-inline-link">Open survey</Link>
              </CardFooter>
            </Card>

            <Card className="dashboard-side-card" padding="lg">
              <CardHeader title="Conversation hub" subtitle={`${groupSessions.length} active group chat(s)`} />
              <CardBody>
                {groupSessions.length ? (
                  <ul className="dashboard-session-list">
                    {groupSessions.slice(0, 4).map((session) => (
                      <li key={session._id}>
                        <div>
                          <h4>{session.tripId?.destination || session.name || 'Trip chat'}</h4>
                          <p>{session.lastMessage?.text || 'No recent messages yet.'}</p>
                        </div>
                        {session.tripId?._id ? (
                          <Link to={`/trip/${session.tripId._id}`}>Open trip</Link>
                        ) : (
                          <span className="dashboard-muted-link">Trip unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashboard-empty-text">No group chat sessions yet.</p>
                )}
              </CardBody>
              <CardFooter>
                <Button variant="secondary" icon={VscRobot} onClick={handleLaunchAssistant} loading={actionBusy.ai}>
                  Open assistant
                </Button>
              </CardFooter>
            </Card>

            <Card className="dashboard-side-card" padding="lg">
              <CardHeader title="Account health" subtitle="Profile and privacy controls" />
              <CardBody>
                <ul className="dashboard-profile-meta">
                  <li>
                    <VscAccount />
                    <span>{profileData?.name || user?.name || 'User'}</span>
                  </li>
                  <li>
                    <VscLocation />
                    <span>
                      {profileData?.location?.city
                        ? `${profileData.location.city}${profileData.location.country ? `, ${profileData.location.country}` : ''}`
                        : 'Location not set'}
                    </span>
                  </li>
                  <li>
                    <VscGraph />
                    <span>{allTrips.length} total trip(s)</span>
                  </li>
                </ul>

                <div className="dashboard-consent-grid">
                  {consentSnapshot.map((consent) => (
                    <article key={consent.key}>
                      <span>{consent.label}</span>
                      <Badge variant={consent.status === 'granted' ? 'success' : 'gray'} size="sm">
                        {consent.status}
                      </Badge>
                    </article>
                  ))}
                </div>
              </CardBody>
              <CardFooter>
                <Link to="/profile" className="dashboard-inline-link">
                  <VscAccount /> Profile
                </Link>
                <Link to="/settings" className="dashboard-inline-link">
                  <VscSettingsGear /> Settings
                </Link>
              </CardFooter>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
