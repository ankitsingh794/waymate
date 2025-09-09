const { Transform } = require('stream');
const { Transform: Json2CsvTransform } = require('json2csv');
const exportService = require('../services/exportService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * @desc    Export anonymized trip data as a streaming JSON array.
 * @route   GET /api/v1/export/trips/json
 * @access  Researcher only
 */
exports.exportTripsAsJson = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);
        let isFirstChunk = true;

        // A transform stream to format the data as a valid JSON array.
        const jsonStream = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                if (isFirstChunk) {
                    this.push('[' + JSON.stringify(chunk));
                    isFirstChunk = false;
                } else {
                    this.push(',' + JSON.stringify(chunk));
                }
                callback();
            },
            flush(callback) {
                if (isFirstChunk) { // Handle case with no data
                    this.push('[]');
                } else {
                    this.push(']');
                }
                callback();
            }
        });

        res.header('Content-Type', 'application/json');
        res.attachment(`waymate_trip_export_${new Date().toISOString().split('T')[0]}.json`);
        
        dataStream.pipe(jsonStream).pipe(res);

        dataStream.on('error', (err) => {
            logger.error('Error during JSON export stream', { error: err.message });
            next(err);
        });

    } catch (error) {
        logger.error('JSON export failed to initiate', { error: error.message });
        next(error);
    }
};

/**
 * @desc    Export a high-level summary of anonymized trip data as a CSV file stream.
 * @route   GET /api/v1/export/trips/csv
 * @access  Researcher only
 */
exports.exportTripsAsCsv = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);
        const fields = [
            'tripId', 'householdHash', 'destination', 'startDate', 'endDate',
            'purpose', 'source', 'transportMode', 'accommodationType'
        ];
        const transformOpts = { fields };
        const json2csv = new Json2CsvTransform(transformOpts);

        res.header('Content-Type', 'text/csv');
        res.attachment(`waymate_trip_summary_export_${new Date().toISOString().split('T')[0]}.csv`);

        dataStream.pipe(json2csv).pipe(res);

        dataStream.on('error', (err) => {
            logger.error('Error during generic CSV export stream', { error: err.message });
            next(err);
        });

    } catch (error) {
        logger.error('Generic CSV export failed to initiate', { error: error.message });
        next(error);
    }
};

/**
 * @desc    Export detailed, anonymized trip-chain data in the NATPAC CSV format as a stream.
 * @route   GET /api/v1/export/trips/natpac-csv
 * @access  Researcher only
 */
exports.exportTripsAsNatpacCsv = (req, res, next) => {
    try {
        const dataStream = exportService.getAnonymizedTripDataStream(req.query);

        // A custom transform to apply the flatMap logic for NATPAC schema.
        const natpacTransform = new Transform({
            objectMode: true,
            transform(trip, encoding, callback) {
                const natpacRecords = exportService.transformToNatpacSchema(trip);
                natpacRecords.forEach(record => this.push(record));
                callback();
            }
        });

        const fields = [
            'trip_id', 'household_id_hashed', 'member_id_hashed', 'trip_purpose', 'destination_city',
            'start_date', 'end_date', 'data_source', 'sequence_id', 'event_type', 'event_description',
            'start_time', 'end_time', 'duration_minutes', 'travel_mode', 'travel_distance_km', 'place_id_anonymized'
        ];
        const json2csv = new Json2CsvTransform({ fields });

        res.header('Content-Type', 'text/csv');
        res.attachment(`waymate_natpac_export_${new Date().toISOString().split('T')[0]}.csv`);

        dataStream.pipe(natpacTransform).pipe(json2csv).pipe(res);
        
        dataStream.on('error', (err) => {
            logger.error('Error during NATPAC CSV export stream', { error: err.message });
            next(err);
        });

    } catch (error) {
        logger.error('NATPAC CSV export failed to initiate', { error: error.message });
        next(error);
    }
};
