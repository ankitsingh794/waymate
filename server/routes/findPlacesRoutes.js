const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { findPlaces } = require('../controllers/findPlacesController');

const router = express.Router();
router.use(protect);

router.get('/', findPlaces);

module.exports = router;