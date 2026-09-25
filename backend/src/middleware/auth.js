const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'visionx_super_secret_jwt_key_sih2025_tourist_safety';

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Bearer token missing in authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db.collection('users').findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User associated with token no longer exists.'
      });
    }

    // Attach user (omit passwordHash for security)
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;

    // If tourist, also attach tourist profile
    if (user.role === 'TOURIST') {
      const touristProfile = db.collection('touristProfiles').findOne(tp => tp.userId === user.id);
      req.touristProfile = touristProfile || null;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to roles [${roles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
