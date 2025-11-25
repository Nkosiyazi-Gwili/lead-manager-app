// api/index.js - FIXED NO DUPLICATE ROUTES
const express = require('express');

const app = express();

// Basic CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://lead-manager-front-end-app.vercel.app',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// ==================== BASIC ENDPOINTS ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Backend API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Health check passed',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: '✅ CORS is working!',
    yourOrigin: req.headers.origin,
    allowed: true,
    timestamp: new Date().toISOString()
  });
});

// ==================== ROUTE IMPORTS ====================
// Import routes from route files
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');
const metaRoutes = require('./routes/meta');
const importRoutes = require('./routes/import');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/leads/import', importRoutes);

// ==================== ERROR HANDLING ====================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET    /',
      'GET    /api/health',
      'GET    /api/test-cors',
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/auth/me',
      'GET    /api/leads',
      'POST   /api/leads',
      'PUT    /api/leads/:id',
      'DELETE /api/leads/:id',
      'POST   /api/leads/import/csv',
      'POST   /api/leads/import/excel',
      'POST   /api/leads/import/meta',
      'POST   /api/meta/setup',
      'GET    /api/meta/businesses',
      'GET    /api/meta/forms',
      'POST   /api/meta/import-leads',
      'GET    /api/users',
      'GET    /api/users/profile',
      'GET    /api/reports/leads',
      'GET    /api/reports/dashboard'
    ]
  });
});

app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Export for Vercel
module.exports = app;