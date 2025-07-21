// FILE: db.js

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // The await handles the initial connection attempt.
    // Logging is now handled by the event listeners for consistency.
    await mongoose.connect(process.env.MONGO_URI);

    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Mongoose disconnected from DB');
    });

    // This process-level event listener is crucial for graceful shutdown.
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🔌 MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (err) {
    // This block catches errors only from the very first connection attempt.
    logger.error(`❌ Initial MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;