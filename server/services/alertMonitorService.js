const cron = require('node-cron');
const Trip = require('../models/Trip');
const alertService = require('./alertService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * A background job that checks for new alerts for all upcoming and ongoing trips.
 */
const checkForNewAlerts = async () => {
  logger.info('Running scheduled job: Checking for new travel alerts...');
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const relevantTrips = await Trip.find({
      status: { $in: ['planned', 'ongoing'] },
      startDate: { $lte: sevenDaysFromNow },
      endDate: { $gte: new Date() } 
    });

    if (relevantTrips.length === 0) {
      logger.info('No upcoming or ongoing trips to monitor for alerts.');
      return;
    }
    
    logger.info(`Found ${relevantTrips.length} relevant trips to check for new alerts.`);

    for (const trip of relevantTrips) {
      const latestAlerts = await alertService.fetchThreatAlertsForDestination(trip.destination);
      
      const newAlerts = latestAlerts.filter(alertTitle => !trip.sentAlerts.includes(alertTitle));

      if (newAlerts.length > 0) {
        logger.info(`Found ${newAlerts.length} new alert(s) for trip to ${trip.destination} (ID: ${trip._id})`);
        const alertMessage = `❗ New Travel Advisory for your trip to ${trip.destination}: ${newAlerts.join('; ')}`;
        
        trip.group.members.forEach(member => {
            notificationService.emitToUser(member.userId, 'newTravelAlert', {
                tripId: trip._id,
                message: alertMessage,
            });
        });

        trip.sentAlerts.push(...newAlerts);
        await trip.save();
      }
    }
  } catch (error) {
    logger.error('Error during scheduled alert check:', { error: error.message, stack: error.stack });
  }
};

/**
 * Initializes the scheduled job for monitoring alerts.
 */
const initAlertMonitoring = () => {
  cron.schedule('0 */4 * * *', checkForNewAlerts, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  logger.info(`✅ Scheduled alert monitoring initialized. Job will run every 4 hours.`);
};

module.exports = { initAlertMonitoring };