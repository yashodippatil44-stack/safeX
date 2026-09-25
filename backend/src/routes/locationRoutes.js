const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

router.post('/update', authenticate, locationController.updateLocation);
router.get('/current/:touristId', authenticate, locationController.getCurrentLocation);
router.get('/history/:touristId', authenticate, locationController.getLocationHistory);

// Fleet-wide active locations for police dashboard map & telemetry
router.get('/fleet', authenticate, (req, res) => {
  try {
    const tourists = db.collection('touristProfiles').find();
    const fleet = tourists.map(t => ({
      id: t.id,
      touristId: t.touristId,
      name: t.name,
      origin: `${t.city || ''}, ${t.state || t.country || ''}`,
      latitude: t.currentLatitude || 25.5788,
      longitude: t.currentLongitude || 91.8833,
      accuracy: t.currentAccuracy || 10,
      speed: t.currentSpeed || 0,
      safetyStatus: t.safetyStatus || 'SAFE',
      riskLevel: t.currentRiskLevel || 'LOW',
      currentZoneId: t.currentZoneId || null,
      currentZoneName: t.currentZoneName || 'General Tourist Route',
      lastActive: t.lastActive || new Date().toISOString(),
      emergencyContact: t.emergencyContactPhone || '+91 98765 00000',
      blockchainTxId: t.blockchainTxId || '0x...'
    }));

    return res.status(200).json({
      success: true,
      count: fleet.length,
      data: fleet
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
