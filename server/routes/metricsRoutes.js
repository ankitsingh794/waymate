const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// This endpoint should be firewalled and not publicly accessible.
router.get('/', metricsController.getMetrics);

module.exports = router;