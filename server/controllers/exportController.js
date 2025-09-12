const { Transform } = require('stream');
const { Transform: Json2CsvTransform } = require('json2csv');
const exportService = require('../services/exportService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const Trip = require('../models/Trip'); // Import Trip model
const User = require('../models/User'); // Import User model

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
            readableObjectMode: false, // Output strings, not objects
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

        // FIX: Use the correct json2csv configuration
        const json2csv = new Json2CsvTransform({ fields }, { objectMode: true });

        res.header('Content-Type', 'text/csv');
        res.attachment(`waymate_trip_summary_export_${new Date().toISOString().split('T')[0]}.csv`);

        dataStream.pipe(json2csv).pipe(res);

        dataStream.on('error', (err) => {
            logger.error('Error during generic CSV export stream', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Export failed' });
            }
        });

        json2csv.on('error', (err) => {
            logger.error('Error in CSV conversion stream', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'CSV conversion failed' });
            }
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

        // FIX: A custom transform to apply the flatMap logic for NATPAC schema
        const natpacTransform = new Transform({
            objectMode: true, // Input objects
            readableObjectMode: true, // Output objects too
            transform(trip, encoding, callback) {
                try {
                    const natpacRecords = exportService.transformToNatpacSchema(trip);
                    
                    // FIX: Log for debugging
                    logger.debug('Transformed trip to NATPAC records', { 
                        tripId: trip?.tripId, 
                        recordCount: natpacRecords?.length 
                    });
                    
                    // Push each record individually
                    for (const record of natpacRecords) {
                        this.push(record);
                    }
                    callback();
                } catch (error) {
                    logger.error('Error transforming trip to NATPAC format', { 
                        tripId: trip?.tripId, 
                        error: error.message,
                        stack: error.stack
                    });
                    // FIX: Don't call callback with error, just skip this trip
                    callback();
                }
            }
        });

        const fields = [
            'trip_id', 'household_id_hashed', 'member_id_hashed', 'trip_purpose', 'destination_city',
            'start_date', 'end_date', 'data_source', 'sequence_id', 'event_type', 'event_description',
            'start_time', 'end_time', 'duration_minutes', 'travel_mode', 'travel_distance_km', 'place_id_anonymized'
        ];

        // FIX: Correct json2csv configuration - the second parameter should be transform options
        const json2csv = new Json2CsvTransform({ fields }, { objectMode: true });

        res.header('Content-Type', 'text/csv');
        res.attachment(`waymate_natpac_export_${new Date().toISOString().split('T')[0]}.csv`);

        // Create the pipeline
        dataStream
            .pipe(natpacTransform)
            .pipe(json2csv)
            .pipe(res);

        // Handle errors from each stream in the pipeline
        dataStream.on('error', (err) => {
            logger.error('Error in data stream during NATPAC CSV export', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Export failed' });
            }
        });

        natpacTransform.on('error', (err) => {
            logger.error('Error in NATPAC transform stream', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Data transformation failed' });
            }
        });

        json2csv.on('error', (err) => {
            logger.error('Error in CSV conversion stream', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'CSV conversion failed' });
            }
        });

        // FIX: Add response error handling
        res.on('error', (err) => {
            logger.error('Error in response stream', { error: err.message });
        });

    } catch (error) {
        logger.error('NATPAC CSV export failed to initiate', { error: error.message });
        next(error);
    }
};

/**
 * @desc    Get export statistics
 * @route   GET /api/v1/export/stats
 * @access  Researcher only
 */
exports.getExportStats = async (req, res, next) => {
  try {
    const [tripCount, userCount, householdCount] = await Promise.all([
      Trip.countDocuments(),
      User.countDocuments(),
      User.distinct('householdId').then(ids => ids.filter(id => id != null).length),
    ]);

    // Get format counts from some logging mechanism if available
    const formatCounts = {
      'csv': 0,
      'json': 0,
      'natpac-csv': 0,
      'comprehensive-csv': 0,
      'trip-chains-csv': 0,
      'mode-share-csv': 0,
    };

    res.json({
      success: true,
      data: {
        totalTrips: tripCount,
        totalUsers: userCount,
        totalHouseholds: householdCount,
        lastExport: new Date().toISOString(), // You might want to track this properly
        formatCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};
