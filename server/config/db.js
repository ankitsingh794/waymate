const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Attach event listeners BEFORE connecting
    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Mongoose disconnected from DB');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🔌 MongoDB connection closed due to app termination');
      process.exit(0);
    });

    // Connect after listeners are attached
    await mongoose.connect(process.env.MONGO_URI);

  } catch (err) {
    logger.error(`❌ Initial MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
