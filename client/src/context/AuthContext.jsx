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
import { getSocket, disconnectSocket, setTokenRefreshCallback, reconnectSocket } from '../utils/socketManager';

const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]); 
  const navigate = useNavigate();
  const tokenRefreshIntervalRef = useRef(null);

  const connectSocket = useCallback((token) => {
    if (!token) {
      console.error('[Socket Auth] Attempted to connect without a token.');
      return;
    }
    const socket = getSocket();
    if (socket) {
      if (socket.connected) {
        socket.disconnect();
      }
      socket.auth = { token };
      socket.connect();
    } else {
        console.error('[Socket Auth] Could not retrieve socket instance.');
    }
  }, []);

  /**
   * Clears all session data, logs out from the backend, and redirects to the login page.
   */
  const handleLogout = useCallback(async () => {
    console.log("Initiating logout...");
    clearInterval(tokenRefreshIntervalRef.current);

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Logout API call failed, proceeding with client-side cleanup:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      api.defaults.headers.common['Authorization'] = null;
      disconnectSocket();
      navigate('/login');
    }
  }, [navigate]);

  /**
   * Refreshes the access token and reconnects the socket
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      console.log("Attempting to refresh access token for socket authentication...");
      const { data } = await api.post('/auth/refresh-token');
      const newAccessToken = data.data.accessToken;
      
      localStorage.setItem('accessToken', newAccessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      // Reconnect socket with new token
      reconnectSocket(newAccessToken);
      console.log("Token refreshed and socket reconnected successfully.");
      
      return newAccessToken;
    } catch (error) {
      console.error("Could not refresh token for socket authentication. Session is invalid.", error);
      handleLogout();
      throw error;
    }
  }, [handleLogout]);

  /**
   * Schedules a periodic refresh of the access token before it expires.
   */
  const scheduleTokenRefresh = useCallback(() => {
    clearInterval(tokenRefreshIntervalRef.current);

    const REFRESH_INTERVAL = 14 * 60 * 1000;

    const refreshToken = async () => {
      try {
        console.log("Attempting to refresh access token...");
        const { data } = await api.post('/auth/refresh-token');
        const newAccessToken = data.data.accessToken;
        
        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        connectSocket(newAccessToken);
        console.log("Token refreshed successfully.");
      } catch (error) {
        console.error("Could not refresh token. Session is invalid.", error);
        handleLogout();
      }
    };

    tokenRefreshIntervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL);
  }, [connectSocket, handleLogout]);

  // Set up socket token refresh callback
  useEffect(() => {
    setTokenRefreshCallback(handleTokenRefresh);
  }, [handleTokenRefresh]);

  /**
   * Logs in the user, sets state, and initializes the session.
   */
  const login = useCallback(async (userData, accessToken) => {
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    connectSocket(accessToken);
    scheduleTokenRefresh();

    navigate('/dashboard');
  }, [navigate, connectSocket, scheduleTokenRefresh]);
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/refresh-token');
        const { accessToken, user: restoredUser } = res.data.data;
        
        setUser(restoredUser);
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        connectSocket(accessToken);
        scheduleTokenRefresh();
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, [connectSocket, scheduleTokenRefresh]);

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
