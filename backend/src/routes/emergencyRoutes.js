const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate, authorize } = require('../middleware/auth');

// Tourist SOS Actions
router.post('/sos', authenticate, emergencyController.triggerSOS);
router.post('/:id/cancel', authenticate, emergencyController.cancelSOS);
router.get('/my-active', authenticate, emergencyController.getMyActiveEmergency);

// Authority Queue (Police/Admin)
router.get(
  '/',
  authenticate,
  authorize('POLICE', 'ADMIN', 'TOURISM_AUTHORITY'),
  emergencyController.getEmergencyQueue
);

// Single Emergency View
router.get('/:id', authenticate, emergencyController.getEmergencyById);

// Police Status Workflow Actions
router.put(
  '/:id/acknowledge',
  authenticate,
  authorize('POLICE', 'ADMIN'),
  emergencyController.acknowledgeEmergency
);
router.put(
  '/:id/assign',
  authenticate,
  authorize('POLICE', 'ADMIN'),
  emergencyController.assignResponder
);
router.put(
  '/:id/start',
  authenticate,
  authorize('POLICE', 'ADMIN'),
  emergencyController.startResponse
);
router.put(
  '/:id/resolve',
  authenticate,
  authorize('POLICE', 'ADMIN'),
  emergencyController.resolveEmergency
);

module.exports = router;
