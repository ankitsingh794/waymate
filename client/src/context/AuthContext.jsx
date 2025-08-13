

// src/context/AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance';
import { getSocket } from '../utils/socketManager';

const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]); 
  const navigate = useNavigate();
  const tokenRefreshIntervalRef = useRef(null);

  // --- DETAILED DEBUGGING FUNCTIONS ---

  const connectSocket = useCallback((token) => {
    console.log('--- [SOCKET CONNECTION START] ---');
    if (!token) {
      console.error('[FAIL] connectSocket called without a token.');
      return;
    }
    console.log('[1/4] connectSocket called.');

    const socket = getSocket();
    if (socket) {
      console.log('[2/4] Socket instance retrieved.');
      if (socket.connected) {
        console.log('[INFO] Socket already connected. Disconnecting first for a clean reconnect.');
        socket.disconnect();
      }
      
      console.log(`[3/4] Setting socket auth with token: ${token.substring(0, 20)}...`);
      socket.auth = { token };
      
      console.log('[4/4] Calling socket.connect()...');
      socket.connect();
    } else {
        console.error('[FAIL] Could not retrieve socket instance from socketManager.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    console.log('--- [LOGOUT PROCESS START] ---');
    // ... (logout logic remains the same)
  }, [navigate]);

  const scheduleTokenRefresh = useCallback(() => {
    // ... (scheduleTokenRefresh logic remains the same)
  }, [connectSocket, handleLogout]);

  const login = useCallback(async (userData, accessToken) => {
    console.log('--- [LOGIN PROCESS START] ---');
    console.log('[1/2] login function called with user data and token.');
    setUser(userData);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    console.log('[2/2] Handing off to connectSocket...');
    connectSocket(accessToken);
    
    scheduleTokenRefresh();
    navigate('/dashboard');
  }, [navigate, connectSocket, scheduleTokenRefresh]);

  // Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      console.log('--- [SESSION RESTORE START] ---');
      try {
        const res = await api.post('/auth/refresh-token');
        const { accessToken, user: restoredUser } = res.data.data;
        console.log('[SUCCESS] Session restored. Got new token.');
        setUser(restoredUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        console.log('[INFO] Handing off to connectSocket...');
        connectSocket(accessToken);
        
        scheduleTokenRefresh();
      } catch (err) {
        console.log('[INFO] No valid session found on initial load.');
        setUser(null);
      } finally {
        console.log('--- [SESSION RESTORE FINISHED] ---');
        setLoading(false);
      }
    };
    restoreSession();
  }, [connectSocket, scheduleTokenRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(tokenRefreshIntervalRef.current);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout: handleLogout,
    upcomingTrips,
    setUpcomingTrips,
  }), [user, loading, login, handleLogout, upcomingTrips]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};