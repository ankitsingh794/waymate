import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true // Send refreshToken cookie
});

// --- Optional: helpful for tracking session/debugging
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config;

    // Log all API errors
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      responseData: error.response?.data,
    });

    // If token expired and this is not already a retry
    if (
      error.response?.status === 401 &&
      !originalConfig._retry &&
      !originalConfig.url.includes('/auth/login') &&
      !originalConfig.url.includes('/auth/refresh-token')
    ) {
      originalConfig._retry = true;
      try {
        // Try to refresh token
        const refreshRes = await api.post('/auth/refresh-token');
        const newAccessToken = refreshRes.data.data.accessToken;

        // Attach new token
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalConfig.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return api(originalConfig); // Retry the original request
      } catch (refreshErr) {
        console.error('Auto-refresh failed. Logging out soon.');
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
