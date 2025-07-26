require('dotenv').config();
const http = require('http'); 
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { initSocketIO } = require('./utils/socket');
const { closeRedisConnection } = require('./config/redis');

const PORT = process.env.PORT || 5000;

/**
 * ✅ Validate required environment variables
 */
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

/**
 * ✅ Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

/**
 * ✅ Create HTTP server from the Express app
 */
const server = http.createServer(app);

/**
 * ✅ Initialize Socket.IO and attach it to the server
 * FIX: This now calls the single, correct function.
 */
initSocketIO(server);


/**
 * ✅ Connect to Database and Start Server
 */
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => { // ✅ Use server.listen instead of app.listen
      logger.info(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    /**
     * ✅ Graceful Shutdown
     */
    const shutdown = async (signal) => { 
      logger.info(`🛑 ${signal} received. Closing server...`);
      await closeRedisConnection(); 
      server.close(() => {
        logger.info('✅ Server closed. Exiting process.');
        process.exit(0);
      });
    };


    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    /**
     * ✅ Handle unhandled promise rejections
     */
    process.on('unhandledRejection', (err) => {
      logger.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    logger.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
