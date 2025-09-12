const { Transform } = require('stream');
const { Transform: Json2CsvTransform } = require('json2csv');
const enhancedExportService = require('../services/enhancedExportService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * @desc    Export comprehensive NATPAC research data with passive tracking
 * @route   GET /api/v1/export/natpac/comprehensive-csv
 * @access  Researcher only
 */
exports.exportComprehensiveNatpacCsv = (req, res, next) => {
    try {
        const dataStream = enhancedExportService.getComprehensiveNatpacDataStream(req.query);

        const natpacTransform = new Transform({
            objectMode: true,
            readableObjectMode: true,
            transform(trip, encoding, callback) {
                try {
                    const natpacRecords = enhancedExportService.transformToComprehensiveNatpacSchema(trip);
                    
                    for (const record of natpacRecords) {
                        this.push(record);
                    }
                    callback();
                } catch (error) {
                    logger.error('Error transforming trip to comprehensive NATPAC format', { 
                        tripId: trip?.tripId, 
                        error: error.message 
                    });
                    callback();
                }
            }
        });

        // Comprehensive NATPAC fields including passive tracking data
        const fields = [
            // Trip identifiers
            'trip_id', 'household_id_hashed', 'chain_id_hashed',
            
            // Trip characteristics
            'destination_city', 'trip_purpose', 'start_datetime', 'end_datetime',
            
            // Mode detection (core NATPAC requirement)
            'detected_mode', 'confirmed_mode', 'mode_confidence', 'mode_detection_method',
            
            // Companion analysis (NATPAC requirement)
            'companion_count', 'companion_confidence', 'companion_detection_method',
            
            // Trip chain context
            'chain_position', 'is_round_trip',
            
            // Research metrics
            'is_peak_hour', 'is_sustainable_mode', 'is_multimodal', 
            'weather_condition', 'day_of_week', 'is_weekend',
            
            // Data quality (crucial for research validity)
            'data_quality_score', 'sensor_completeness', 'gps_accuracy_avg', 'total_data_points',
            
            // Demographics (anonymized)
            'user_age_group', 'user_gender', 'group_size',
            
            // Segment-level data
            'segment_id', 'segment_mode', 'segment_confirmed_mode', 'segment_start_time', 
            'segment_end_time', 'segment_confidence', 'segment_is_confirmed', 
            'segment_data_points', 'segment_distance_km', 'segment_duration_minutes'
        ];

        const json2csv = new Json2CsvTransform({ fields }, { objectMode: true });

        res.header('Content-Type', 'text/csv');
        res.attachment(`waymate_comprehensive_natpac_export_${new Date().toISOString().split('T')[0]}.csv`);

        dataStream
            .pipe(natpacTransform)
            .pipe(json2csv)
            .pipe(res);

        dataStream.on('error', (err) => {
            logger.error('Error in comprehensive NATPAC data stream', { error: err.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Export failed' });
            }
        });

    } catch (error) {
        logger.error('Comprehensive NATPAC CSV export failed to initiate', { error: error.message });
        next(error);
    }
};

/**
 * @desc    Export trip chain analysis for NATPAC research
 * @route   GET /api/v1/export/natpac/trip-chains-csv
 * @access  Researcher only
 */
exports.exportTripChainsCsv = (req, res, next) => {
    try {
        // Implementation for trip chain specific export
        // This would aggregate trips into daily chains per household
        logger.info('Trip chains export initiated');
        res.json({ message: 'Trip chains export - implementation needed' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Export mode share statistics for NATPAC
 * @route   GET /api/v1/export/natpac/mode-share-csv  
 * @access  Researcher only
 */
exports.exportModeShareCsv = (req, res, next) => {
    try {
        // Implementation for aggregated mode share statistics
        logger.info('Mode share export initiated');
        res.json({ message: 'Mode share export - implementation needed' });
    } catch (error) {
        next(error);
    }
};