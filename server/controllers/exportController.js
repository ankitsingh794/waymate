// FIX: Import the Parser class for in-memory conversion, which is more reliable.
const { Parser } = require('json2csv');
const exportService = require('../services/exportService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// The JSON export function is correct and remains the same.
exports.exportTripsAsJson = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);
        const data = [];
        dataStream.on('data', (chunk) => data.push(chunk));
        dataStream.on('end', () => {
            res.status(200).json({
                success: true,
                count: data.length,
                data: data
            });
        });
        dataStream.on('error', (error) => next(error));
    } catch (error) {
        logger.error('JSON export failed to initiate', { error: error.message });
        next(error);
    }
};

/**
 * @desc    Export a high-level summary of anonymized trip data as a CSV file.
 * @route   GET /api/v1/export/trips/csv
 * @access  Researcher only
 */
exports.exportTripsAsCsv = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);
        const anonymizedTrips = [];
        dataStream.on('data', (chunk) => anonymizedTrips.push(chunk));
        dataStream.on('end', () => {
            try {
                if (anonymizedTrips.length === 0) {
                    return res.status(200).send('No data available for the selected criteria.');
                }
                const fields = [
                    'tripId', 'householdHash', 'destination', 'startDate', 'endDate',
                    'dayCount', 'travelerCount', 'status', 'source', 'purpose',
                    'transportMode', 'accommodationType'
                ];
                const json2csvParser = new Parser({ fields });
                const csv = json2csvParser.parse(anonymizedTrips);
                res.header('Content-Type', 'text/csv');
                res.attachment(`waymate_trip_summary_export_${new Date().toISOString().split('T')[0]}.csv`);
                res.status(200).send(csv);
            } catch (transformError) {
                next(transformError);
            }
        });
        dataStream.on('error', (streamError) => next(streamError));
    } catch (error) {
        logger.error('Generic CSV export failed to initiate', { error: error.message });
        next(error);
    }
};


/**
 * @desc    Export detailed, anonymized trip-chain data in the NATPAC CSV format.
 * @route   GET /api/v1/export/trips/natpac-csv
 * @access  Researcher only
 */
exports.exportTripsAsNatpacCsv = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);
        const anonymizedTrips = [];
        dataStream.on('data', (chunk) => anonymizedTrips.push(chunk));
        dataStream.on('end', () => {
            try {
                const natpacData = anonymizedTrips.flatMap(trip =>
                    exportService.transformToNatpacSchema(trip)
                );
                if (natpacData.length === 0) {
                    return res.status(200).send('No data available for the selected criteria.');
                }
                const fields = [
                    'trip_id', 'household_id_hashed', 'member_id_hashed', 'trip_purpose', 'destination_city',
                    'start_date', 'end_date', 'data_source', 'sequence_id', 'event_type', 'event_description',
                    'start_time', 'end_time', 'duration_minutes', 'travel_mode', 'travel_distance_km', 'place_id_anonymized'
                ];
                const json2csvParser = new Parser({ fields });
                const csv = json2csvParser.parse(natpacData);
                res.header('Content-Type', 'text/csv');
                res.attachment(`waymate_natpac_export_${new Date().toISOString().split('T')[0]}.csv`);
                res.status(200).send(csv);
            } catch (transformError) {
                next(transformError);
            }
        });
        dataStream.on('error', (streamError) => next(streamError));
    } catch (error) {
        logger.error('NATPAC CSV export failed to initiate', { error: error.message });
        next(error);
    }
};

