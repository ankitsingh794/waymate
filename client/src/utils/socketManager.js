// src/utils/socketManager.js
import { io } from 'socket.io-client';

// The socket instance is created here, once, and exported for use across the app.
const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://waymate.onrender.com', {
  autoConnect: false, 
  withCredentials: true,
});

/**
 * Returns the singleton socket instance.
 */
export const getSocket = () => socket;

/**
 * Disconnects the socket if it is currently connected.
 */
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log("Socket disconnected by manager.");
  }
};
