const cron = require('node-cron');
const Trip = require('../models/Trip');
const logger = require('../utils/logger');

const deleteOldCompletedTrips = async () => {
  logger.info('Running scheduled job: Deleting old completed trips...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Trip.deleteMany({
      status: 'completed',
      endDate: { $lt: sevenDaysAgo }
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


const initScheduledJobs = () => {

  cron.schedule('0 2 * * *', deleteOldCompletedTrips, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  logger.info('✅ Scheduled jobs initialized. Old trips will be cleaned up daily at 2:00 AM.');
};

module.exports = { initScheduledJobs };