const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const {
  EMERGENCY_TYPES,
  EMERGENCY_SEVERITIES,
  ACTIVE_EMERGENCY_STATUSES,
  VALID_EMERGENCY_TRANSITIONS
} = require('../config/emergencyConstants');

function generateNextEmergencyId() {
  const count = db.collection('emergencies').count() + 1;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(6, '0');
  return `VX-EMG-${year}-${padded}`;
}

// 1. Trigger SOS (Tourist)
exports.triggerSOS = (req, res) => {
  try {
    const { type, latitude, longitude, accuracy = 10, message = '', severity = 'HIGH' } = req.body;

    if (!type || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: type, latitude, and longitude are required.'
      });
    }

    if (!EMERGENCY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid emergency type '${type}'. Must be one of: ${EMERGENCY_TYPES.join(', ')}`
      });
    }

    if (!EMERGENCY_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity '${severity}'. Must be one of: ${EMERGENCY_SEVERITIES.join(', ')}`
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, error: 'Latitude must be between -90 and 90.' });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Longitude must be between -180 and 180.' });
    }

    const touristProfile = req.touristProfile;
    if (!touristProfile) {
      return res.status(403).json({
        success: false,
        error: 'Only registered tourists with an active tourist profile can activate SOS.'
      });
    }

    const touristId = touristProfile.touristId;
    const emergenciesCol = db.collection('emergencies');

    // 2. Prevent Duplicate Active Emergencies
    const existingActive = emergenciesCol.findOne(
      e => e.touristId === touristId && ACTIVE_EMERGENCY_STATUSES.includes(e.status)
    );

    if (existingActive) {
      return res.status(200).json({
        success: true,
        message: 'Active emergency dispatch is already open for this tourist.',
        isDuplicate: true,
        emergency: {
          ...existingActive,
          trackingInterval: 30
        }
      });
    }

    // 3. Create Unique Emergency Record
    const emergencyId = generateNextEmergencyId();
    const newEmergency = emergenciesCol.insert({
      id: 'emg_' + uuidv4().slice(0, 8),
      emergencyId,
      touristId,
      touristName: touristProfile.name,
      type,
      latitude: lat,
      longitude: lon,
      accuracy: Number(accuracy) || 10,
      severity,
      status: 'NEW',
      assignedOfficerId: null,
      assignedOfficerName: null,
      touristMessage: message ? String(message).trim() : '',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      assignedAt: null,
      startedAt: null,
      resolvedAt: null,
      resolutionRemarks: null,
      updatedAt: new Date().toISOString()
    });

    // 4. Update Tourist Profile & Safety status to CRITICAL with 30s interval
    db.collection('touristProfiles').updateById(touristProfile.id, {
      currentLatitude: lat,
      currentLongitude: lon,
      safetyStatus: 'CRITICAL',
      currentRiskLevel: 'CRITICAL',
      lastActive: new Date().toISOString()
    });

    // 5. Store current location record
    db.collection('locations').insert({
      id: 'loc_' + uuidv4().slice(0, 8),
      touristId,
      latitude: lat,
      longitude: lon,
      accuracy: Number(accuracy) || 10,
      speed: 0,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    // 6. Broadcast notification to police
    db.collection('notifications').insert({
      id: 'notif_' + uuidv4().slice(0, 8),
      touristId,
      type: 'EMERGENCY_CREATED',
      title: '🚨 CRITICAL SOS ACTIVATION',
      message: `Tourist ${touristProfile.name} (${touristId}) triggered ${type} emergency at (${lat.toFixed(4)}, ${lon.toFixed(4)}).`,
      severity: 'CRITICAL',
      geoFenceId: null,
      read: false,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS registered. Dedicated rapid responders notified.',
      emergency: {
        ...newEmergency,
        trackingInterval: 30
      }
    });
  } catch (err) {
    console.error('[SOS TRIGGER ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Cancel SOS (Tourist)
exports.cancelSOS = (req, res) => {
  try {
    const { id } = req.params;
    const emergenciesCol = db.collection('emergencies');
    const emergency = emergenciesCol.findOne(e => e.id === id || e.emergencyId === id);

    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    // Only creator tourist or authority can cancel
    if (req.user.role === 'TOURIST') {
      if (!req.touristProfile || req.touristProfile.touristId !== emergency.touristId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only cancel your own emergency.' });
      }
    }

    if (emergency.status === 'RESOLVED') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an emergency that has already been resolved.' });
    }
    if (emergency.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Emergency is already cancelled.' });
    }

    const updated = emergenciesCol.updateById(emergency.id, {
      status: 'CANCELLED',
      resolutionRemarks: 'Cancelled by tourist.'
    });

    // Reset tourist safety status
    const tourist = db.collection('touristProfiles').findOne(tp => tp.touristId === emergency.touristId);
    if (tourist) {
      db.collection('touristProfiles').updateById(tourist.id, {
        safetyStatus: 'SAFE',
        currentRiskLevel: 'LOW'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency cancelled successfully.',
      emergency: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Get Single Emergency Details
exports.getEmergencyById = (req, res) => {
  try {
    const { id } = req.params;
    const emergency = db.collection('emergencies').findOne(e => e.id === id || e.emergencyId === id);
    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    // If tourist, can only see own
    if (req.user.role === 'TOURIST') {
      if (!req.touristProfile || req.touristProfile.touristId !== emergency.touristId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own emergency cases.' });
      }
    }

    return res.status(200).json({ success: true, data: emergency });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Get Current Tourist's Active Emergency
exports.getMyActiveEmergency = (req, res) => {
  try {
    if (!req.touristProfile) {
      return res.status(200).json({ success: true, data: null });
    }

    const touristId = req.touristProfile.touristId;
    const active = db
      .collection('emergencies')
      .findOne(e => e.touristId === touristId && ACTIVE_EMERGENCY_STATUSES.includes(e.status));

    return res.status(200).json({
      success: true,
      data: active || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Police Emergency Queue
exports.getEmergencyQueue = (req, res) => {
  try {
    const { status, severity, type } = req.query;
    let list = db.collection('emergencies').find();

    if (status) {
      list = list.filter(e => e.status === status);
    }
    if (severity) {
      list = list.filter(e => e.severity === severity);
    }
    if (type) {
      list = list.filter(e => e.type === type);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 6. Police Acknowledge Emergency
exports.acknowledgeEmergency = (req, res) => {
  try {
    const { id } = req.params;
    const emergenciesCol = db.collection('emergencies');
    const emergency = emergenciesCol.findOne(e => e.id === id || e.emergencyId === id);

    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    // Validate state transition
    const allowed = VALID_EMERGENCY_TRANSITIONS[emergency.status] || [];
    if (!allowed.includes('ACKNOWLEDGED')) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from '${emergency.status}' to 'ACKNOWLEDGED'.`
      });
    }

    const updated = emergenciesCol.updateById(emergency.id, {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Emergency case acknowledged by police dispatch.',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 7. Police Assign Responder
exports.assignResponder = (req, res) => {
  try {
    const { id } = req.params;
    const { officerId = 'SHL-POL-402', officerName = 'Inspector Vikram Joshi' } = req.body;

    const emergenciesCol = db.collection('emergencies');
    const emergency = emergenciesCol.findOne(e => e.id === id || e.emergencyId === id);

    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    // Validate state transition
    const allowed = VALID_EMERGENCY_TRANSITIONS[emergency.status] || [];
    if (!allowed.includes('RESPONDER_ASSIGNED') && emergency.status !== 'NEW') {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from '${emergency.status}' to 'RESPONDER_ASSIGNED'.`
      });
    }

    const updated = emergenciesCol.updateById(emergency.id, {
      status: 'RESPONDER_ASSIGNED',
      assignedOfficerId: officerId,
      assignedOfficerName: officerName,
      assignedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Emergency assigned to ${officerName} (${officerId}).`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 8. Start Response
exports.startResponse = (req, res) => {
  try {
    const { id } = req.params;
    const emergenciesCol = db.collection('emergencies');
    const emergency = emergenciesCol.findOne(e => e.id === id || e.emergencyId === id);

    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    const allowed = VALID_EMERGENCY_TRANSITIONS[emergency.status] || [];
    if (!allowed.includes('IN_PROGRESS')) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from '${emergency.status}' to 'IN_PROGRESS'.`
      });
    }

    const updated = emergenciesCol.updateById(emergency.id, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Quick response team is en route to tourist coordinates.',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 9. Resolve Emergency
exports.resolveEmergency = (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = 'Incident resolved and tourist safety ensured.' } = req.body;

    const emergenciesCol = db.collection('emergencies');
    const emergency = emergenciesCol.findOne(e => e.id === id || e.emergencyId === id);

    if (!emergency) {
      return res.status(404).json({ success: false, error: `Emergency '${id}' not found.` });
    }

    const allowed = VALID_EMERGENCY_TRANSITIONS[emergency.status] || [];
    if (!allowed.includes('RESOLVED')) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from '${emergency.status}' to 'RESOLVED'.`
      });
    }

    const updated = emergenciesCol.updateById(emergency.id, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolutionRemarks: remarks.trim()
    });

    // Reset tourist safety status to SAFE
    const tourist = db.collection('touristProfiles').findOne(tp => tp.touristId === emergency.touristId);
    if (tourist) {
      db.collection('touristProfiles').updateById(tourist.id, {
        safetyStatus: 'SAFE',
        currentRiskLevel: 'LOW'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency case resolved.',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
