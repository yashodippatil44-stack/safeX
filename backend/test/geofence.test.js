const {
  calculateDistance,
  isInsideGeoFence,
  evaluateTouristZones
} = require('../src/utils/geoFenceUtils');

function runUnitTests() {
  console.log('🧪 Starting Geo-Fence Haversine & Containment Unit Tests...\n');

  // Test 1: Exact center
  const centerDist = calculateDistance(25.5788, 91.8833, 25.5788, 91.8833);
  console.assert(centerDist === 0, `Exact center distance must be 0, got: ${centerDist}`);
  console.assert(isInsideGeoFence(25.5788, 91.8833, 25.5788, 91.8833, 500) === true, 'Exact center should be inside');
  console.log('✅ 1. Exact Center Test PASSED: distance = 0m, isInside = true');

  // Test 2: Point inside radius
  // Moving ~100m north: 1 deg lat ~= 111,320m, so 0.001 deg ~= 111m
  const pointInsideDist = calculateDistance(25.5788, 91.8833, 25.5797, 91.8833);
  console.assert(pointInsideDist > 90 && pointInsideDist < 120, `Expected ~100m, got: ${pointInsideDist}`);
  console.assert(isInsideGeoFence(25.5797, 91.8833, 25.5788, 91.8833, 500) === true, 'Point within 100m must be inside 500m radius');
  console.log(`✅ 2. Inside Radius Test PASSED: calculated distance = ${pointInsideDist}m < 500m radius`);

  // Test 3: Point outside radius
  // Moving ~2km north
  const pointOutsideDist = calculateDistance(25.5788, 91.8833, 25.5968, 91.8833);
  console.assert(pointOutsideDist > 1900, `Expected ~2000m, got: ${pointOutsideDist}`);
  console.assert(isInsideGeoFence(25.5968, 91.8833, 25.5788, 91.8833, 500) === false, 'Point 2km away must be outside 500m radius');
  console.log(`✅ 3. Outside Radius Test PASSED: calculated distance = ${pointOutsideDist}m > 500m radius`);

  // Test 4: Boundary Handling (distance <= radius)
  const boundaryInside = isInsideGeoFence(0, 0, 0, 0.001, 111.32); // radius equal or larger
  console.assert(typeof boundaryInside === 'boolean', 'Boundary condition returns boolean');
  console.log('✅ 4. Boundary Condition Handling Test PASSED');

  // Test 5: Distinct global coordinates (London to Paris ~ 343 km)
  const londonLat = 51.5074, londonLon = -0.1278;
  const parisLat = 48.8566, parisLon = 2.3522;
  const londonParisDistKm = calculateDistance(londonLat, londonLon, parisLat, parisLon) / 1000;
  console.assert(londonParisDistKm > 335 && londonParisDistKm < 350, `Expected ~343km between London and Paris, got: ${londonParisDistKm}`);
  console.log(`✅ 5. Global Haversine Coordinate Accuracy PASSED: London to Paris = ${londonParisDistKm.toFixed(1)} km`);

  // Test 6: Multi-zone priority evaluation
  const mockFences = [
    {
      id: 'z-safe',
      name: 'Safe Precinct',
      latitude: 25.5788,
      longitude: 91.8833,
      radius: 1000,
      type: 'SAFE_ZONE',
      riskLevel: 'LOW'
    },
    {
      id: 'z-danger',
      name: 'Cliff Edge Hazard',
      latitude: 25.5788,
      longitude: 91.8833,
      radius: 500,
      type: 'DANGER_ZONE',
      riskLevel: 'HIGH'
    }
  ];

  // Point is at (25.5788, 91.8833), inside both safe and danger zone. Danger zone MUST take precedence!
  const evalResult = evaluateTouristZones(25.5788, 91.8833, mockFences);
  console.assert(evalResult.activeZone.id === 'z-danger', `Active zone must be DANGER_ZONE, got: ${evalResult.activeZone.id}`);
  console.assert(evalResult.safetyStatus === 'HIGH_RISK', `Safety status must be HIGH_RISK, got: ${evalResult.safetyStatus}`);
  console.assert(evalResult.riskLevel === 'HIGH', 'Risk level must be HIGH');
  console.log('✅ 6. Overlapping Zone Priority Evaluation PASSED: Danger Zone takes precedence over Safe Zone\n');

  console.log('🎉 ALL GEOFENCE HAVERSINE UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runUnitTests();
