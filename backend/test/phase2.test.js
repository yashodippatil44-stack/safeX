process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');
const db = require('../src/config/db');
const { seedInitialData } = require('../src/utils/seedData');

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2: Location, Geo-Fencing, Safety & Notification Tests...\n');
  await seedInitialData();

  const server = app.listen(5098);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5098,
          path,
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 0. Authenticate Yashodip (VX-TRV-0001) and Rahul (VX-TRV-0002) and Police
    const yashodipLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'yashodip@visionx.gov',
      password: 'tourist123'
    });
    const yashodipToken = yashodipLogin.body.data.token;

    const rahulLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'rahul@visionx.gov',
      password: 'tourist123'
    });
    const rahulToken = rahulLogin.body.data.token;

    const policeLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'control@police.visionx.gov',
      password: 'police123'
    });
    const policeToken = policeLogin.body.data.token;

    // Reset tourist zone state for clean test run
    const yashodipProfile = db.collection('touristProfiles').findOne(tp => tp.touristId === 'VX-TRV-0001');
    db.collection('touristProfiles').updateById(yashodipProfile.id, {
      currentZoneId: null,
      currentZoneName: null,
      safetyStatus: 'SAFE'
    });

    // 1. LOCATION SECURITY TESTS
    // 1a. Unauthenticated update rejected
    const unauthUpdate = await request('/api/location/update', { method: 'POST' }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.5788,
      longitude: 91.8833
    });
    console.assert(unauthUpdate.status === 401, `Unauthenticated update must return 401, got: ${unauthUpdate.status}`);
    console.log('✅ 1a. Location Security: Unauthenticated location update rejected (401)');

    // 1b. Tourist cannot update another tourist's location
    const crossUpdate = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0002', // Rahul's ID
      latitude: 25.5788,
      longitude: 91.8833
    });
    console.assert(crossUpdate.status === 403, `Cross-tourist update must return 403, got: ${crossUpdate.status}`);
    console.log('✅ 1b. Location Security: Tourist prevented from updating another tourist’s coordinates (403)');

    // 1c. Invalid latitude rejected
    const badLat = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 195.5,
      longitude: 91.8833
    });
    console.assert(badLat.status === 400, `Invalid lat must return 400, got: ${badLat.status}`);
    console.log('✅ 1c. Location Validation: Out-of-bounds latitude (195.5) rejected (400)');

    // 1d. Invalid longitude rejected
    const badLon = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.5,
      longitude: -210.5
    });
    console.assert(badLon.status === 400, `Invalid lon must return 400, got: ${badLon.status}`);
    console.log('✅ 1d. Location Validation: Out-of-bounds longitude (-210.5) rejected (400)');

    // 2. GEO-FENCE CRUD & ROLE TESTS
    // 2a. Tourist cannot create geo-fence (403)
    const touristAddGf = await request('/api/geofences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      name: 'Unauthorized Fence',
      latitude: 25.5,
      longitude: 91.8,
      radius: 500,
      type: 'SAFE_ZONE'
    });
    console.assert(touristAddGf.status === 403, `Tourist must not create geo-fences, got: ${touristAddGf.status}`);
    console.log('✅ 2a. Geo-Fence Authorization: Tourist denied fence creation (403)');

    // 2b. Police can create geo-fence (201)
    const policeAddGf = await request('/api/geofences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${policeToken}` }
    }, {
      name: 'Police Checkpoint Zone',
      latitude: 25.5700,
      longitude: 91.8800,
      radius: 400,
      type: 'SAFE_ZONE',
      riskLevel: 'LOW',
      description: 'Temporary tourist safety checkpoint'
    });
    console.assert(policeAddGf.status === 201, `Police must be able to create geo-fences, got: ${policeAddGf.status}`);
    const createdFenceId = policeAddGf.body.data.id;
    console.log('✅ 2b. Geo-Fence Authorization: Police officer created geo-fence (201)');

    // 2c. Public read geofences (200)
    const listGf = await request('/api/geofences', {
      headers: { Authorization: `Bearer ${yashodipToken}` }
    });
    console.assert(listGf.status === 200, 'Tourist can read active geo-fences');
    console.assert(listGf.body.data.length >= 4, 'Must return seeded geo-fences');
    console.log(`✅ 2c. Geo-Fence Listing: Retrieved ${listGf.body.data.length} active geo-fences`);

    // Clean up created fence
    await request(`/api/geofences/${createdFenceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${policeToken}` }
    });

    // 3. GEO-FENCE BREACH & STATE TRANSITION ENGINE
    // Step A: Tourist is at Safe Tourist Area (25.5788, 91.8833, inside gf_001 SAFE_ZONE)
    const updateSafe = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.5788,
      longitude: 91.8833,
      accuracy: 8,
      speed: 1.2
    });
    console.assert(updateSafe.status === 200, 'Safe update should succeed');
    console.assert(updateSafe.body.data.safetyStatus === 'SAFE', `Safety status must be SAFE, got: ${updateSafe.body.data.safetyStatus}`);
    console.assert(updateSafe.body.data.recommendedInterval.tier === 'NORMAL', 'Interval must be NORMAL (5 min)');
    console.assert(updateSafe.body.data.recommendedInterval.seconds === 300, 'Normal interval must be 300s');
    console.assert(!!updateSafe.body.data.notification, 'Must generate GEOFENCE_ENTER notification on initial zone entry');
    console.log('✅ 3a. Safe Zone Breach Engine: Positioned in Safe Tourist Area -> Status SAFE, 300s tracking interval');

    // Step B: Repeated update inside the SAME safe zone must NOT create duplicate notification!
    const updateSameSafe = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.5789, // slight step ~11m away, still inside safe zone
      longitude: 91.8834,
      accuracy: 6,
      speed: 0.8
    });
    console.assert(updateSameSafe.status === 200, 'Repeated update must succeed');
    console.assert(updateSameSafe.body.data.notification === null, 'Repeated update in SAME zone must NOT generate duplicate notification');
    console.log('✅ 3b. Anti-Spam Notification Check: Repeated pings inside same zone generated ZERO duplicate alerts');

    // Step C: Tourist moves into DANGER ZONE (High Risk Trail / Sohra Ravine: 25.2750, 91.7180)
    const updateDanger = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.2750,
      longitude: 91.7180,
      accuracy: 12,
      speed: 2.5
    });
    console.assert(updateDanger.status === 200, 'Danger update should succeed');
    console.assert(updateDanger.body.data.safetyStatus === 'HIGH_RISK', `Safety status must be HIGH_RISK, got: ${updateDanger.body.data.safetyStatus}`);
    console.assert(updateDanger.body.data.recommendedInterval.tier === 'HIGH', 'Tracking interval must accelerate to HIGH (30s)');
    console.assert(updateDanger.body.data.recommendedInterval.seconds === 30, 'High risk interval must be 30s');
    console.assert(!!updateDanger.body.data.notification, 'Must generate HIGH_RISK alert on entry');
    console.assert(updateDanger.body.data.notification.severity === 'HIGH', 'Notification severity must be HIGH');
    console.log('✅ 3c. Danger Zone Breach Engine: Entering High Risk Trail triggered HIGH_RISK status & 30s emergency tracking interval');

    // Step D: Tourist leaves danger zone into open unzoned territory (25.3500, 91.8000)
    const updateExit = await request('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yashodipToken}` }
    }, {
      touristId: 'VX-TRV-0001',
      latitude: 25.3500,
      longitude: 91.8000,
      accuracy: 10
    });
    console.assert(updateExit.status === 200, 'Exit update should succeed');
    console.assert(updateExit.body.data.currentZone === null, 'Tourist should now be outside all zones');
    console.assert(!!updateExit.body.data.notification, 'Must generate GEOFENCE_EXIT notification');
    console.assert(updateExit.body.data.notification.type === 'GEOFENCE_EXIT', 'Notification type must be GEOFENCE_EXIT');
    console.log('✅ 3d. Geo-Fence Exit Event: Departing hazard zone triggered GEOFENCE_EXIT event');

    // 4. ENDPOINT VERIFICATIONS
    // 4a. GET /api/tourist/safety-status
    const safetyRes = await request('/api/tourist/safety-status', {
      headers: { Authorization: `Bearer ${yashodipToken}` }
    });
    console.assert(safetyRes.status === 200, 'Safety status endpoint must return 200');
    console.assert(safetyRes.body.touristId === 'VX-TRV-0001', 'Safety status tourist ID match');
    console.log('✅ 4a. Safety Status Endpoint: GET /api/tourist/safety-status returned current tourist status');

    // 4b. GET /api/location/history/:touristId
    const historyRes = await request('/api/location/history/VX-TRV-0001?limit=5', {
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(historyRes.status === 200, 'History endpoint must return 200');
    console.assert(historyRes.body.data.length >= 3, 'Must return recorded location trail');
    console.log(`✅ 4b. Location History: Retrieved ${historyRes.body.data.length} recent trail points for VX-TRV-0001`);

    // 4c. GET /api/location/fleet
    const fleetRes = await request('/api/location/fleet', {
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(fleetRes.status === 200, 'Fleet endpoint must return 200');
    console.assert(fleetRes.body.data.length >= 3, 'Fleet must return all active tourists');
    console.log(`✅ 4c. Fleet Telemetry: Police retrieved live coordinates for ${fleetRes.body.data.length} tourists on grid`);

    console.log('\n🎉 ALL PHASE 2 LOCATION, GEOFENCE, SAFETY & NOTIFICATION TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Phase 2 Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
}

runPhase2Tests();
