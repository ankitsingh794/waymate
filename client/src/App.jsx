import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import useLocationTracker from './utils/useLocationTracker';
import { Loading } from './components/UI';

// ─── Entry routes — eagerly loaded (always needed on first paint) ──────────
import Home from './pages/HomePage/Home';
import Login from './pages/LoginPage/Login';
import Register from './pages/LoginPage/Register';
import VerifyEmail from './pages/LoginPage/VerifyEmail';
import ForgotPassword from './pages/LoginPage/ForgotPassword';
import ResetPassword from './pages/LoginPage/ResetPassword';

// ─── Protected routes — lazy loaded (only download when navigated to) ───────
const Dashboard       = lazy(() => import('./pages/DashboardPage/Dashboard'));
const TripsLibraryPage = lazy(() => import('./pages/TripPage/TripsLibraryPage'));
const TripCreateWizard = lazy(() => import('./pages/TripPage/TripCreateWizard'));
const TripDetails     = lazy(() => import('./pages/TripPage/Details'));
const TripItineraryStudio = lazy(() => import('./pages/TripPage/TripItineraryStudio'));
const TripTransitSchedule = lazy(() => import('./pages/TripPage/TripTransitSchedule'));
const TripPlacesRecommendations = lazy(() => import('./pages/TripPage/TripPlacesRecommendations'));
const TripMembersManage = lazy(() => import('./pages/TripPage/TripMembersManage'));
const EditTrip        = lazy(() => import('./pages/TripPage/EditTrip'));
const GroupMessenger  = lazy(() => import('./pages/ChatAssistantPage/GroupMessenger'));
const MessagesInbox   = lazy(() => import('./pages/ChatAssistantPage/MessagesInbox'));
const ExpensesPage    = lazy(() => import('./pages/ExpensesPage/ExpensesPage'));
const AIAssistant     = lazy(() => import('./pages/ChatAssistantPage/AIAssistant'));
const TrackingCockpit = lazy(() => import('./pages/TrackingPage/TrackingCockpit'));
const ModeConfirmationStudio = lazy(() => import('./pages/TrackingPage/ModeConfirmationStudio'));
const ResearcherPortal = lazy(() => import('./pages/AnalyticsPage/ResearcherPortal'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage/NotificationsPage'));
const HouseholdsPage  = lazy(() => import('./pages/HouseholdsPage/HouseholdsPage'));
const SurveysPage     = lazy(() => import('./pages/SurveysPage/SurveysPage'));
const Profile         = lazy(() => import('./pages/UserProfilePage/Profile'));
const Settings        = lazy(() => import('./pages/SettingsPage/Settings'));
const ExplorePage     = lazy(() => import('./pages/DashboardPage/ExplorePage'));
const InviteLandingPage = lazy(() => import('./pages/InvitePage/InviteLandingPage'));

// ─── Page-level skeleton shown while a lazy route chunk downloads ────────────
function PageSkeleton() {
  return (
    <div
      style={{
        minHeight: '75vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
      }}
      aria-busy="true"
      aria-label="Loading page"
    >
      <Loading
        size="lg"
        label="WayMate Atelier"
        sublabel="Curating journey view and route intelligence..."
      />
    </div>
  );
}

function App() {
  useLocationTracker();
  return (
    <Routes>
      {/* Public routes — no lazy needed, these ARE the entry points */}
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Protected routes — each wrapped in its own Suspense so the
          fallback is scoped to the content area, not the entire viewport */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripsLibraryPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trips/new"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripCreateWizard />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripDetails />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/itinerary"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripItineraryStudio />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/transit"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripTransitSchedule />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/places"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripPlacesRecommendations />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/members"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TripMembersManage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/edit"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <EditTrip />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/chat"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <GroupMessenger />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id/expenses"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ExpensesPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:tripId/expenses"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ExpensesPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ExpensesPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <AIAssistant />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <NotificationsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/households"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <HouseholdsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/surveys"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <SurveysPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ExplorePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <MessagesInbox />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <TrackingCockpit />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking/history"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ModeConfirmationStudio />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <ResearcherPortal />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite/:type/:token"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <InviteLandingPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/invite/:type/:token"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSkeleton />}>
              <InviteLandingPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
