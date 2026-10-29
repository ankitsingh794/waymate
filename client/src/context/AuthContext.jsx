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
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
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
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken: refreshToken || undefined });
    } catch (error) {
      console.warn("Logout API call failed, proceeding with client cleanup:", error?.message);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      disconnectSocket();
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  /**
   * Refreshes the access token and reconnects the socket.
   * Uses unintercepted refreshClient with explicit fallback body for cross-site cookie blocking.
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const { data } = await refreshClient.post('/auth/refresh-token', {
        refreshToken: storedRefreshToken || undefined,
      });
      const newAccessToken = data?.data?.accessToken;
      const newRefreshToken = data?.data?.refreshToken;
      
      if (!newAccessToken) {
        throw new Error('Refresh response missing access token');
      }

      localStorage.setItem('accessToken', newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
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
      // If no token exists, stop interval
      if (!localStorage.getItem('accessToken') && !localStorage.getItem('refreshToken')) {
        clearInterval(tokenRefreshIntervalRef.current);
        return;
      }

      try {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const { data } = await refreshClient.post('/auth/refresh-token', {
          refreshToken: storedRefreshToken || undefined,
        });
        const newAccessToken = data?.data?.accessToken;
        const newRefreshToken = data?.data?.refreshToken;
        
        if (!newAccessToken) {
          throw new Error('Missing access token');
        }

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      disconnectSocket();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Multi-tab synchronization: sync logout and login events across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken') {
        if (!localStorage.getItem('accessToken') && !localStorage.getItem('refreshToken')) {
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
  const login = useCallback(async (userData, accessToken, redirectTo = '/dashboard', refreshToken = null) => {
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    connectSocket(accessToken);
    scheduleTokenRefresh();

    navigate(redirectTo, { replace: true });
  }, [navigate, connectSocket, scheduleTokenRefresh]);

  /**
   * Restores session on initial app mount:
   * Only calls refresh-token if a prior session token exists in localStorage.
   * Passes refreshToken in body for cross-site cookie compatibility (Vercel <-> Render).
   */
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedToken && !storedRefreshToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await refreshClient.post('/auth/refresh-token', {
          refreshToken: storedRefreshToken || undefined,
        });
        const { accessToken, refreshToken: newRefreshToken, user: restoredUser } = res.data.data;
        
        setUser(restoredUser);
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        localStorage.setItem('user', JSON.stringify(restoredUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        connectSocket(accessToken);
        scheduleTokenRefresh();
      } catch {
        // Stale or invalid session - silently clean up
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
