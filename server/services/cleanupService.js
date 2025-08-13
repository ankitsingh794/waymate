const cron = require('node-cron');
const Trip = require('../models/Trip');
const logger = require('../utils/logger');

// --- Use environment variable for configuration ---
const TRIP_RETENTION_DAYS = parseInt(process.env.TRIP_RETENTION_DAYS, 10) || 7;

const deleteOldCompletedTrips = async () => {
  logger.info(`Running scheduled job: Deleting completed trips older than ${TRIP_RETENTION_DAYS} days...`);
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRIP_RETENTION_DAYS);

    const result = await Trip.deleteMany({
      status: 'completed',
      endDate: { $lt: cutoffDate }
    });

    if (result.deletedCount > 0) {
      logger.info(`Successfully deleted ${result.deletedCount} old completed trip(s).`);
    } else {
      logger.info('No old completed trips to delete.');
    }
  } catch (error) {
    logger.error('Error during scheduled trip cleanup:', { error: error.message, stack: error.stack });
  }
};

/**
 * Initializes scheduled jobs for the application.
 * @param {boolean} isPrimaryWorker - Flag to ensure jobs are only scheduled on one process.
 */
const initScheduledJobs = (isPrimaryWorker = false) => {
  if (!isPrimaryWorker) {
    logger.info('Skipping cron job initialization on non-primary worker.');
    return;
  }

  cron.schedule('0 2 * * *', deleteOldCompletedTrips, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  logger.info(`✅ Scheduled jobs initialized on primary worker. Trip cleanup will run daily at 2:00 AM.`);
};

module.exports = { initScheduledJobs };