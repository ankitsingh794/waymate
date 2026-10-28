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
import api, { refreshClient } from '../utils/axiosInstance';
import { getSocket, disconnectSocket, setTokenRefreshCallback, reconnectSocket } from '../utils/socketManager';

const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]); 
  const navigate = useNavigate();
  const tokenRefreshIntervalRef = useRef(null);

  const connectSocket = useCallback((token) => {
    if (!token) return;
    try {
      const socket = getSocket();
      if (socket) {
        if (socket.connected) {
          socket.disconnect();
        }
        socket.auth = { token };
        socket.connect();
      }
    } catch (err) {
      console.warn('[Socket Auth] Connection deferred:', err?.message);
    }
  }, []);

  /**
   * Clears all session data, logs out from the backend, and redirects to the login page.
   */
  const handleLogout = useCallback(async () => {
    clearInterval(tokenRefreshIntervalRef.current);

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn("Logout API call failed, proceeding with client cleanup:", error?.message);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      disconnectSocket();
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  /**
   * Refreshes the access token and reconnects the socket.
   * Uses unintercepted refreshClient to guarantee no interceptor recursion.
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      const { data } = await refreshClient.post('/auth/refresh-token');
      const newAccessToken = data?.data?.accessToken;
      
      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      localStorage.setItem('accessToken', newAccessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      reconnectSocket(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.warn("Socket token refresh failed:", error?.message);
      handleLogout();
      throw error;
    }
  }, [handleLogout]);

  /**
   * Schedules a periodic refresh of the access token before it expires (every 14 minutes).
   */
  const scheduleTokenRefresh = useCallback(() => {
    clearInterval(tokenRefreshIntervalRef.current);

    const REFRESH_INTERVAL = 14 * 60 * 1000;

    const refreshToken = async () => {
      // If token was removed, stop interval
      if (!localStorage.getItem('accessToken')) {
        clearInterval(tokenRefreshIntervalRef.current);
        return;
      }

      try {
        const { data } = await refreshClient.post('/auth/refresh-token');
        const newAccessToken = data?.data?.accessToken;
        
        if (!newAccessToken) {
          throw new Error('Missing access token');
        }

        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        connectSocket(newAccessToken);
      } catch (error) {
        console.warn("Periodic token refresh failed:", error?.message);
        handleLogout();
      }
    };

    tokenRefreshIntervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL);
  }, [connectSocket, handleLogout]);

  // Hook socket manager into token refresh
  useEffect(() => {
    setTokenRefreshCallback(handleTokenRefresh);
  }, [handleTokenRefresh]);

  // Listen for session expiration events dispatched by axiosInstance
  useEffect(() => {
    const handleSessionExpired = () => {
      clearInterval(tokenRefreshIntervalRef.current);
      setUser(null);
      disconnectSocket();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Multi-tab synchronization: sync logout and login events across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          // Token removed in another tab -> sync logout immediately
          clearInterval(tokenRefreshIntervalRef.current);
          setUser(null);
          disconnectSocket();
          delete api.defaults.headers.common['Authorization'];
          navigate('/login', { replace: true });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  /**
   * Logs in the user, sets state, and navigates seamlessly.
   */
  const login = useCallback(async (userData, accessToken, redirectTo = '/dashboard') => {
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    connectSocket(accessToken);
    scheduleTokenRefresh();

    navigate(redirectTo, { replace: true });
  }, [navigate, connectSocket, scheduleTokenRefresh]);

  /**
   * Restores session on initial app mount:
   * Only calls refresh-token if a prior session token exists in localStorage.
   * If user is unauthenticated or a guest, finishes loading immediately without spamming network requests.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await refreshClient.post('/auth/refresh-token');
        const { accessToken, user: restoredUser } = res.data.data;
        
        setUser(restoredUser);
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        connectSocket(accessToken);
        scheduleTokenRefresh();
      } catch {
        // Stale or invalid session - silently clean up
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
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
