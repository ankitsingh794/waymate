const { Readable } = require('stream');
const { createHmac } = require('crypto');
const Trip = require('../models/Trip');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const ANONYMIZATION_SALT = process.env.ANONYMIZATION_SALT || 'dev-key';

/**
 * Enhanced anonymization for complete NATPAC research data
 */
const anonymizeTripForNatpac = (trip) => {
    try {
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

        // Enhanced trip data with passive tracking info
        return {
            // Basic trip info
            tripId: trip._id?.toString() || '',
            householdHash,
            destination: trip.destination || 'Unknown',
            startDate: trip.startDate ? trip.startDate.toISOString() : '',
            endDate: trip.endDate ? trip.endDate.toISOString() : '',
            
            // ADD: Passive tracking data
            detectedMode: trip.passiveData?.detectedMode || 'unknown',
            confirmedMode: trip.passiveData?.confirmedMode || trip.passiveData?.detectedMode || 'unknown',
            modeConfidence: trip.passiveData?.modeConfidence || 0,
            companionCount: trip.passiveData?.companionCount || 0,
            companionConfidence: trip.passiveData?.companionConfidence || 0,
            tripPurpose: trip.passiveData?.tripPurpose || trip.purpose || 'unknown',
            isPassivelyDetected: trip.passiveData?.isPassivelyDetected || false,
            
            // ADD: Data quality indicators
            dataQuality: {
                totalDataPoints: trip.passiveData?.rawSensorData?.totalDataPoints || 0,
                avgAccuracy: trip.passiveData?.rawSensorData?.avgAccuracy || null,
                sensorCompleteness: trip.passiveData?.rawSensorData?.sensorCompleteness || 0,
                overallScore: trip.natpacMetrics?.dataQualityScore || 0
            },
            
            // ADD: Trip chain context
            tripChain: {
                chainId: trip.tripChain?.chainId ? createAnonymousHash(trip.tripChain.chainId) : null,
                positionInChain: trip.tripChain?.positionInChain || 1,
                isRoundTrip: trip.tripChain?.isRoundTrip || false
            },
            
            // ADD: NATPAC research metrics
            researchMetrics: {
                isPeakHour: trip.natpacMetrics?.isPeakHour || false,
                sustainableMode: trip.natpacMetrics?.sustainableMode || false,
                multiModalTrip: trip.natpacMetrics?.multiModalTrip || false,
                weatherCondition: trip.natpacMetrics?.weatherCondition || 'unknown',
                dayOfWeek: trip.natpacMetrics?.dayOfWeek || 'unknown',
                isWeekend: trip.natpacMetrics?.isWeekend || false
            },
            
            // Existing fields
            members: anonymizedMembers,
            transportMode: trip.preferences?.transportMode || 'unknown',
            accommodationType: trip.preferences?.accommodationType || 'unknown',
            tripCreatedAt: trip.createdAt ? trip.createdAt.toISOString() : '',
            tripUpdatedAt: trip.updatedAt ? trip.updatedAt.toISOString() : '',
            
            // ADD: Enhanced itinerary with segments
            segments: trip.segments?.map((segment, index) => ({
                sequenceId: index + 1,
                mode: segment.mode,
                detectedMode: segment.mode,
                confirmedMode: segment.confirmedMode || segment.mode,
                startTime: segment.startTime ? segment.startTime.toISOString() : '',
                endTime: segment.endTime ? segment.endTime.toISOString() : '',
                confidence: segment.confidence || 0,
                isConfirmed: segment.isConfirmed || false,
                pathCoordinates: segment.path?.coordinates || [],
                dataPointCount: segment.rawDataPoints?.length || 0
            })) || [],
            
            itinerary: trip.itinerary || []
        };
    } catch (error) {
        logger.error('Error in enhanced trip anonymization', { 
            tripId: trip._id, 
            error: error.message 
        });
        return null;
    }
};

/**
 * Transform to comprehensive NATPAC research format
 */
