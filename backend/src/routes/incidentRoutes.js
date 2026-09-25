const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, incidentController.createIncident);
router.get('/', authenticate, incidentController.getIncidents);
router.get('/:id', authenticate, incidentController.getIncidentById);

router.put(
  '/:id/status',
  authenticate,
  authorize('POLICE', 'ADMIN'),
  incidentController.updateIncidentStatus
);

module.exports = router;
