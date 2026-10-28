// src/utils/axiosInstance.js
import axios from 'axios';

const baseURL = import.meta.env.PROD
  ? 'https://waymate.onrender.com/api/v1' // Production URL
  : 'https://localhost:5000/api/v1';       // Development URL

// Main Axios instance used across the app
const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Dedicated unintercepted instance for refresh token calls to avoid recursive interceptor loops
export const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

// Routes that should NEVER trigger automatic token refresh on 401
const AUTH_EXEMPT_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
];

const isAuthRequest = (url = '') => {
  return AUTH_EXEMPT_ROUTES.some((route) => url.includes(route));
};

/**
 * Request Interceptor:
 * Retrieves access token from localStorage and adds it to the Authorization header.
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

// Mutex & queue state to prevent concurrent refresh stampedes
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Response Interceptor:
 * Handles 401 Unauthorized errors by refreshing access token once and retrying queued requests.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there is no request config or this error was not a 401, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Do NOT trigger refresh for authentication endpoints (login, register, refresh itself, etc.)
    // If user enters incorrect password on /auth/login, reject so the login form displays the error.
    if (isAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    // If this request already attempted a retry, don't loop again
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If another request is currently refreshing the token, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Mark that we are refreshing and that this request has attempted a retry
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post('/auth/refresh-token');
      const newAccessToken = data?.data?.accessToken;

      if (!newAccessToken) {
        throw new Error('Refresh response missing access token.');
      }

      localStorage.setItem('accessToken', newAccessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

      // Notify and retry all requests in the queue
      processQueue(null, newAccessToken);

      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed (cookie expired, invalid, rate limited, etc.)
      processQueue(refreshError, null);

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];

      // Dispatch custom event so AuthContext can clean up React state gracefully
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));

        // Only redirect if not already on an auth / public page
        const publicRoutes = ['/login', '/register', '/forgot-password', '/verify-email'];
        const currentPath = window.location.pathname;
        const isPublic = publicRoutes.some((route) => currentPath.startsWith(route)) || currentPath.startsWith('/reset-password');

        if (!isPublic) {
          window.location.href = '/login';
        }
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
