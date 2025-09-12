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
    try {
        return createHmac('sha256', ANONYMIZATION_SALT || 'default-secret-key-for-dev')
            .update(id.toString())
            .digest('hex')
            .substring(0, 16);
    } catch (error) {
        logger.error('Error creating anonymous hash', { id, error: error.message });
        return null;
    }
};

/**
 * Anonymizes a single trip object for research purposes.
 * @param {object} trip - A Mongoose trip document.
 * @returns {object} Anonymized trip data.
 */
const anonymizeTrip = (trip) => {
    try {
        // FIX: Add more detailed logging for debugging
        logger.debug('Anonymizing trip', { tripId: trip?._id });
        
        // FIX: Add safety checks for nested objects
        const members = trip.group?.members || [];
        const firstMemberWithHousehold = members.find(m => m.userId && m.userId.householdId);
        const householdHash = firstMemberWithHousehold
            ? createAnonymousHash(firstMemberWithHousehold.userId.householdId)
            : null;

        const anonymizedMembers = members.map(member => ({
            memberHash: createAnonymousHash(member.userId?._id),
            role: member.role || 'unknown',
            ageGroup: member.ageGroup || null,
            gender: member.gender || null,
            relation: member.relation || null
        }));

        const result = {
            tripId: trip._id?.toString() || '',
            householdHash,
            destination: trip.destination || 'Unknown',
            startDate: trip.startDate ? trip.startDate.toISOString().split('T')[0] : '',
            endDate: trip.endDate ? trip.endDate.toISOString().split('T')[0] : '',
            purpose: trip.purpose || 'Unknown',
            source: trip.source || 'Unknown',
            members: anonymizedMembers,
            transportMode: trip.preferences?.transportMode || 'Unknown',
            accommodationType: trip.preferences?.accommodationType || 'Unknown',
            tripCreatedAt: trip.createdAt ? trip.createdAt.toISOString() : '',
            tripUpdatedAt: trip.updatedAt ? trip.updatedAt.toISOString() : '',
            itinerary: trip.itinerary || []
        };

        logger.debug('Trip anonymized successfully', { 
            tripId: result.tripId, 
            memberCount: result.members.length,
            itineraryLength: result.itinerary.length
        });

        return result;
    } catch (error) {
        logger.error('Error anonymizing trip', { 
            tripId: trip._id, 
            error: error.message,
            stack: error.stack
        });
        // Return a minimal valid object to prevent pipeline failure
        return {
            tripId: trip._id?.toString() || 'error',
            householdHash: null,
            destination: 'Error',
            startDate: '',
            endDate: '',
            purpose: 'Error',
            source: 'Error',
            members: [],
            transportMode: 'Error',
            accommodationType: 'Error',
            tripCreatedAt: '',
            tripUpdatedAt: '',
            itinerary: []
        };
    }
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
        logger.info('Starting trip export stream', { query, filters });
        
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

        let processedCount = 0;

        cursor.on('data', (doc) => {
            try {
                processedCount++;
                logger.debug('Processing trip document', { 
                    tripId: doc._id, 
                    processedCount 
                });
                
                const anonymizedTrip = anonymizeTrip(doc);
                readableStream.push(anonymizedTrip);
            } catch (error) {
                logger.error('Error processing trip document', { 
                    tripId: doc._id, 
                    error: error.message,
                    stack: error.stack
                });
                // Continue with next document instead of breaking the stream
            }
        });

        cursor.on('end', () => {
            logger.info('Finished streaming all trips from the database for export.', { 
                totalProcessed: processedCount 
            });
            readableStream.push(null);
        });

        cursor.on('error', (err) => {
            logger.error('Database cursor error during export', { error: err.message });
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
    try {
        // FIX: Add detailed logging for debugging
        logger.debug('Transforming trip to NATPAC schema', { 
            tripId: anonymizedTrip?.tripId,
            hasMembers: !!(anonymizedTrip?.members?.length),
            hasItinerary: !!(anonymizedTrip?.itinerary?.length)
        });

        // FIX: Validate input
        if (!anonymizedTrip || typeof anonymizedTrip !== 'object') {
            throw new Error('Invalid anonymizedTrip object provided');
        }

        const members = anonymizedTrip.members || [];
        
        if (members.length === 0) {
            logger.debug('No members found, creating summary record');
            // Return a single record with no member info if no members
            return [{
                trip_id: anonymizedTrip.tripId || '',
                household_id_hashed: anonymizedTrip.householdHash || '',
                member_id_hashed: 'no_members',
                trip_purpose: anonymizedTrip.purpose || 'N/A',
                destination_city: anonymizedTrip.destination || '',
                start_date: anonymizedTrip.startDate || '',
                end_date: anonymizedTrip.endDate || '',
                data_source: anonymizedTrip.source || '',
                sequence_id: 1,
                event_type: 'trip_summary',
                event_description: 'No members found.',
                start_time: '',
                end_time: '',
                duration_minutes: '',
                travel_mode: anonymizedTrip.transportMode || 'N/A',
                travel_distance_km: '',
                place_id_anonymized: ''
            }];
        }

        const result = members.flatMap((member, memberIndex) => {
            try {
                logger.debug('Processing member', { 
                    tripId: anonymizedTrip.tripId,
                    memberIndex,
                    memberHash: member.memberHash
                });

                const itinerary = anonymizedTrip.itinerary || [];
                
                if (itinerary.length === 0) {
                    return [{
                        trip_id: anonymizedTrip.tripId || '',
                        household_id_hashed: anonymizedTrip.householdHash || '',
                        member_id_hashed: member.memberHash || '',
                        trip_purpose: anonymizedTrip.purpose || 'N/A',
                        destination_city: anonymizedTrip.destination || '',
                        start_date: anonymizedTrip.startDate || '',
                        end_date: anonymizedTrip.endDate || '',
                        data_source: anonymizedTrip.source || '',
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

                return itinerary.map((item, index) => {
                    try {
                        // FIX: Safely handle date parsing
                        let startTimeISO = '';
                        let endTimeISO = '';
                        
                        if (item.startTime) {
                            try {
                                startTimeISO = new Date(item.startTime).toISOString();
                            } catch (e) {
                                logger.warn('Invalid startTime format', { startTime: item.startTime });
                            }
                        }
                        
                        if (item.endTime) {
                            try {
                                endTimeISO = new Date(item.endTime).toISOString();
                            } catch (e) {
                                logger.warn('Invalid endTime format', { endTime: item.endTime });
                            }
                        }

                        return {
                            trip_id: anonymizedTrip.tripId || '',
                            household_id_hashed: anonymizedTrip.householdHash || '',
                            member_id_hashed: member.memberHash || '',
                            trip_purpose: anonymizedTrip.purpose || 'N/A',
                            destination_city: anonymizedTrip.destination || '',
                            start_date: anonymizedTrip.startDate || '',
                            end_date: anonymizedTrip.endDate || '',
                            data_source: anonymizedTrip.source || '',
                            sequence_id: item.sequence || (index + 1),
                            event_type: item.type || 'N/A', 
                            event_description: item.description || item.title || 'N/A',
                            start_time: startTimeISO,
                            end_time: endTimeISO,
                            duration_minutes: item.durationMinutes || '',
                            travel_mode: item.mode || '',
                            travel_distance_km: item.distanceKm || '',
                            place_id_anonymized: item.placeId ? createAnonymousHash(item.placeId) : ''
                        };
                    } catch (itemError) {
                        logger.error('Error processing itinerary item', {
                            tripId: anonymizedTrip.tripId,
                            memberIndex,
                            itemIndex: index,
                            error: itemError.message
                        });
                        // Return a minimal valid record for this item
                        return {
                            trip_id: anonymizedTrip.tripId || '',
                            household_id_hashed: anonymizedTrip.householdHash || '',
                            member_id_hashed: member.memberHash || '',
                            trip_purpose: 'Error',
                            destination_city: 'Error',
                            start_date: '',
                            end_date: '',
                            data_source: 'Error',
                            sequence_id: index + 1,
                            event_type: 'error',
                            event_description: 'Error processing itinerary item.',
                            start_time: '',
                            end_time: '',
                            duration_minutes: '',
                            travel_mode: '',
                            travel_distance_km: '',
                            place_id_anonymized: ''
                        };
                    }
                });
            } catch (memberError) {
                logger.error('Error processing member', {
                    tripId: anonymizedTrip.tripId,
                    memberIndex,
                    error: memberError.message
                });
                // Return a minimal valid record for this member
                return [{
                    trip_id: anonymizedTrip.tripId || '',
                    household_id_hashed: anonymizedTrip.householdHash || '',
                    member_id_hashed: 'error',
                    trip_purpose: 'Error',
                    destination_city: 'Error',
                    start_date: '',
                    end_date: '',
                    data_source: 'Error',
                    sequence_id: 1,
                    event_type: 'error',
                    event_description: 'Error processing member data.',
                    start_time: '',
                    end_time: '',
                    duration_minutes: '',
                    travel_mode: '',
                    travel_distance_km: '',
                    place_id_anonymized: ''
                }];
            }
        });

        logger.debug('NATPAC transformation completed', { 
            tripId: anonymizedTrip.tripId,
            resultCount: result.length
        });

        return result;
    } catch (error) {
        logger.error('Error transforming to NATPAC schema', { 
            tripId: anonymizedTrip?.tripId, 
            error: error.message,
            stack: error.stack
        });
        // Return a minimal valid record to prevent pipeline failure
        return [{
            trip_id: anonymizedTrip?.tripId || 'error',
            household_id_hashed: '',
            member_id_hashed: 'error',
            trip_purpose: 'Error',
            destination_city: 'Error',
            start_date: '',
            end_date: '',
            data_source: 'Error',
            sequence_id: 1,
            event_type: 'error',
            event_description: 'Error processing trip data.',
            start_time: '',
            end_time: '',
            duration_minutes: '',
            travel_mode: '',
            travel_distance_km: '',
            place_id_anonymized: ''
        }];
    }
};

module.exports = { getAnonymizedTripDataStream, transformToNatpacSchema };
