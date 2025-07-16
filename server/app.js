const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/authRoutes');
// const tripRoutes = require('./routes/tripRoutes'); // Coming later

const app = express();

/**
 * ✅ Middleware
 */
// Security headers
app.use(helmet());

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
 * ✅ Rate Limiter for overall API
 * (Additional rate limiters for OTP and login are already applied in authRoutes)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  message: { success: false, message: 'Too many requests from this IP. Try again later.' }
});
app.use('/api', apiLimiter);

/**
 * ✅ API Routes
 */
app.use('/api/auth', authRoutes);
// app.use('/api/trips', tripRoutes); // Will integrate later

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
