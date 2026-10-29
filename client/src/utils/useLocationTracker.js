import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosInstance';
import { throttle } from 'lodash'; 

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const useLocationTracker = () => {
  const { isAuthenticated, user } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Only track when authenticated with an active session token
    const token = localStorage.getItem('accessToken');
    if (!isAuthenticated || !user || !token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Sends coordinates to the backend; throttled to at most once per minute
    const sendLocationUpdate = throttle(async (position) => {
      const activeToken = localStorage.getItem('accessToken');
      if (!activeToken) return;

      try {
        const { latitude, longitude } = position.coords;
        await api.patch('/users/profile/location', {
          lat: latitude,
          lon: longitude,
        });
      } catch (error) {
        // Suppress 401s — handled centrally by axios response interceptor
        if (error.response?.status !== 401) {
          console.error('Failed to send location update:', error);
        }
      }
    }, 60 * 1000);

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
      }
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      navigator.geolocation.getCurrentPosition(sendLocationUpdate, (err) => {
        console.warn(`Could not get initial location: ${err.message}`);
      });
      
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(sendLocationUpdate, (err) => {
          console.warn(`Could not get periodic location: ${err.message}`);
        });
      }, LOCATION_UPDATE_INTERVAL);
    };

    startTracking();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, user]);
};

export default useLocationTracker;
