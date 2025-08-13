const express = require('express');
const { query } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const { findPlaces } = require('../controllers/findPlacesController');
const { strictLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validateMiddleware');

const router = express.Router();

const findPlacesValidation = [
    query('query').notEmpty().withMessage('A search query is required.').isString().trim(),
    query('location').optional().isString().trim(),
    query('lat').optional().isFloat(),
    query('lon').optional().isFloat()
];

router.use(protect, strictLimiter);

router.get('/', findPlacesValidation, validate, findPlaces);

module.exports = router;