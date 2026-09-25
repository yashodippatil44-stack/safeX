const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

router.get('/safety-status', authenticate, locationController.getTouristSafetyStatus);

router.get('/profile', authenticate, (req, res) => {
  try {
    let touristProfile = req.touristProfile;
    if (!touristProfile && req.query.touristId) {
      touristProfile = db.collection('touristProfiles').findOne(tp => tp.touristId === req.query.touristId);
    }
    if (!touristProfile) {
      return res.status(404).json({ success: false, error: 'Tourist profile not found.' });
    }
    return res.status(200).json({ success: true, data: touristProfile });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
