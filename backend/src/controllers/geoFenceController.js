const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const VALID_TYPES = ['SAFE_ZONE', 'DANGER_ZONE', 'RESTRICTED_ZONE', 'TOURIST_ZONE'];
const VALID_RISKS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

exports.getAllGeoFences = (req, res) => {
  try {
    const geoFencesCol = db.collection('geoFences');
    // Support ?active=true filter
    const { active } = req.query;
    let fences = geoFencesCol.find();
    if (active !== undefined) {
      const isActive = active === 'true';
      fences = fences.filter(f => f.active === isActive || (isActive && f.active === undefined));
    }
    return res.status(200).json({
      success: true,
      count: fences.length,
      data: fences
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getGeoFenceById = (req, res) => {
  try {
    const { id } = req.params;
    const fence = db.collection('geoFences').findById(id);
    if (!fence) {
      return res.status(404).json({ success: false, error: `Geo-fence with ID '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: fence });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.createGeoFence = (req, res) => {
  try {
    const { name, latitude, longitude, radius, type, riskLevel = 'LOW', description = '', active = true } = req.body;

    if (!name || latitude === undefined || longitude === undefined || radius === undefined || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, latitude, longitude, radius, and type are mandatory.'
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    const rad = Number(radius);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, error: 'Latitude must be a valid number between -90 and 90.' });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Longitude must be a valid number between -180 and 180.' });
    }
    if (isNaN(rad) || rad <= 0) {
      return res.status(400).json({ success: false, error: 'Radius must be a positive number in meters.' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid zone type '${type}'. Must be one of: ${VALID_TYPES.join(', ')}`
      });
    }
    if (!VALID_RISKS.includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid risk level '${riskLevel}'. Must be one of: ${VALID_RISKS.join(', ')}`
      });
    }

    const newFence = db.collection('geoFences').insert({
      id: 'gf_' + uuidv4().slice(0, 8),
      name: name.trim(),
      latitude: lat,
      longitude: lon,
      radius: rad,
      type,
      riskLevel,
      description: description.trim(),
      active: active !== false,
      createdBy: req.user.email
    });

    return res.status(201).json({
      success: true,
      message: 'Geo-fence created successfully.',
      data: newFence
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateGeoFence = (req, res) => {
  try {
    const { id } = req.params;
    const fence = db.collection('geoFences').findById(id);
    if (!fence) {
      return res.status(404).json({ success: false, error: `Geo-fence with ID '${id}' not found.` });
    }

    const updates = {};
    const { name, latitude, longitude, radius, type, riskLevel, description, active } = req.body;

    if (name !== undefined) updates.name = name.trim();
    if (latitude !== undefined) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ success: false, error: 'Latitude must be between -90 and 90.' });
      }
      updates.latitude = lat;
    }
    if (longitude !== undefined) {
      const lon = Number(longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return res.status(400).json({ success: false, error: 'Longitude must be between -180 and 180.' });
      }
      updates.longitude = lon;
    }
    if (radius !== undefined) {
      const rad = Number(radius);
      if (isNaN(rad) || rad <= 0) {
        return res.status(400).json({ success: false, error: 'Radius must be a positive number.' });
      }
      updates.radius = rad;
    }
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
      }
      updates.type = type;
    }
    if (riskLevel !== undefined) {
      if (!VALID_RISKS.includes(riskLevel)) {
        return res.status(400).json({ success: false, error: `Risk level must be one of: ${VALID_RISKS.join(', ')}` });
      }
      updates.riskLevel = riskLevel;
    }
    if (description !== undefined) updates.description = description.trim();
    if (active !== undefined) updates.active = Boolean(active);

    const updated = db.collection('geoFences').updateById(id, updates);
    return res.status(200).json({
      success: true,
      message: 'Geo-fence updated successfully.',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteGeoFence = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.collection('geoFences').deleteById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: `Geo-fence with ID '${id}' not found.` });
    }
    return res.status(200).json({
      success: true,
      message: `Geo-fence '${id}' deleted successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
