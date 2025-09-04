require('dotenv').config();
const http = require('http'); 
const https = require('https'); 
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { initSocketIO } = require('./utils/socket');
const { closeRedisConnection } = require('./config/redis');
const { initScheduledJobs } = require('./services/cleanupService');
const { initAlertMonitoring } = require('./services/alertMonitorService');
const { initLiveItineraryService } = require('./services/liveItineraryService');

// --- Environment Variable Validation ---
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'PORT', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  logger.error(`❌ FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// --- Server Startup Logic ---
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize background services
    initScheduledJobs();
    initAlertMonitoring();
    initLiveItineraryService();
    
    let server;

    if (process.env.NODE_ENV === 'production') {
      logger.info('Production environment detected. Starting HTTP server.');
      server = http.createServer(app);
    } else {
      logger.info('Development environment detected. Starting HTTPS server.');
      const options = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
      };
      server = https.createServer(options, app);
    }

    const io = initSocketIO(server);

    // Setup graceful shutdown
    const shutdown = (signal) => {
      logger.info(`🛑 ${signal} received. Closing server gracefully...`);
      server.close(async () => {
        logger.info('✅ HTTP(S) server closed.');
        if (io) io.close(() => logger.info('✅ Socket.IO connections closed.'));
        await closeRedisConnection();
        await mongoose.connection.close();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    server.listen(PORT, () => {
      const protocol = process.env.NODE_ENV === 'production' ? 'HTTP' : 'HTTP';
      logger.info(`✅ ${protocol} Server started on port ${PORT} with PID ${process.pid}`);
    });

  } catch (err) {
    logger.error(`❌ Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
};

// --- Start the Server ---
startServer();