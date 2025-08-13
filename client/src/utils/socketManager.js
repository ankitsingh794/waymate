// src/utils/socketManager.js
import { io } from 'socket.io-client';

// The socket instance is created here, once.
const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://localhost:5000', {
  autoConnect: false, // CRITICAL: Only connect when we explicitly say so.
  withCredentials: true,
});

export const getSocket = () => socket;