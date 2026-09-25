const express = require('express');
const router = express.Router();
const emergencyServicesController = require('../controllers/emergencyServicesController');
const { authenticate } = require('../middleware/auth');

router.get('/nearby', authenticate, emergencyServicesController.getNearbyServices);

module.exports = router;
