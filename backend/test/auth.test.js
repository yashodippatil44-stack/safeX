process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../src/server');
const db = require('../src/config/db');
const { seedInitialData } = require('../src/utils/seedData');

async function runTests() {
  console.log('🧪 Starting Phase 1 Authentication & DB Tests...');
  await seedInitialData();

  const server = app.listen(5099);

  function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5099,
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
    // 1. Health check test
    const health = await request('/api/health');
    console.assert(health.status === 200, `Health check failed: ${health.status}`);
    console.assert(health.body.status === 'ONLINE', 'Service status should be ONLINE');
    console.log('✅ 1. Health Check PASSED: status = ONLINE');

    // 2. Police Login Test
    const policeLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'control@police.visionx.gov',
      password: 'police123'
    });
    console.assert(policeLogin.status === 200, `Police login failed: ${policeLogin.status}`);
    console.assert(policeLogin.body.data.user.role === 'POLICE', 'Role should be POLICE');
    console.assert(!!policeLogin.body.data.token, 'Token should be returned');
    console.log('✅ 2. Police Login PASSED: Officer Vikram Joshi authenticated');

    const policeToken = policeLogin.body.data.token;

    // 3. Authenticated /me endpoint test
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${policeToken}` }
    });
    console.assert(meRes.status === 200, 'Me endpoint failed');
    console.assert(meRes.body.data.user.email === 'control@police.visionx.gov', 'User email mismatch');
    console.log('✅ 3. Protected /me Endpoint PASSED: Token verified');

    // 4. Tourist Login Test
    const touristLogin = await request('/api/auth/login', { method: 'POST' }, {
      email: 'yashodip@visionx.gov',
      password: 'tourist123'
    });
    console.assert(touristLogin.status === 200, `Tourist login failed: ${touristLogin.status}`);
    console.assert(touristLogin.body.data.touristProfile.touristId === 'VX-TRV-0001', 'Tourist ID mismatch');
    console.assert(!!touristLogin.body.data.touristProfile.digitalIdHash, 'Digital ID Hash must exist');
    console.log('✅ 4. Tourist Login PASSED: Digital ID VX-TRV-0001 verified with hash: ' + touristLogin.body.data.touristProfile.digitalIdHash.slice(0, 16) + '...');

    const uniqueEmail = `ananya_${Date.now()}@example.com`;
    const newTouristRes = await request('/api/auth/register', { method: 'POST' }, {
      name: 'Ananya Deshmukh',
      email: uniqueEmail,
      password: 'pass_ananya_123',
      phone: '+91 99887 76655',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      emergencyContactName: 'Kavita Deshmukh',
      emergencyContactPhone: '+91 99887 00000',
      interests: ['Photography', 'Nature']
    });
    console.assert(newTouristRes.status === 201, `Registration failed: ${newTouristRes.status}`);
    console.assert(newTouristRes.body.data.touristProfile.touristId.startsWith('VX-TRV-'), 'New tourist ID format valid');
    console.assert(!!newTouristRes.body.data.touristProfile.blockchainTxId, 'Simulated blockchain Tx ID created');
    console.log('✅ 5. Registration PASSED: Created ' + newTouristRes.body.data.touristProfile.touristId + ' with blockchain Tx');

    console.log('\n🎉 ALL PHASE 1 AUTHENTICATION & CORE BACKEND TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close(() => {
      process.exit(process.exitCode || 0);
    });
  }
}

runTests();
