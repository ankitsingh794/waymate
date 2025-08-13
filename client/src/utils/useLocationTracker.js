import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosInstance';
import { throttle } from 'lodash'; 

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

const useLocationTracker = () => {
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    // This function sends the location to the backend.
    // We use 'throttle' to ensure we don't send updates too frequently.
    const sendLocationUpdate = throttle(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        await api.patch('/users/profile/location', {
          lat: latitude,
          lon: longitude,
        });
        console.log('📍 Location updated successfully.');
      } catch (error) {
        console.error('Failed to send location update:', error);
      }
    }, 60 * 1000); // Throttle to once per minute at most

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
      }
      
      // Clear any existing interval to prevent duplicates
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Get an immediate first location update
      navigator.geolocation.getCurrentPosition(sendLocationUpdate, (err) => {
        console.warn(`Could not get initial location: ${err.message}`);
      });
      
      // Then, set an interval to update the location periodically
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(sendLocationUpdate, (err) => {
          console.warn(`Could not get periodic location: ${err.message}`);
        });
      }, LOCATION_UPDATE_INTERVAL);
    };

    const stopTracking = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('📍 Location tracking stopped.');
      }
    };

    // Start tracking when the user is authenticated, stop when they are not.
    if (isAuthenticated) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup function to stop tracking when the component unmounts
    return () => stopTracking();

  }, [isAuthenticated]); // This effect re-runs only when the user's auth state changes
};

export default useLocationTracker;