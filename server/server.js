require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const logger = require('./utils/logger');

// --- Process Crash Prevention: Uncaught Exceptions ---
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: UNCAUGHT EXCEPTION! 💥 Process will safely terminate.', {
    message: err.message,
    stack: err.stack,
  });
  // Terminate with failure code so process managers (PM2, Docker, systemd, Render) can restart safely
  process.exit(1);
});

const app = require('./app');
const connectDB = require('./config/db');
const { initSocketIO } = require('./utils/socket');
const { closeRedisConnection } = require('./config/redis');
const { initScheduledJobs } = require('./services/cleanupService');
const { initAlertMonitoring } = require('./services/alertMonitorService');
const { initLiveItineraryService } = require('./services/liveItineraryService');

// --- Environment Variable Validation ---
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'PORT', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  logger.error(`❌ FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
let server;
let io;

// --- Server Startup Logic ---
const startServer = async () => {
  try {
    await connectDB();

    // Initialize background services
    initScheduledJobs();
    initAlertMonitoring();
    initLiveItineraryService();

    if (process.env.NODE_ENV === 'production') {
      logger.info('Production environment detected. Starting HTTP server.');
      server = http.createServer(app);
    } else {
      logger.info('Development environment detected. Starting HTTPS server.');
      const certPath = path.join(__dirname, 'localhost.pem');
      const keyPath = path.join(__dirname, 'localhost-key.pem');

      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const options = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        server = https.createServer(options, app);
      } else {
        logger.warn('Local SSL certs not found; falling back to HTTP for development.');
        server = http.createServer(app);
      }
    }

    io = initSocketIO(server);

    // Setup graceful shutdown
    const shutdown = (signal) => {
      logger.info(`🛑 ${signal} received. Closing server gracefully...`);
      if (server) {
        server.close(async () => {
          logger.info('✅ HTTP(S) server closed.');
          if (io) {
            io.close(() => logger.info('✅ Socket.IO connections closed.'));
          }
          await closeRedisConnection();
          await mongoose.connection.close();
          logger.info('✅ Database connections closed. Process terminating cleanly.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.listen(PORT, () => {
      const protocol = process.env.NODE_ENV === 'production' ? 'HTTP' : 'HTTPS/HTTP';
      logger.info(`✅ ${protocol} Server started on port ${PORT} with PID ${process.pid}`);
    });
  } catch (err) {
    logger.error(`❌ Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
};

// --- Process Crash Prevention: Unhandled Rejections ---
process.on('unhandledRejection', (err) => {
  logger.error('CRITICAL: UNHANDLED PROMISE REJECTION! 💥', {
    message: err?.message || err,
    stack: err?.stack,
  });
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// --- Start the Server ---
startServer();
