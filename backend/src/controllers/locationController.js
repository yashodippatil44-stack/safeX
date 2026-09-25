const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { evaluateTouristZones } = require('../utils/geoFenceUtils');
const { getTrackingInterval } = require('../config/trackingConfig');

exports.updateLocation = async (req, res) => {
  try {
    const { touristId, latitude, longitude, accuracy = 10, speed = 0, timestamp } = req.body;

    // 1. Validation
    if (!touristId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: touristId, latitude, and longitude are required.'
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    const acc = Number(accuracy);
    const spd = Number(speed);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, error: 'Latitude must be a valid number between -90 and 90.' });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Longitude must be a valid number between -180 and 180.' });
    }

    // 2. Authorization check: Tourist can only update their own location
    if (req.user.role === 'TOURIST') {
      const callerProfile = req.touristProfile;
      if (!callerProfile || callerProfile.touristId !== touristId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Tourists are only authorized to update their own location coordinates.'
        });
      }
    }

    // 3. Verify tourist exists in database
    const touristsCol = db.collection('touristProfiles');
    const tourist = touristsCol.findOne(tp => tp.touristId === touristId);
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: `Tourist profile '${touristId}' not found.`
      });
    }

    const recordedAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // 4. Save Location History
    const locationRecord = db.collection('locations').insert({
      id: 'loc_' + uuidv4().slice(0, 8),
      touristId,
      latitude: lat,
      longitude: lon,
      accuracy: acc,
      speed: spd,
      timestamp: recordedAt,
      createdAt: new Date().toISOString()
    });

    // 5. Run Geo-Fence Breach Engine
    const geoFences = db.collection('geoFences').find(gf => gf.active !== false);
    const evaluation = evaluateTouristZones(lat, lon, geoFences);

    const currentZone = evaluation.activeZone;
    const currentZoneId = currentZone ? currentZone.id : null;
    const currentZoneName = currentZone ? currentZone.name : 'Open Unzoned Area';
    const previousZoneId = tourist.currentZoneId || null;

    let generatedNotification = null;

    // 6. State Transition Detection (Only create alert on state change)
    if (previousZoneId !== currentZoneId) {
      const notifsCol = db.collection('notifications');

      if (currentZone && !previousZoneId) {
        // GEOFENCE_ENTER
        const isHazard = currentZone.type === 'DANGER_ZONE' || currentZone.type === 'RESTRICTED_ZONE';
        generatedNotification = notifsCol.insert({
          id: 'notif_' + uuidv4().slice(0, 8),
          touristId,
          type: isHazard ? 'HIGH_RISK_AREA' : 'GEOFENCE_ENTER',
          title: isHazard ? '⚠️ High-Risk Zone Warning' : 'Safe Tourist Zone Active',
          message: isHazard
            ? `You have entered ${currentZone.name} (${currentZone.type}). Risk level is ${currentZone.riskLevel}. Please remain on designated safe trails.`
            : `You have entered ${currentZone.name}. Dedicated tourist safety telemetry is active.`,
          severity: isHazard ? 'HIGH' : 'INFO',
          geoFenceId: currentZone.id,
          read: false,
          createdAt: new Date().toISOString()
        });
      } else if (!currentZone && previousZoneId) {
        // GEOFENCE_EXIT
        const prevZone = geoFences.find(gf => gf.id === previousZoneId);
        const prevName = prevZone ? prevZone.name : 'previous zone';
        generatedNotification = notifsCol.insert({
          id: 'notif_' + uuidv4().slice(0, 8),
          touristId,
          type: 'GEOFENCE_EXIT',
          title: 'Zone Boundary Crossed',
          message: `You have departed ${prevName}. Entering open regional area.`,
          severity: 'INFO',
          geoFenceId: previousZoneId,
          read: false,
          createdAt: new Date().toISOString()
        });
      } else if (currentZone && previousZoneId && currentZone.id !== previousZoneId) {
        // Transition between two different zones
        const isHazard = currentZone.type === 'DANGER_ZONE' || currentZone.type === 'RESTRICTED_ZONE';
        generatedNotification = notifsCol.insert({
          id: 'notif_' + uuidv4().slice(0, 8),
          touristId,
          type: isHazard ? 'HIGH_RISK_AREA' : 'GEOFENCE_ENTER',
          title: isHazard ? '⚠️ Entered High-Risk Zone' : 'Zone Transition Notice',
          message: `You have crossed into ${currentZone.name} (${currentZone.type}). Risk tier: ${currentZone.riskLevel}.`,
          severity: isHazard ? 'HIGH' : 'INFO',
          geoFenceId: currentZone.id,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 7. Update Tourist Profile with live coordinates & safety status
    touristsCol.updateById(tourist.id, {
      currentLatitude: lat,
      currentLongitude: lon,
      currentAccuracy: acc,
      currentSpeed: spd,
      currentZoneId,
      currentZoneName,
      safetyStatus: evaluation.safetyStatus,
      currentRiskLevel: evaluation.riskLevel,
      lastActive: new Date().toISOString()
    });

    // 8. Record in safetyStatuses collection
    const safetyCol = db.collection('safetyStatuses');
    const existingSafety = safetyCol.findOne(s => s.touristId === touristId);
    const safetyPayload = {
      touristId,
      status: evaluation.safetyStatus,
      riskLevel: evaluation.riskLevel,
      zone: currentZone
        ? {
            id: currentZone.id,
            name: currentZone.name,
            type: currentZone.type,
            riskLevel: currentZone.riskLevel
          }
        : null,
      lastUpdated: new Date().toISOString()
    };

    if (existingSafety) {
      safetyCol.updateById(existingSafety.id, safetyPayload);
    } else {
      safetyCol.insert({
        id: 'ss_' + uuidv4().slice(0, 8),
        ...safetyPayload
      });
    }

    // 9. Calculate Recommended Battery-Saving Interval
    const recommendedInterval = getTrackingInterval(evaluation.safetyStatus, evaluation.riskLevel);

    return res.status(200).json({
      success: true,
      message: 'Location telemetry updated.',
      data: {
        location: locationRecord,
        safetyStatus: evaluation.safetyStatus,
        riskLevel: evaluation.riskLevel,
        currentZone: currentZone
          ? {
              id: currentZone.id,
              name: currentZone.name,
              type: currentZone.type,
              riskLevel: currentZone.riskLevel
            }
          : null,
        recommendedInterval,
        notification: generatedNotification
      }
    });
  } catch (err) {
    console.error('[LOCATION UPDATE ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCurrentLocation = (req, res) => {
  try {
    const { touristId } = req.params;
    const tourist = db.collection('touristProfiles').findOne(tp => tp.touristId === touristId);
    if (!tourist) {
      return res.status(404).json({ success: false, error: `Tourist '${touristId}' not found.` });
    }

    const latestLocation = db
      .collection('locations')
      .find(loc => loc.touristId === touristId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;

    const safety = db.collection('safetyStatuses').findOne(s => s.touristId === touristId) || {
      touristId,
      status: tourist.safetyStatus || 'SAFE',
      riskLevel: tourist.currentRiskLevel || 'LOW',
      zone: tourist.currentZoneName ? { name: tourist.currentZoneName } : null,
      lastUpdated: tourist.lastActive || new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: {
        touristId,
        touristName: tourist.name,
        latitude: tourist.currentLatitude,
        longitude: tourist.currentLongitude,
        accuracy: tourist.currentAccuracy || 10,
        speed: tourist.currentSpeed || 0,
        lastActive: tourist.lastActive,
        safetyStatus: tourist.safetyStatus,
        riskLevel: tourist.currentRiskLevel,
        currentZoneName: tourist.currentZoneName,
        latestLocationRecord: latestLocation,
        safetyRecord: safety
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLocationHistory = (req, res) => {
  try {
    const { touristId } = req.params;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 100;
    if (limit > 200) limit = 200; // Cap at 200 to prevent unbounded reads

    const history = db
      .collection('locations')
      .find(loc => loc.touristId === touristId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      count: history.length,
      limit,
      data: history
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTouristSafetyStatus = (req, res) => {
  try {
    let touristId = null;

    // If caller is tourist, default to own profile
    if (req.user.role === 'TOURIST' && req.touristProfile) {
      touristId = req.touristProfile.touristId;
    } else if (req.query.touristId) {
      touristId = req.query.touristId;
    } else {
      return res.status(400).json({ success: false, error: 'touristId query parameter required.' });
    }

    const tourist = db.collection('touristProfiles').findOne(tp => tp.touristId === touristId);
    if (!tourist) {
      return res.status(404).json({ success: false, error: `Tourist '${touristId}' not found.` });
    }

    const safetyRecord = db.collection('safetyStatuses').findOne(s => s.touristId === touristId);

    const response = {
      touristId,
      status: tourist.safetyStatus || 'SAFE',
      riskLevel: tourist.currentRiskLevel || 'LOW',
      zone: tourist.currentZoneId
        ? {
            id: tourist.currentZoneId,
            name: tourist.currentZoneName,
            type: tourist.currentZoneType || 'DESIGNATED_ZONE'
          }
        : null,
      lastUpdated: tourist.lastActive || new Date().toISOString()
    };

    if (safetyRecord && safetyRecord.zone) {
      response.zone = safetyRecord.zone;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
