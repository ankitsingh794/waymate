// src/utils/socketManager.js
import { io } from 'socket.io-client';

// The socket instance is created here, once, and exported for use across the app.
const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://waymate.onrender.com', {
  autoConnect: false, 
  withCredentials: true,
});

// Store the token refresh callback
let tokenRefreshCallback = null;

/**
 * Sets up global socket error handlers for authentication failures
 */
const setupSocketErrorHandlers = () => {
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    
    // Check if the error is related to authentication/token expiration
    if (error.message && error.message.includes('Token expired')) {
      console.warn('Socket authentication failed due to expired token. Attempting token refresh...');
      
      if (tokenRefreshCallback) {
        tokenRefreshCallback();
      } else {
        console.error('No token refresh callback available. Please log in again.');
      }
    } else if (error.message && error.message.includes('Authentication failed')) {
      console.error('Socket authentication failed:', error.message);
      
      // For other authentication failures, also attempt refresh
      if (tokenRefreshCallback) {
        tokenRefreshCallback();
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    
    // If disconnection was due to authentication issues, attempt to reconnect
    if (reason === 'io server disconnect' && tokenRefreshCallback) {
      console.log('Server disconnected socket, possibly due to auth issues. Will retry after token refresh.');
      setTimeout(() => {
        if (tokenRefreshCallback) {
          tokenRefreshCallback();
        }
      }, 1000);
    }
  });
};

// Set up error handlers immediately
setupSocketErrorHandlers();

/**
 * Returns the singleton socket instance.
 */
export const getSocket = () => socket;

/**
 * Sets the callback function to be called when token refresh is needed
 */
export const setTokenRefreshCallback = (callback) => {
  tokenRefreshCallback = callback;
};

/**
 * Disconnects the socket if it is currently connected.
 */
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log("Socket disconnected by manager.");
  }
};

/**
 * Attempts to reconnect the socket with a new token
 */
export const reconnectSocket = (newToken) => {
  if (!newToken) {
    console.error('Cannot reconnect socket without a valid token');
    return;
  }

  console.log('Reconnecting socket with new token...');
  
  if (socket.connected) {
    socket.disconnect();
  }
  
  socket.auth = { token: newToken };
  socket.connect();
};
