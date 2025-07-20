const pdfService = require('../services/pdfService');
const Trip = require('../models/Trips');
const logger = require('../utils/logger');
const { sendResponse } = require('../utils/responseHelper');
const aiService = require('../services/aiService');
const { deleteCache } = require('../config/redis');



// Other controller functions (getAllTrips, getTripById, updateTrip, deleteTrip, etc.)
// do not need changes, but are included here for completeness.

/**
 * @desc Generate AI itinerary for an existing trip
 * @route POST /api/trip/:id/generate-ai-plan
 * @access Private
 */
exports.generateAIPlan = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return sendResponse(res, 404, false, 'Trip not found');

    logger.info(`Generating AI plan for trip: ${trip._id}`);

    // ✅ ENHANCEMENT: Prepare data for AI using the new rich format
    const aggregatedData = {
      destinationName: trip.destination, // aiService expects destinationName
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      preferences: trip.preferences || {},
      weather: trip.weather,
      attractions: trip.attractions,
      route: trip.route,
      budget: trip.budget, // Pass the full budget object
      alerts: trip.alerts
    };

    const aiResponse = await aiService.generateItinerary(aggregatedData);

    // ✅ Update trip with all new AI data
    trip.itinerary = aiResponse.itinerary;
    trip.formattedPlan = aiResponse.formattedText;
    trip.tips = aiResponse.tips;
    trip.mustEats = aiResponse.mustEats;
    trip.highlights = aiResponse.highlights;
    trip.packingChecklist = aiResponse.packingChecklist;
    await trip.save();

    await deleteCache(`trips:${req.user._id}`);

    return sendResponse(res, 200, true, 'AI plan generated successfully', { trip });

  } catch (error) {
    logger.error(`Error generating AI plan: ${error.message}`);
    return sendResponse(res, 500, false, 'Failed to generate AI plan', { error: error.message });
  }
};

/**
 * @desc Get all trips (with Redis cache)
 * @route GET /api/trip
 * @access Private
 */
exports.getAllTrips = async (req, res) => {
  const { page = 1, limit = 10, status, destination } = req.query;
  const queryKey = `trips:${req.user._id}:page=${page}&limit=${limit}&status=${status || ''}&dest=${destination || ''}`;

  try {
    // In a real app, you would add cache-invalidation logic here
    // For now, we assume cache is managed on write operations

    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (destination) query.destination = { $regex: destination, $options: 'i' };

    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      Trip.find(query).sort({ startDate: 1 }).skip(skip).limit(parseInt(limit)),
      Trip.countDocuments(query)
    ]);

    const responseData = {
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
      count: trips.length,
      data: trips
    };

    logger.info(`Fetched ${trips.length} trips for ${req.user.email}`);
    return sendResponse(res, 200, true, 'Trips fetched successfully', responseData);

  } catch (error) {
    logger.error(`Error fetching trips: ${error.message}`);
    return sendResponse(res, 500, false, 'Failed to fetch trips', { error: error.message });
  }
};

/**
 * @desc Get upcoming trips
 */
exports.getUpcomingTrips = async (req, res) => {
  try {
    const currentDate = new Date();
    const trips = await Trip.find({ userId: req.user._id, startDate: { $gte: currentDate } }).sort({ startDate: 1 });

    const responseData = { count: trips.length, data: trips };
    return sendResponse(res, 200, true, 'Upcoming trips fetched successfully', responseData);

  } catch (error) {
    logger.error(`Error fetching upcoming trips: ${error.message}`);
    return sendResponse(res, 500, false, 'Failed to fetch upcoming trips', { error: error.message });
  }
};

/**
 * @desc Get trip by ID
 */
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return sendResponse(res, 404, false, 'Trip not found');
    return sendResponse(res, 200, true, 'Trip fetched successfully', { trip });
  } catch (error) {
    return sendResponse(res, 500, false, 'Failed to fetch trip', { error: error.message });
  }
};

/**
 * @desc Update trip (preferences or status)
 */
exports.updateTrip = async (req, res) => {
  const allowedUpdateFields = ['tripName', 'preferences', 'status'];
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return sendResponse(res, 404, false, 'Trip not found');

    Object.keys(req.body).forEach(key => {
      if (allowedUpdateFields.includes(key)) {
        trip[key] = req.body[key];
      }
    });

    await trip.save();

    await deleteCache(`trips:${req.user._id}`);
    logger.info(`Trip updated: ${trip._id}`);
    return sendResponse(res, 200, true, 'Trip updated successfully', { trip });
  } catch (error) {
    logger.error(`Error updating trip: ${error.message}`);
    return sendResponse(res, 500, false, 'Failed to update trip', { error: error.message });
  }
};

/**
 * @desc Delete trip
 */
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!trip) return sendResponse(res, 404, false, 'Trip not found');

    await deleteCache(`trips:${req.user._id}`);

    logger.info(`Trip deleted: ${trip._id}`);
    return sendResponse(res, 200, true, 'Trip deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, 'Failed to delete trip', { error: error.message });
  }
};

/**
 * @desc Update trip status
 */
exports.updateTripStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['planned', 'ongoing', 'completed', 'canceled'];

  if (!validStatuses.includes(status)) {
    return sendResponse(res, 400, false, 'Invalid status');
  }

  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip) return sendResponse(res, 404, false, 'Trip not found');

    trip.status = status;
    await trip.save();

    await deleteCache(`trips:${req.user._id}`);

    logger.info(`Trip status updated: ${trip._id} → ${status}`);
    return sendResponse(res, 200, true, 'Status updated successfully', { trip });

  } catch (error) {
    return sendResponse(res, 500, false, 'Failed to update status', { error: error.message });
  }
};

/**
 * @desc    Generate and download a trip itinerary as a PDF.
 * @route   GET /api/trips/:id/download
 * @access  Private
 */
exports.downloadTripPdf = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });

    if (!trip) {
      return sendResponse(res, 404, false, 'Trip not found or you do not have permission to view it.');
    }

    logger.info(`Generating PDF for trip: ${trip._id}`);

    // Generate the PDF buffer using the service
    const pdfBuffer = await pdfService.generateTripPdf(trip);

    // Set headers to prompt a file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="WayMate-Itinerary-${trip.destination.replace(/\s+/g, '-')}.pdf"`
    );

    // Stream the PDF buffer back to the client
    res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Failed to generate PDF for trip ${req.params.id}: ${error.message}`);
    sendResponse(res, 500, false, 'Failed to generate PDF itinerary.');
  }
};
