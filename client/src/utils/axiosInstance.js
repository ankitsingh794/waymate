// src/utils/axiosInstance.js
import axios from 'axios';

const baseURL = import.meta.env.PROD
  ? 'https://waymate.onrender.com/api/v1' // Production URL
  : 'https://localhost:5000/api/v1';       // Development URL

const api = axios.create({
  baseURL,
  withCredentials: true,
});

/**
 * Request Interceptor:
 * This function runs *before* every API request is sent.
 * It retrieves the access token from localStorage and adds it to the Authorization header.
 * This ensures that every request is authenticated, even after a page refresh.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * This function runs *after* every API response is received.
 * It specifically looks for '401 Unauthorized' errors, which indicate an expired access token,
 * and tries to refresh the session automatically.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      try {
        console.log("Access token expired. Attempting to refresh...");
        const { data } = await api.post('/auth/refresh-token');
        const newAccessToken = data.data.accessToken;

        localStorage.setItem('accessToken', newAccessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error("Session has expired or is invalid. Redirecting to login.", refreshError);
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
