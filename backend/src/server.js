require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { seedInitialData } = require('./utils/seedData');

// Route imports
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const geoFenceRoutes = require('./routes/geoFenceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const touristRoutes = require('./routes/touristRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const emergencyServicesRoutes = require('./routes/emergencyServicesRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*', // Allow all origins for dev/demo hackathon testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'SafeX Core API Engine',
    version: '1.0.0-SIH2025',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/geofences', geoFenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tourist', touristRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/emergency-services', emergencyServicesRoutes);

// Serve Tourist Mobile Web App on /app
const mobileWebPath = path.join(__dirname, '../../mobile/build/web');
app.use('/app', express.static(mobileWebPath));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await seedInitialData();
      app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🛡️  SAFEX BACKEND ACTIVE ON PORT ${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`🔐 Auth Endpoint: http://localhost:${PORT}/api/auth/login`);
        console.log(`====================================================`);
      });
    } catch (err) {
      console.error('[FATAL STARTUP ERROR]:', err);
      process.exit(1);
    }
  })();
}

module.exports = app;
