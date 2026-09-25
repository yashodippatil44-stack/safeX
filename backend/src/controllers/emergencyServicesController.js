const db = require('../config/db');
const { calculateDistance } = require('../utils/geoFenceUtils');
const { EMERGENCY_SERVICE_TYPES } = require('../config/emergencyConstants');

exports.getNearbyServices = (req, res) => {
  try {
    const { latitude, longitude, type, radius } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: latitude and longitude are required.'
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, error: 'Latitude must be a valid number between -90 and 90.' });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Longitude must be a valid number between -180 and 180.' });
    }

    if (type && !EMERGENCY_SERVICE_TYPES.includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid service type '${type}'. Must be one of: ${EMERGENCY_SERVICE_TYPES.join(', ')}`
      });
    }

    const servicesCol = db.collection('emergencyServices');
    let services = servicesCol.find(s => s.active !== false);

    if (type) {
      services = services.filter(s => s.type === type.toUpperCase());
    }

    // Calculate distance in meters using Haversine formula
    let results = services.map(srv => {
      const distanceMeters = calculateDistance(lat, lon, srv.latitude, srv.longitude);
      return {
        ...srv,
        distanceMeters
      };
    });

    // Optional radius filter
    if (radius && !isNaN(Number(radius))) {
      results = results.filter(srv => srv.distanceMeters <= Number(radius));
    }

    // Sort ascending by distance (nearest first)
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
