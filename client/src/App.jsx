import { Routes, Route } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/HomePage/Home';
import VerifyEmail from './pages/LoginPage/VerifyEmail';
import ForgotPassword from './pages/LoginPage/ForgotPassword';
import Register from './pages/LoginPage/Register';
import Login from './pages/LoginPage/Login';
import TripDetails from './pages/TripPage/Details';
import Profile from './pages/UserProfilePage/Profile';
import AIAssistant from './pages/ChatAssistantPage/AIAssistant';
import Dashboard from './pages/DashboardPage/Dashboard';
import Settings from './pages/SettingsPage/Settings';
import EditTrip from './pages/TripPage/EditTrip';
import ExplorePage from './pages/DashboardPage/ExplorePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/trip/:id" element={<ProtectedRoute><TripDetails /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/trip/:id/edit" element={<ProtectedRoute><EditTrip /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
