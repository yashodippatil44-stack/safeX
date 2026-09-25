const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateDigitalIdHash, seedInitialData } = require('../utils/seedData');

const JWT_SECRET = process.env.JWT_SECRET || 'visionx_super_secret_jwt_key_sih2025_tourist_safety';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Generate unique sequential or formatted Tourist ID
function createNextTouristId() {
  const count = db.collection('touristProfiles').count() + 1;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(6, '0');
  return `VX-TRV-${year}-${padded}`;
}

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = 'TOURIST',
      country = 'India',
      state = '',
      city = '',
      emergencyContactName = '',
      emergencyContactPhone = '',
      interests = []
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, and password are required.'
      });
    }

    const usersCol = db.collection('users');
    const existing = usersCol.findOne(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = usersCol.insert({
      id: 'usr_' + uuidv4().slice(0, 8),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      passwordHash,
      role: role.toUpperCase(),
      createdAt: new Date().toISOString()
    });

    let touristProfile = null;

    if (newUser.role === 'TOURIST') {
      const touristId = createNextTouristId();
      const digitalIdHash = generateDigitalIdHash(touristId, name, country, emergencyContactPhone);
      const simulatedTxId = '0x' + crypto.randomBytes(32).toString('hex');

      touristProfile = db.collection('touristProfiles').insert({
        id: 'tp_' + uuidv4().slice(0, 8),
        userId: newUser.id,
        touristId,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        country,
        state,
        city,
        emergencyContactName,
        emergencyContactPhone,
        profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&q=80',
        digitalIdHash,
        blockchainTxId: simulatedTxId,
        verificationStatus: 'AUTHENTIC',
        tourName: 'General Tourism Itinerary',
        tourStatus: 'ACTIVE',
        currentRiskLevel: 'LOW',
        safetyStatus: 'SAFE',
        currentLatitude: 25.5788,
        currentLongitude: 91.8833,
        lastActive: new Date().toISOString(),
        interests: Array.isArray(interests) ? interests : ['Nature', 'Culture']
      });
    }

    const token = generateToken(newUser);

    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Digital identity initialized.',
      data: {
        user: safeUser,
        touristProfile,
        token
      }
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const user = db.collection('users').findOne(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password incorrect.'
      });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    let touristProfile = null;
    if (user.role === 'TOURIST') {
      touristProfile = db.collection('touristProfiles').findOne(tp => tp.userId === user.id);
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: safeUser,
        touristProfile,
        token
      }
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        touristProfile: req.touristProfile || null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetDemoDatabase = async (req, res) => {
  try {
    // Clear and re-seed
    const cols = ['users', 'touristProfiles', 'locations', 'geoFences', 'incidents', 'emergencies', 'travelGroups', 'travelGroupMembers', 'certificates', 'efirs'];
    cols.forEach(c => {
      db.data[c] = [];
    });
    db.save();
    await seedInitialData();

    return res.status(200).json({
      success: true,
      message: 'Demo database reset and re-seeded with demo tourists, police, and geofences.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
