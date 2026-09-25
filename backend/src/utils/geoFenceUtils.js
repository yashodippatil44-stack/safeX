/**
 * Geo-Fence Utilities & Haversine Distance Engine
 */

const EARTH_RADIUS_METERS = 6371000; // Mean radius of Earth

/**
 * Calculates Great-Circle Distance between two coordinates in meters using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // rounded to 2 decimal places
}

/**
 * Checks if a point is within a circular geo-fence
 * @param {number} touristLat 
 * @param {number} touristLon 
 * @param {number} fenceLat 
 * @param {number} fenceLon 
 * @param {number} radius - in meters
 * @returns {boolean}
 */
function isInsideGeoFence(touristLat, touristLon, fenceLat, fenceLon, radius) {
  const distance = calculateDistance(touristLat, touristLon, fenceLat, fenceLon);
  return distance <= radius;
}

/**
 * Priority map for zone types when multiple zones overlap
 */
const ZONE_PRIORITY = {
  DANGER_ZONE: 1,
  RESTRICTED_ZONE: 2,
  SAFE_ZONE: 3,
  TOURIST_ZONE: 4
};

/**
 * Evaluates tourist coordinates against all active geo-fences
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {Array} geoFences 
 * @returns {object} evaluation result
 */
function evaluateTouristZones(latitude, longitude, geoFences = []) {
  const evaluatedFences = geoFences
    .filter(gf => gf.active !== false)
    .map(fence => {
      const distance = calculateDistance(latitude, longitude, fence.latitude, fence.longitude);
      const isInside = distance <= fence.radius;
      return {
        ...fence,
        distance,
        isInside
      };
    });

  const insideFences = evaluatedFences
    .filter(f => f.isInside)
    .sort((a, b) => {
      const pA = ZONE_PRIORITY[a.type] || 99;
      const pB = ZONE_PRIORITY[b.type] || 99;
      return pA - pB;
    });

  let safetyStatus = 'SAFE';
  let riskLevel = 'LOW';
  let activeZone = null;

  if (insideFences.length > 0) {
    activeZone = insideFences[0];

    if (activeZone.type === 'DANGER_ZONE') {
      safetyStatus = activeZone.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH_RISK';
      riskLevel = activeZone.riskLevel || 'HIGH';
    } else if (activeZone.type === 'RESTRICTED_ZONE') {
      safetyStatus = activeZone.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH_RISK';
      riskLevel = activeZone.riskLevel || 'HIGH';
    } else if (activeZone.riskLevel === 'MEDIUM') {
      safetyStatus = 'CAUTION';
      riskLevel = 'MEDIUM';
    } else {
      safetyStatus = 'SAFE';
      riskLevel = 'LOW';
    }
  }

  // Find nearest fence distance
  const sortedByDistance = [...evaluatedFences].sort((a, b) => a.distance - b.distance);
  const nearestFence = sortedByDistance.length > 0 ? sortedByDistance[0] : null;

  return {
    insideFences,
    activeZone,
    nearestFence,
    safetyStatus,
    riskLevel
  };
}

module.exports = {
  calculateDistance,
  isInsideGeoFence,
  evaluateTouristZones,
  EARTH_RADIUS_METERS
};
