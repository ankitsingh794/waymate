const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');

// Routes
// const authRoutes = require('./routes/authRoutes');
// const tripRoutes = require('./routes/tripRoutes');

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ HTTP request logger (morgan → Winston)
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ✅ API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/trips', tripRoutes);

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.json({ status: 'WayMate API is running 🚀' });
});

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error' });
});

module.exports = app;
