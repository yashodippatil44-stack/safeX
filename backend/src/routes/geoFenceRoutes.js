const express = require('express');
const router = express.Router();
const geoFenceController = require('../controllers/geoFenceController');
const { authenticate, authorize } = require('../middleware/auth');

// Public/Tourist read access (authenticated)
router.get('/', authenticate, geoFenceController.getAllGeoFences);
router.get('/:id', authenticate, geoFenceController.getGeoFenceById);

// Authority mutation access
router.post(
  '/',
  authenticate,
  authorize('POLICE', 'ADMIN', 'TOURISM_AUTHORITY'),
  geoFenceController.createGeoFence
);
router.put(
  '/:id',
  authenticate,
  authorize('POLICE', 'ADMIN', 'TOURISM_AUTHORITY'),
  geoFenceController.updateGeoFence
);
router.delete(
  '/:id',
  authenticate,
  authorize('POLICE', 'ADMIN', 'TOURISM_AUTHORITY'),
  geoFenceController.deleteGeoFence
);

module.exports = router;
