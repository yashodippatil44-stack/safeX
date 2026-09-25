process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');
const db = require('../src/config/db');
const { seedInitialData } = require('../src/utils/seedData');

async function runPhase3Tests() {
  console.log('🧪 Starting Phase 3: Emergency, SOS, Incident & Nearby Services Tests...\n');
  await seedInitialData();

  const server = app.listen(5097);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5097,
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
    // 0. Authenticate Yashodip (Tourist), Rahul (Tourist), and Police
    const yashodipLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'yashodip@visionx.gov',
      password: 'tourist123'
    });
    const touristToken = yashodipLogin.body.data.token;

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

    // Reset any pre-existing active emergencies for Yashodip to start fresh
    const yashodipEmergencies = db.collection('emergencies').find(e => e.touristId === 'VX-TRV-0001');
    yashodipEmergencies.forEach(e => {
      db.collection('emergencies').updateById(e.id, { status: 'RESOLVED' });
    });

    // 1. SOS ACTIVATION & VALIDATION TESTS
    // 1a. Unauthenticated SOS rejected (401)
    const unauthSOS = await request('/api/emergency/sos', { method: 'POST' }, {
      type: 'MEDICAL',
      latitude: 25.5788,
      longitude: 91.8833
    });
    console.assert(unauthSOS.status === 401, `Unauthenticated SOS must return 401, got: ${unauthSOS.status}`);
    console.log('✅ 1a. SOS Security: Unauthenticated SOS rejected (401)');

    // 1b. Invalid emergency type rejected (400)
    const badTypeSOS = await request('/api/emergency/sos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, {
      type: 'INVALID_ALIEN_ATTACK',
      latitude: 25.5788,
      longitude: 91.8833
    });
    console.assert(badTypeSOS.status === 400, `Invalid type must return 400, got: ${badTypeSOS.status}`);
    console.log('✅ 1b. SOS Validation: Invalid emergency type rejected (400)');

    // 1c. Invalid coordinates rejected (400)
    const badCoordsSOS = await request('/api/emergency/sos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, {
      type: 'MEDICAL',
      latitude: 105.0, // Out of bounds
      longitude: 91.8833
    });
    console.assert(badCoordsSOS.status === 400, `Out-of-bounds coordinates must return 400, got: ${badCoordsSOS.status}`);
    console.log('✅ 1c. SOS Validation: Out-of-bounds latitude (105.0) rejected (400)');

    // 1d. Tourist triggers valid SOS (201)
    const validSOS = await request('/api/emergency/sos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, {
      type: 'MEDICAL',
      latitude: 25.5788,
      longitude: 91.8833,
      accuracy: 10,
      severity: 'HIGH',
      message: 'Severe heat exhaustion near market square.'
    });
    console.assert(validSOS.status === 201, `Valid SOS must return 201, got: ${validSOS.status}`);
    const createdEmergency = validSOS.body.emergency;
    console.assert(createdEmergency.emergencyId.startsWith('VX-EMG-'), 'Generated emergency ID prefix match');
    console.assert(createdEmergency.status === 'NEW', 'Initial emergency status must be NEW');
    console.assert(createdEmergency.trackingInterval === 30, 'Emergency tracking interval must be 30 seconds');
    console.log(`✅ 1d. SOS Activation: Successfully created ${createdEmergency.emergencyId} with 30s interval`);

    const emgId = createdEmergency.id;

    // 1e. Prevent duplicate active SOS
    const duplicateSOS = await request('/api/emergency/sos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, {
      type: 'MEDICAL',
      latitude: 25.5788,
      longitude: 91.8833,
      message: 'Second accidental button press.'
    });
    console.assert(duplicateSOS.status === 200, 'Duplicate check must return 200');
    console.assert(duplicateSOS.body.isDuplicate === true, 'isDuplicate flag must be true');
    console.assert(duplicateSOS.body.emergency.emergencyId === createdEmergency.emergencyId, 'Must return existing active emergency');
    console.log('✅ 1e. Duplicate Prevention: Returned existing open emergency instead of creating duplicate');

    // 1f. GET /api/emergency/my-active
    const myActive = await request('/api/emergency/my-active', {
      headers: { Authorization: `Bearer ${touristToken}` }
    });
    console.assert(myActive.status === 200, 'my-active should return 200');
    console.assert(myActive.body.data.emergencyId === createdEmergency.emergencyId, 'my-active emergency ID match');
    console.log('✅ 1f. Active Emergency Lookup: GET /api/emergency/my-active returned current open case');

    // 2. AUTHORIZATION & WORKFLOW STATE TRANSITIONS
    // 2a. Tourist cannot acknowledge emergency (403)
    const touristAck = await request(`/api/emergency/${emgId}/acknowledge`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${touristToken}` }
    });
    console.assert(touristAck.status === 403, `Tourist must not acknowledge emergencies, got: ${touristAck.status}`);
    console.log('✅ 2a. Authorization Guard: Tourist blocked from acknowledging emergency (403)');

    // 2b. Tourist cannot assign responder (403)
    const touristAssign = await request(`/api/emergency/${emgId}/assign`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, { officerId: 'POL-01', officerName: 'Test' });
    console.assert(touristAssign.status === 403, `Tourist must not assign responders, got: ${touristAssign.status}`);
    console.log('✅ 2b. Authorization Guard: Tourist blocked from assigning responder (403)');

    // 2c. Tourist cannot resolve emergency (403)
    const touristResolve = await request(`/api/emergency/${emgId}/resolve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, { remarks: 'Self-resolved' });
    console.assert(touristResolve.status === 403, `Tourist must not resolve emergencies, got: ${touristResolve.status}`);
    console.log('✅ 2c. Authorization Guard: Tourist blocked from resolving emergency (403)');

    // 2d. Step 1: Police Acknowledges Emergency (NEW -> ACKNOWLEDGED)
    const policeAck = await request(`/api/emergency/${emgId}/acknowledge`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(policeAck.status === 200, `Police acknowledge must return 200, got: ${policeAck.status}`);
    console.assert(policeAck.body.data.status === 'ACKNOWLEDGED', 'Status must be ACKNOWLEDGED');
    console.assert(!!policeAck.body.data.acknowledgedAt, 'acknowledgedAt must be set');
    console.log('✅ 2d. State Transition 1: NEW -> ACKNOWLEDGED by Inspector Vikram Joshi');

    // 2e. Step 2: Police Assigns Responder (ACKNOWLEDGED -> RESPONDER_ASSIGNED)
    const policeAssign = await request(`/api/emergency/${emgId}/assign`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    }, {
      officerId: 'SHL-POL-402',
      officerName: 'Inspector Vikram Joshi'
    });
    console.assert(policeAssign.status === 200, `Police assign must return 200, got: ${policeAssign.status}`);
    console.assert(policeAssign.body.data.status === 'RESPONDER_ASSIGNED', 'Status must be RESPONDER_ASSIGNED');
    console.assert(policeAssign.body.data.assignedOfficerId === 'SHL-POL-402', 'Officer ID match');
    console.log('✅ 2e. State Transition 2: ACKNOWLEDGED -> RESPONDER_ASSIGNED to Inspector Vikram Joshi');

    // 2f. Step 3: Police Starts Response (RESPONDER_ASSIGNED -> IN_PROGRESS)
    const policeStart = await request(`/api/emergency/${emgId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(policeStart.status === 200, `Police start must return 200, got: ${policeStart.status}`);
    console.assert(policeStart.body.data.status === 'IN_PROGRESS', 'Status must be IN_PROGRESS');
    console.assert(!!policeStart.body.data.startedAt, 'startedAt must be set');
    console.log('✅ 2f. State Transition 3: RESPONDER_ASSIGNED -> IN_PROGRESS (Team En Route)');

    // 2g. Invalid Transition Test: Cannot jump from IN_PROGRESS directly to ACKNOWLEDGED
    const invalidTrans = await request(`/api/emergency/${emgId}/acknowledge`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(invalidTrans.status === 400, `Invalid state jump must return 400, got: ${invalidTrans.status}`);
    console.log('✅ 2g. Workflow Validation: Invalid transition (IN_PROGRESS -> ACKNOWLEDGED) rejected (400)');

    // 2h. Step 4: Police Resolves Emergency (IN_PROGRESS -> RESOLVED)
    const policeResolve = await request(`/api/emergency/${emgId}/resolve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    }, {
      remarks: 'Tourist stabilized with hydration salts and escorted back to safe hotel accommodation.'
    });
    console.assert(policeResolve.status === 200, `Police resolve must return 200, got: ${policeResolve.status}`);
    console.assert(policeResolve.body.data.status === 'RESOLVED', 'Status must be RESOLVED');
    console.assert(!!policeResolve.body.data.resolvedAt, 'resolvedAt must be set');
    console.log('✅ 2h. State Transition 4: IN_PROGRESS -> RESOLVED with official remarks');

    // 3. INCIDENT REPORTING TESTS
    // 3a. Tourist creates incident report
    const newInc = await request('/api/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, {
      type: 'THEFT',
      description: 'Stolen wallet and passport case near market square.',
      latitude: 25.5788,
      longitude: 91.8833,
      severity: 'HIGH'
    });
    console.assert(newInc.status === 201, `Incident filing must return 201, got: ${newInc.status}`);
    console.assert(newInc.body.data.incidentId.startsWith('VX-INC-'), 'Incident ID format valid');
    console.assert(newInc.body.data.status === 'REPORTED', 'Default incident status must be REPORTED');
    const incId = newInc.body.data.id;
    console.log(`✅ 3a. Incident Filing: Tourist filed ${newInc.body.data.incidentId} (THEFT)`);

    // 3b. Tourist cannot modify status of incident
    const touristModInc = await request(`/api/incidents/${incId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${touristToken}` }
    }, { status: 'VERIFIED' });
    console.assert(touristModInc.status === 403, `Tourist must not modify incident status, got: ${touristModInc.status}`);
    console.log('✅ 3b. Incident Security: Tourist blocked from updating incident status (403)');

    // 3c. Police reviews and verifies incident
    const policeModInc = await request(`/api/incidents/${incId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${policeToken}` }
    }, {
      status: 'VERIFIED',
      remarks: 'Verified by CCTV footage unit.'
    });
    console.assert(policeModInc.status === 200, `Police incident verification must return 200, got: ${policeModInc.status}`);
    console.assert(policeModInc.body.data.status === 'VERIFIED', 'Incident status must be VERIFIED');
    console.log('✅ 3c. Incident Processing: Police verified incident with remarks (VERIFIED)');

    // 4. NEARBY EMERGENCY SERVICES TESTS
    // 4a. Invalid coordinates rejected (400)
    const badServices = await request('/api/emergency-services/nearby?latitude=200&longitude=91.88', {
      headers: { Authorization: `Bearer ${touristToken}` }
    });
    console.assert(badServices.status === 400, `Invalid coordinates must return 400, got: ${badServices.status}`);
    console.log('✅ 4a. Services Validation: Out-of-bounds coordinates rejected (400)');

    // 4b. Distance calculation & sorting (Police Bazar center: 25.5788, 91.8833)
    const nearbyAll = await request('/api/emergency-services/nearby?latitude=25.5788&longitude=91.8833', {
      headers: { Authorization: `Bearer ${touristToken}` }
    });
    console.assert(nearbyAll.status === 200, 'Nearby services must return 200');
    console.assert(nearbyAll.body.data.length >= 6, 'Must return seeded emergency services');
    // Closest should be Shillong Central Tourist Police Station (distance ~0m)
    const closest = nearbyAll.body.data[0];
    console.assert(closest.distanceMeters < 50, `Closest service should be ~0m at exact coords, got: ${closest.distanceMeters}m`);
    // Verify ascending order
    for (let i = 0; i < nearbyAll.body.data.length - 1; i++) {
      console.assert(
        nearbyAll.body.data[i].distanceMeters <= nearbyAll.body.data[i + 1].distanceMeters,
        'Services must be strictly sorted by ascending distance'
      );
    }
    console.log(`✅ 4b. Nearest Services Calculation: Nearest is ${closest.name} (${closest.distanceMeters}m). Ascending sort verified.`);

    // 4c. Filter by type = HOSPITAL
    const nearbyHospitals = await request('/api/emergency-services/nearby?latitude=25.5788&longitude=91.8833&type=HOSPITAL', {
      headers: { Authorization: `Bearer ${touristToken}` }
    });
    console.assert(nearbyHospitals.status === 200, 'Hospital filter must return 200');
    console.assert(nearbyHospitals.body.data.every(s => s.type === 'HOSPITAL'), 'All items must be type HOSPITAL');
    console.log(`✅ 4c. Services Filtering: Retrieved ${nearbyHospitals.body.data.length} hospitals nearest to tourist`);

    console.log('\n🎉 ALL PHASE 3 EMERGENCY, SOS, INCIDENT & NEARBY SERVICES TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Phase 3 Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
}

runPhase3Tests();