const transformToComprehensiveNatpacSchema = (anonymizedTrip) => {
    if (!anonymizedTrip) return [];
    
    try {
        const baseRecord = {
            // Trip identifiers
            trip_id: anonymizedTrip.tripId,
            household_id_hashed: anonymizedTrip.householdHash || '',
            chain_id_hashed: anonymizedTrip.tripChain?.chainId || '',
            
            // Trip characteristics
            destination_city: anonymizedTrip.destination,
            trip_purpose: anonymizedTrip.tripPurpose,
            start_datetime: anonymizedTrip.startDate,
            end_datetime: anonymizedTrip.endDate,
            
            // Mode detection
            detected_mode: anonymizedTrip.detectedMode,
            confirmed_mode: anonymizedTrip.confirmedMode,
            mode_confidence: anonymizedTrip.modeConfidence,
            mode_detection_method: anonymizedTrip.isPassivelyDetected ? 'ml_passive' : 'user_input',
            
            // Companion analysis
            companion_count: anonymizedTrip.companionCount,
            companion_confidence: anonymizedTrip.companionConfidence,
            companion_detection_method: anonymizedTrip.companionConfidence > 0 ? 'bluetooth_wifi' : 'none',
            
            // Trip chain context
            chain_position: anonymizedTrip.tripChain?.positionInChain || 1,
            is_round_trip: anonymizedTrip.tripChain?.isRoundTrip || false,
            
            // Research metrics
            is_peak_hour: anonymizedTrip.researchMetrics?.isPeakHour || false,
            is_sustainable_mode: anonymizedTrip.researchMetrics?.sustainableMode || false,
            is_multimodal: anonymizedTrip.researchMetrics?.multiModalTrip || false,
            weather_condition: anonymizedTrip.researchMetrics?.weatherCondition || 'unknown',
            day_of_week: anonymizedTrip.researchMetrics?.dayOfWeek || 'unknown',
            is_weekend: anonymizedTrip.researchMetrics?.isWeekend || false,
            
            // Data quality
            data_quality_score: anonymizedTrip.dataQuality?.overallScore || 0,
            sensor_completeness: anonymizedTrip.dataQuality?.sensorCompleteness || 0,
            gps_accuracy_avg: anonymizedTrip.dataQuality?.avgAccuracy || null,
            total_data_points: anonymizedTrip.dataQuality?.totalDataPoints || 0,
            
            // Demographics (anonymized)
            user_age_group: anonymizedTrip.members?.[0]?.ageGroup || 'unknown',
            user_gender: anonymizedTrip.members?.[0]?.gender || 'unknown',
            group_size: anonymizedTrip.members?.length || 1
        };

        // Create records for each segment if available
        if (anonymizedTrip.segments && anonymizedTrip.segments.length > 0) {
            return anonymizedTrip.segments.map((segment, index) => ({
                ...baseRecord,
                
                // Segment-specific data
                segment_id: index + 1,
                segment_mode: segment.mode,
                segment_confirmed_mode: segment.confirmedMode,
                segment_start_time: segment.startTime,
                segment_end_time: segment.endTime,
                segment_confidence: segment.confidence || 0,
                segment_is_confirmed: segment.isConfirmed || false,
                segment_data_points: segment.dataPointCount || 0,
                
                // Calculate segment distance and duration
                segment_distance_km: segment.pathCoordinates.length > 1 ? 
                    calculatePathDistance(segment.pathCoordinates) : null,
                segment_duration_minutes: segment.startTime && segment.endTime ?
                    Math.round((new Date(segment.endTime) - new Date(segment.startTime)) / (1000 * 60)) : null
            }));
        } else {
            // Single trip record if no segments
            return [{
                ...baseRecord,
                segment_id: 1,
                segment_mode: baseRecord.detected_mode,
                segment_confirmed_mode: baseRecord.confirmed_mode,
                segment_start_time: baseRecord.start_datetime,
                segment_end_time: baseRecord.end_datetime,
                segment_confidence: baseRecord.mode_confidence,
                segment_is_confirmed: true,
                segment_data_points: baseRecord.total_data_points,
                segment_distance_km: null,
                segment_duration_minutes: null
            }];
        }
    } catch (error) {
        logger.error('Error transforming to comprehensive NATPAC schema', { 
            tripId: anonymizedTrip?.tripId, 
            error: error.message 
        });
        return [];
    }
};

/**
 * Calculate distance from coordinate array (simple haversine)
 */
const calculatePathDistance = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const [lon1, lat1] = coordinates[i - 1];
        const [lon2, lat2] = coordinates[i];
        totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
    }
    return totalDistance;
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * (Math.PI / 180)) * 
              Math.cos(lat2 * (Math.PI / 180)) * 
              Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const createAnonymousHash = (id) => {
    if (!id) return null;
    return createHmac('sha256', ANONYMIZATION_SALT)
        .update(id.toString())
        .digest('hex')
        .substring(0, 16);
};

/**
 * Enhanced data stream for comprehensive NATPAC export
 */
const getComprehensiveNatpacDataStream = (filters = {}) => {
    try {
        const query = buildQuery(filters);
        logger.info('Starting comprehensive NATPAC export stream', { query, filters });
        
        const cursor = Trip.find(query)
            .populate({
                path: 'group.members.userId',
                select: 'householdId _id demographics',
            })
            .lean()
            .cursor();

        const readableStream = new Readable({
            objectMode: true,
            read() {}
        });

        let processedCount = 0;

        cursor.on('data', (doc) => {
            try {
                processedCount++;
                const anonymizedTrip = anonymizeTripForNatpac(doc);
                if (anonymizedTrip) {
                    readableStream.push(anonymizedTrip);
                }
            } catch (error) {
                logger.error('Error processing trip document for NATPAC', { 
                    tripId: doc._id, 
                    error: error.message 
                });
            }
        });

        cursor.on('end', () => {
            logger.info('Finished comprehensive NATPAC export stream', { 
                totalProcessed: processedCount 
            });
            readableStream.push(null);
        });

        cursor.on('error', (err) => {
            logger.error('Database cursor error during comprehensive NATPAC export', { error: err.message });
            readableStream.emit('error', new AppError('Database error during export', 500));
        });

        return readableStream;
    } catch (error) {
        logger.error('Failed to create comprehensive NATPAC data stream', { error: error.message });
        throw new AppError('Could not initiate NATPAC export stream', 500);
    }
};

const buildQuery = (queryParams) => {
    const query = {};
    const { startDate, endDate, includePassive } = queryParams;
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Filter for passive tracking data if requested
    if (includePassive === 'true') {
        query['passiveData.isPassivelyDetected'] = true;
    }
    
    return query;
};

module.exports = { 
    getComprehensiveNatpacDataStream, 
    transformToComprehensiveNatpacSchema,
    anonymizeTripForNatpac
};