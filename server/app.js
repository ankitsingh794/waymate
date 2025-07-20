const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

/**
 * ✅ Middleware
 */
// Security headers
app.use(helmet());

// Apply global rate limiter (Redis-based)
app.use(globalLimiter);

// CORS setup
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Parse JSON & cookies
app.use(express.json());
app.use(cookieParser());

// Request logging using Morgan + Winston
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => logger.http(message.trim()) // Use http log level
  },
}));

/**
 * ✅ API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);

/**
 * ✅ Health Check
 */
app.get('/', (req, res) => {
  res.json({ status: 'WayMate API is running 🚀' });
});

/**
 * ✅ Error Handling Middleware
 */
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message} | Stack: ${err.stack}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

module.exports = app;
