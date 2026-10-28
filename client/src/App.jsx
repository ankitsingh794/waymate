import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import useLocationTracker from './utils/useLocationTracker';

// ─── Entry routes — eagerly loaded (always needed on first paint) ──────────
import Home from './pages/HomePage/Home';
import Login from './pages/LoginPage/Login';
import Register from './pages/LoginPage/Register';
import VerifyEmail from './pages/LoginPage/VerifyEmail';
import ForgotPassword from './pages/LoginPage/ForgotPassword';
import ResetPassword from './pages/LoginPage/ResetPassword';

// ─── Protected routes — lazy loaded (only download when navigated to) ───────
const Dashboard       = lazy(() => import('./pages/DashboardPage/Dashboard'));
const TripDetails     = lazy(() => import('./pages/TripPage/Details'));
const EditTrip        = lazy(() => import('./pages/TripPage/EditTrip'));
const GroupMessenger  = lazy(() => import('./pages/ChatAssistantPage/GroupMessenger'));
const ExpensesPage    = lazy(() => import('./pages/ExpensesPage/ExpensesPage'));
const AIAssistant     = lazy(() => import('./pages/ChatAssistantPage/AIAssistant'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage/NotificationsPage'));
const HouseholdsPage  = lazy(() => import('./pages/HouseholdsPage/HouseholdsPage'));
const SurveysPage     = lazy(() => import('./pages/SurveysPage/SurveysPage'));
const Profile         = lazy(() => import('./pages/UserProfilePage/Profile'));
const Settings        = lazy(() => import('./pages/SettingsPage/Settings'));
const ExplorePage     = lazy(() => import('./pages/DashboardPage/ExplorePage'));

// ─── Page-level skeleton shown while a lazy route chunk downloads ────────────
function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="page-skeleton__nav" />
      <div className="page-skeleton__body">
        <div className="page-skeleton__block page-skeleton__block--hero" />
        <div className="page-skeleton__block page-skeleton__block--wide" />
        <div className="page-skeleton__block page-skeleton__block--half" />
        <div className="page-skeleton__block page-skeleton__block--half" />
      </div>
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
    </Routes>
  );
}

export default App;
