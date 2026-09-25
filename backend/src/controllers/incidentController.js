const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { INCIDENT_TYPES, INCIDENT_STATUSES } = require('../config/emergencyConstants');

function generateNextIncidentId() {
  const count = db.collection('incidents').count() + 1;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(6, '0');
  return `VX-INC-${year}-${padded}`;
}

// 1. Create Incident (Tourist)
exports.createIncident = (req, res) => {
  try {
    const { type, description, latitude, longitude, severity = 'MEDIUM', photos = [] } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: incident type and description are mandatory.'
      });
    }

    if (!INCIDENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid incident type '${type}'. Must be one of: ${INCIDENT_TYPES.join(', ')}`
      });
    }

    let lat = Number(latitude);
    let lon = Number(longitude);
    if (latitude === undefined || longitude === undefined || isNaN(lat) || isNaN(lon)) {
      // Default to tourist profile's last known coordinates if omitted
      if (req.touristProfile) {
        lat = req.touristProfile.currentLatitude || 25.5788;
        lon = req.touristProfile.currentLongitude || 91.8833;
      } else {
        return res.status(400).json({ success: false, error: 'Valid latitude and longitude coordinates required.' });
      }
    }

    const touristProfile = req.touristProfile;
    const touristId = touristProfile ? touristProfile.touristId : (req.body.touristId || 'VX-TRV-ANON');
    const touristName = touristProfile ? touristProfile.name : req.user.name;

    const incidentId = generateNextIncidentId();
    const newIncident = db.collection('incidents').insert({
      id: 'inc_' + uuidv4().slice(0, 8),
      incidentId,
      touristId,
      touristName,
      type,
      description: description.trim(),
      latitude: lat,
      longitude: lon,
      severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity) ? severity : 'MEDIUM',
      status: 'REPORTED',
      photos: Array.isArray(photos) ? photos : [],
      authorityRemarks: '',
      verifiedBy: null,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: 'Incident report submitted successfully.',
      data: newIncident
    });
  } catch (err) {
    console.error('[CREATE INCIDENT ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get Incidents List
exports.getIncidents = (req, res) => {
  try {
    const { status, type, touristId } = req.query;
    let list = db.collection('incidents').find();

    // If tourist, only allow viewing their own
    if (req.user.role === 'TOURIST') {
      const myId = req.touristProfile ? req.touristProfile.touristId : null;
      list = list.filter(inc => inc.touristId === myId);
    } else if (touristId) {
      list = list.filter(inc => inc.touristId === touristId);
    }

    if (status) {
      list = list.filter(inc => inc.status === status);
    }
    if (type) {
      list = list.filter(inc => inc.type === type);
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

// 3. Get Single Incident
exports.getIncidentById = (req, res) => {
  try {
    const { id } = req.params;
    const incident = db.collection('incidents').findOne(inc => inc.id === id || inc.incidentId === id);

    if (!incident) {
      return res.status(404).json({ success: false, error: `Incident '${id}' not found.` });
    }

    if (req.user.role === 'TOURIST') {
      if (!req.touristProfile || req.touristProfile.touristId !== incident.touristId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own incident reports.' });
      }
    }

    return res.status(200).json({ success: true, data: incident });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Update Incident Status (Police/Admin)
exports.updateIncidentStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks = '' } = req.body;

    if (!status || !INCIDENT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${INCIDENT_STATUSES.join(', ')}`
      });
    }

    const incidentsCol = db.collection('incidents');
    const incident = incidentsCol.findOne(inc => inc.id === id || inc.incidentId === id);

    if (!incident) {
      return res.status(404).json({ success: false, error: `Incident '${id}' not found.` });
    }

    const updates = {
      status,
      authorityRemarks: remarks ? String(remarks).trim() : incident.authorityRemarks,
      updatedAt: new Date().toISOString()
    };

    if (status === 'VERIFIED') {
      updates.verifiedBy = req.user.name;
      updates.verifiedAt = new Date().toISOString();
    }

    const updated = incidentsCol.updateById(incident.id, updates);

    return res.status(200).json({
      success: true,
      message: `Incident status updated to '${status}'.`,
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
