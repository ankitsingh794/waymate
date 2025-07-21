const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorMiddleware'); 

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(globalLimiter);
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => logger.http(message.trim())
  },
}));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Conventionally plural
app.use('/api/trips', tripRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);

// --- Health Check ---
app.get('/', (req, res) => {
  res.json({ status: 'WayMate API is running 🚀' });
});

// --- Final Error Handling Middleware ---
// FIX: Use the detailed global error handler for consistent error responses.
app.use(errorHandler);

module.exports = app;
