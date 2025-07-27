import { io } from 'socket.io-client';

// Get the server URL from environment variables
const URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const socket = io(URL, {
  autoConnect: true,
  withCredentials: true,
});

export default socket;