import {  Routes, Route } from 'react-router-dom';
import './App.css';

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

function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/trip/:id/edit" element={<EditTrip />} />
      </Routes>
  );
}

export default App;
