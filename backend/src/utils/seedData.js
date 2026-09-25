const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

function generateDigitalIdHash(touristId, name, country, emergencyContact) {
  const payload = `${touristId}:${name}:${country}:${emergencyContact}:SAFEX_SIH2025`;
  return '0x' + crypto.createHash('sha256').update(payload).digest('hex');
}

async function seedInitialData() {
  const usersCol = db.collection('users');
  const touristsCol = db.collection('touristProfiles');
  const geoFencesCol = db.collection('geoFences');
  const emergenciesCol = db.collection('emergencies');
  const incidentsCol = db.collection('incidents');
  const locationsCol = db.collection('locations');
  const emergencyServicesCol = db.collection('emergencyServices');

  // If emergencyServices is empty, seed them
  if (emergencyServicesCol.count() === 0) {
    seedServices(emergencyServicesCol);
  }

  // If already seeded with users, return
  if (usersCol.count() > 0) {
    console.log('[SEED] Database already contains records. Skipping user seed.');
    return;
  }

  console.log('[SEED] Seeding default SafeX users, tourists, geofences, and emergency services...');

  const salt = await bcrypt.genSalt(10);
  const passwordHashTourist = await bcrypt.hash('tourist123', salt);
  const passwordHashPolice = await bcrypt.hash('police123', salt);
  const passwordHashAdmin = await bcrypt.hash('admin123', salt);
  const passwordHashTourism = await bcrypt.hash('tourism123', salt);

  // 1. Users
  const userTourist1 = usersCol.insert({
    id: 'usr_tourist_001',
    name: 'Yashodip Patil',
    email: 'yashodip@visionx.gov',
    phone: '+91 98765 43210',
    passwordHash: passwordHashTourist,
    role: 'TOURIST',
    createdAt: new Date().toISOString()
  });

  const userTourist2 = usersCol.insert({
    id: 'usr_tourist_002',
    name: 'Rahul Sharma',
    email: 'rahul@visionx.gov',
    phone: '+91 91234 56789',
    passwordHash: passwordHashTourist,
    role: 'TOURIST',
    createdAt: new Date().toISOString()
  });

  const userTourist3 = usersCol.insert({
    id: 'usr_tourist_003',
    name: 'Tushar Amrutkar',
    email: 'tushar@visionx.gov',
    phone: '+91 98220 11223',
    passwordHash: passwordHashTourist,
    role: 'TOURIST',
    createdAt: new Date().toISOString()
  });

  const userPolice = usersCol.insert({
    id: 'usr_police_001',
    name: 'Inspector Vikram Joshi',
    email: 'control@police.visionx.gov',
    phone: '+91 364 222 2222',
    passwordHash: passwordHashPolice,
    role: 'POLICE',
    badgeNumber: 'SHL-POL-402',
    station: 'Central Tourist Police Station, Police Bazar, Shillong',
    createdAt: new Date().toISOString()
  });

  const userAdmin = usersCol.insert({
    id: 'usr_admin_001',
    name: 'SafeX Command Admin',
    email: 'admin@visionx.gov',
    phone: '+91 80000 00001',
    passwordHash: passwordHashAdmin,
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  });

  const userTourism = usersCol.insert({
    id: 'usr_tourism_001',
    name: 'Meghalaya Tourism Directorate',
    email: 'tourism@visionx.gov',
    phone: '+91 364 250 1234',
    passwordHash: passwordHashTourism,
    role: 'TOURISM_AUTHORITY',
    createdAt: new Date().toISOString()
  });

  // 2. Tourist Profiles with Digital IDs
  const t1Hash = generateDigitalIdHash('VX-TRV-0001', 'Yashodip Patil', 'India', '+91 98765 43210');
  touristsCol.insert({
    id: 'tp_001',
    userId: userTourist1.id,
    touristId: 'VX-TRV-0001',
    name: 'Yashodip Patil',
    email: 'yashodip@visionx.gov',
    phone: '+91 98765 43210',
    country: 'India',
    state: 'Maharashtra',
    city: 'Nashik',
    emergencyContactName: 'Sunil Patil (Father)',
    emergencyContactPhone: '+91 98765 00000',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
    digitalIdHash: t1Hash,
    blockchainTxId: '0x9fa4c7b82e1d03ef4599a0b12c89d71a8e9014ab5c2d3e4f6a7b8c9d0e1f2a3b',
    verificationStatus: 'AUTHENTIC',
    tourName: 'Meghalaya Nature & Living Root Bridge Expedition',
    tourStatus: 'IN_PROGRESS',
    currentRiskLevel: 'LOW',
    safetyStatus: 'SAFE',
    currentLatitude: 25.5788,
    currentLongitude: 91.8833,
    lastActive: new Date().toISOString(),
    interests: ['Trekking', 'Nature', 'Photography', 'Culture']
  });

  const t2Hash = generateDigitalIdHash('VX-TRV-0002', 'Rahul Sharma', 'India', '+91 91234 56789');
  touristsCol.insert({
    id: 'tp_002',
    userId: userTourist2.id,
    touristId: 'VX-TRV-0002',
    name: 'Rahul Sharma',
    email: 'rahul@visionx.gov',
    phone: '+91 91234 56789',
    country: 'India',
    state: 'Delhi',
    city: 'New Delhi',
    emergencyContactName: 'Anita Sharma (Mother)',
    emergencyContactPhone: '+91 91234 00000',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
    digitalIdHash: t2Hash,
    blockchainTxId: '0x4cb1e89f2a3c7d6e501b8a9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e',
    verificationStatus: 'AUTHENTIC',
    tourName: 'Meghalaya Nature & Living Root Bridge Expedition',
    tourStatus: 'IN_PROGRESS',
    currentRiskLevel: 'MEDIUM',
    safetyStatus: 'MONITORING',
    currentLatitude: 25.2780,
    currentLongitude: 91.7210,
    lastActive: new Date().toISOString(),
    interests: ['Trekking', 'Adventure', 'Food']
  });

  const t3Hash = generateDigitalIdHash('VX-TRV-0003', 'Tushar Amrutkar', 'India', '+91 98220 11223');
  touristsCol.insert({
    id: 'tp_003',
    userId: userTourist3.id,
    touristId: 'VX-TRV-0003',
    name: 'Tushar Amrutkar',
    email: 'tushar@visionx.gov',
    phone: '+91 98220 11223',
    country: 'India',
    state: 'Maharashtra',
    city: 'Pune',
    emergencyContactName: 'Ramesh Amrutkar',
    emergencyContactPhone: '+91 98220 00000',
    profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
    digitalIdHash: t3Hash,
    blockchainTxId: '0x12a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3',
    verificationStatus: 'AUTHENTIC',
    tourName: 'Meghalaya Nature & Living Root Bridge Expedition',
    tourStatus: 'IN_PROGRESS',
    currentRiskLevel: 'HIGH',
    safetyStatus: 'NEAR_DANGER_ZONE',
    currentLatitude: 25.2755,
    currentLongitude: 91.7188,
    lastActive: new Date().toISOString(),
    interests: ['Photography', 'Culture', 'History']
  });

  // 3. GeoFences (Phase 2 Specifications)
  const sampleGeoFences = [
    {
      id: 'gf_001',
      name: 'Safe Tourist Area',
      latitude: 25.5788,
      longitude: 91.8833,
      radius: 800,
      type: 'SAFE_ZONE',
      riskLevel: 'LOW',
      active: true,
      description: 'Police Bazar central tourist safe haven with 24/7 dedicated Tourist Police assistance and medical kiosks.'
    },
    {
      id: 'gf_002',
      name: 'Shillong Tourist Zone',
      latitude: 25.5760,
      longitude: 91.8890,
      radius: 900,
      type: 'TOURIST_ZONE',
      riskLevel: 'LOW',
      active: true,
      description: 'Ward’s Lake & Botanical Gardens scenic heritage zone with curated footpaths.'
    },
    {
      id: 'gf_003',
      name: 'High Risk Trail',
      latitude: 25.2750,
      longitude: 91.7180,
      radius: 650,
      type: 'DANGER_ZONE',
      riskLevel: 'HIGH',
      active: true,
      description: 'Sohra Deep Ravine steep gorge. High risk of disorientation, slippage and flash flooding.'
    },
    {
      id: 'gf_004',
      name: 'Restricted Forest Area',
      latitude: 25.4490,
      longitude: 91.7580,
      radius: 700,
      type: 'RESTRICTED_ZONE',
      riskLevel: 'HIGH',
      active: true,
      description: 'Mawphlang Sacred Forest Sanctuary. Eco-sensitive bio-reserve strictly requiring authorized local guides.'
    }
  ];

  sampleGeoFences.forEach(gf => geoFencesCol.insert(gf));

  // 4. Sample Location History
  locationsCol.insert({
    id: 'loc_001',
    touristId: 'VX-TRV-0001',
    latitude: 25.5788,
    longitude: 91.8833,
    accuracy: 8,
    riskLevel: 'LOW',
    timestamp: new Date().toISOString()
  });

  locationsCol.insert({
    id: 'loc_002',
    touristId: 'VX-TRV-0003',
    latitude: 25.2755,
    longitude: 91.7188,
    accuracy: 12,
    riskLevel: 'HIGH',
    timestamp: new Date().toISOString()
  });

  // 5. Initial Sample Incident
  incidentsCol.insert({
    id: 'inc_001',
    incidentId: 'VX-INC-2026-000001',
    touristId: 'VX-TRV-0002',
    touristName: 'Rahul Sharma',
    type: 'THEFT',
    description: 'My backpack with camera equipment was stolen near Nohkalikai viewpoint kiosk.',
    latitude: 25.2780,
    longitude: 91.7210,
    severity: 'MEDIUM',
    status: 'REPORTED',
    photos: [],
    authorityRemarks: 'Forwarded to Sohra tourist patrol beat.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  });

  // 6. Initial Sample Emergency
  emergenciesCol.insert({
    id: 'emg_001',
    emergencyId: 'VX-EMG-2026-000001',
    touristId: 'VX-TRV-0003',
    touristName: 'Tushar Amrutkar',
    type: 'MEDICAL',
    latitude: 25.2755,
    longitude: 91.7188,
    accuracy: 12,
    severity: 'CRITICAL',
    status: 'NEW',
    assignedOfficerId: null,
    assignedOfficerName: null,
    touristMessage: 'Slipped on wet rock near ravine cliff edge. Severe ankle injury and unable to ascend trail.',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString()
  });

  // 7. Seed Emergency Services
  seedServices(emergencyServicesCol);

  console.log('[SEED] Database initialized successfully!');
}

function seedServices(emergencyServicesCol) {
  if (emergencyServicesCol.count() > 0) return;

  const sampleServices = [
    {
      id: 'srv_pol_001',
      name: 'Shillong Central Tourist Police Station',
      type: 'POLICE',
      latitude: 25.5788,
      longitude: 91.8833,
      phone: '+91 364 222 2222',
      address: 'Police Bazar, Central Sector, Shillong',
      verified: true,
      active: true
    },
    {
      id: 'srv_pol_002',
      name: 'Sadar Police Station',
      type: 'POLICE',
      latitude: 25.5740,
      longitude: 91.8810,
      phone: '+91 364 222 4400',
      address: 'Secretariat Hills Road, Shillong',
      verified: true,
      active: true
    },
    {
      id: 'srv_pol_003',
      name: 'Sohra Tourist Quick Response Outpost',
      type: 'POLICE',
      latitude: 25.2750,
      longitude: 91.7180,
      phone: '+91 363 723 5210',
      address: 'Near Nohkalikai Falls, Sohra (Cherrapunji)',
      verified: true,
      active: true
    },
    {
      id: 'srv_hsp_001',
      name: 'Nazareth Hospital',
      type: 'HOSPITAL',
      latitude: 25.5680,
      longitude: 91.8950,
      phone: '+91 364 222 4052',
      address: 'Arbuthnot Road, Laitumkhrah, Shillong',
      verified: true,
      active: true
    },
    {
      id: 'srv_hsp_002',
      name: 'Civil Hospital Shillong',
      type: 'HOSPITAL',
      latitude: 25.5765,
      longitude: 91.8845,
      phone: '+91 364 222 5216',
      address: 'Cantonment Area, Shillong',
      verified: true,
      active: true
    },
    {
      id: 'srv_hsp_003',
      name: 'Sohra Community Health Centre (CHC)',
      type: 'HOSPITAL',
      latitude: 25.2800,
      longitude: 91.7250,
      phone: '+91 363 723 5020',
      address: 'Main Road, Cherrapunji',
      verified: true,
      active: true
    },
    {
      id: 'srv_htl_001',
      name: 'Hotel Pinewood (Heritage Safe Stay)',
      type: 'HOTEL',
      latitude: 25.5775,
      longitude: 91.8870,
      phone: '+91 364 222 3116',
      address: 'European Ward, Rita Road, Shillong',
      verified: true,
      active: true
    },
    {
      id: 'srv_htl_002',
      name: 'Ri Kynjai Resort (Verified Lake Haven)',
      type: 'HOTEL',
      latitude: 25.6601,
      longitude: 91.9056,
      phone: '+91 98624 20300',
      address: 'Umiam Lake, Ri Bhoi District',
      verified: true,
      active: true
    },
    {
      id: 'srv_htl_003',
      name: 'Polo Orchid Resort Sohra',
      type: 'HOTEL',
      latitude: 25.2680,
      longitude: 91.7100,
      phone: '+91 87947 01638',
      address: 'Mawsmai Road, Nohsngithiang View, Cherrapunji',
      verified: true,
      active: true
    }
  ];

  sampleServices.forEach(srv => emergencyServicesCol.insert(srv));
  console.log('[SEED] Emergency services initialized: 9 service points.');
}

module.exports = { seedInitialData, generateDigitalIdHash };
