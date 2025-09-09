const { Readable } = require('stream');
const { createHmac } = require('crypto');
const Trip = require('../models/Trip');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Retrieve the salt from environment variables for enhanced security.
const ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT;
if (!ANONYMIZATION_SALT) {
    logger.warn('ANONYMIZATION_SALT is not set. Exported hashes will be less secure.');
}

/**
 * Creates a consistent, salted, and irreversible hash for an ID.
 * @param {string | import('mongoose').Types.ObjectId} id - The ID to hash.
 * @returns {string | null} A short hex hash.
 */
const createAnonymousHash = (id) => {
    if (!id) return null;
    return createHmac('sha256', ANONYMIZATION_SALT || 'default-secret-key-for-dev')
        .update(id.toString())
        .digest('hex')
        .substring(0, 16);
};

/**
 * Anonymizes a single trip object for research purposes.
 * @param {object} trip - A Mongoose trip document.
 * @returns {object} Anonymized trip data.
 */
const anonymizeTrip = (trip) => {
    const firstMemberWithHousehold = trip.group.members.find(m => m.userId && m.userId.householdId);
    const householdHash = firstMemberWithHousehold
        ? createAnonymousHash(firstMemberWithHousehold.userId.householdId)
        : null;

    const anonymizedMembers = trip.group.members.map(member => ({
        memberHash: createAnonymousHash(member.userId._id),
        role: member.role,
        ageGroup: member.ageGroup || null,
        gender: member.gender || null,
        relation: member.relation || null
    }));

    return {
        tripId: trip._id,
        householdHash,
        destination: trip.destination,
        startDate: trip.startDate.toISOString().split('T')[0],
        endDate: trip.endDate.toISOString().split('T')[0],
        purpose: trip.purpose,
        source: trip.source,
        members: anonymizedMembers,
        transportMode: trip.preferences.transportMode,
        accommodationType: trip.preferences.accommodationType,
        tripCreatedAt: trip.createdAt.toISOString(),
        tripUpdatedAt: trip.updatedAt.toISOString(),
        itinerary: trip.itinerary || []
    };
};

/**
 * Constructs a Mongoose query object from request query parameters.
 * @param {object} queryParams - The request query parameters.
 * @returns {object} A Mongoose query object.
 */
const buildQuery = (queryParams) => {
    const query = {};
    const { startDate, endDate } = queryParams;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) throw new AppError('Invalid startDate format.', 400);
            query.createdAt.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) throw new AppError('Invalid endDate format.', 400);
            query.createdAt.$lte = end;
        }
    }
    return query;
};

/**
 * Returns a readable stream of anonymized trip data from the database.
 * @param {object} filters - The filters to apply to the trip query.
 * @returns {Readable} A readable stream in object mode.
 */
const getAnonymizedTripDataStream = (filters = {}) => {
    try {
        const query = buildQuery(filters);
        const cursor = Trip.find(query)
            .populate({
                path: 'group.members.userId',
                select: 'householdId _id',
            })
            .lean() // Use .lean() for better performance with streams
            .cursor();

        const readableStream = new Readable({
            objectMode: true,
            read() {}
        });

        cursor.on('data', (doc) => {
            readableStream.push(anonymizeTrip(doc));
        });

        cursor.on('end', () => {
            logger.info('Finished streaming all trips from the database for export.');
            readableStream.push(null);
        });

        cursor.on('error', (err) => {
            readableStream.emit('error', new AppError('A database error occurred during the export.', 500));
        });

        return readableStream;
    } catch (error) {
        // Rethrow client errors (like bad date formats) to be handled by the controller
        if (error instanceof AppError) {
            throw error;
        }
        // Log and wrap server errors
        logger.error('Failed to create trip data stream.', { error: error.message });
        throw new AppError('Could not initiate the data export stream.', 500);
    }
};

/**
 * Transforms a single, anonymized trip object into a flat, detailed trip-chain format for NATPAC.
 * @param {object} anonymizedTrip - The trip object from the anonymizeTrip function.
 * @returns {Array<object>} An array of NATPAC-formatted records.
 */
const transformToNatpacSchema = (anonymizedTrip) => {
    return anonymizedTrip.members.flatMap(member => {
        
        if (!anonymizedTrip.itinerary || anonymizedTrip.itinerary.length === 0) {
            return [{
                trip_id: anonymizedTrip.tripId,
                household_id_hashed: anonymizedTrip.householdHash,
                member_id_hashed: member.memberHash,
                trip_purpose: anonymizedTrip.purpose || 'N/A',
                destination_city: anonymizedTrip.destination,
                start_date: anonymizedTrip.startDate,
                end_date: anonymizedTrip.endDate,
                data_source: anonymizedTrip.source,
                sequence_id: 1,
                event_type: 'trip_summary',
                event_description: 'No detailed itinerary available.',
                start_time: '',
                end_time: '',
                duration_minutes: '',
                travel_mode: anonymizedTrip.transportMode || 'N/A',
                travel_distance_km: '',
                place_id_anonymized: ''
            }];
        }

        return anonymizedTrip.itinerary.map((item, index) => ({
            trip_id: anonymizedTrip.tripId,
            household_id_hashed: anonymizedTrip.householdHash,
            member_id_hashed: member.memberHash,
            trip_purpose: anonymizedTrip.purpose || 'N/A',
            destination_city: anonymizedTrip.destination,
            start_date: anonymizedTrip.startDate,
            end_date: anonymizedTrip.endDate,
            data_source: anonymizedTrip.source,
            sequence_id: item.sequence || (index + 1),
            event_type: item.type || 'N/A', 
            event_description: item.description || 'N/A',
            start_time: item.startTime ? new Date(item.startTime).toISOString() : '',
            end_time: item.endTime ? new Date(item.endTime).toISOString() : '',
            duration_minutes: item.durationMinutes || '',
            travel_mode: item.mode || '',
            travel_distance_km: item.distanceKm || '',
            place_id_anonymized: item.placeId ? createAnonymousHash(item.placeId) : ''
        }));
    });
};

module.exports = { getAnonymizedTripDataStream, transformToNatpacSchema };
