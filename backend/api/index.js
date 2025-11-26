// api/index.js - FIXED PATHS
const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Test endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API ✅',
    version: '1.0.0',
    status: 'DEPLOYED',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API is fully operational on Vercel',
    timestamp: new Date().toISOString()
  });
});

// Load routes with proper paths
console.log('🔧 Loading routes...');

const routePaths = [
  { name: 'auth', path: '../routes/auth' },
  { name: 'leads', path: '../routes/leads' },
  { name: 'users', path: '../routes/users' },
  { name: 'reports', path: '../routes/reports' },
  { name: 'meta', path: '../routes/meta' },
  { name: 'import', path: '../routes/import' }
];

routePaths.forEach(route => {
  try {
    console.log(`Loading ${route.name}...`);
    // Try multiple path options
    const routeModule = require(route.path);
    app.use(`/api/${route.name}`, routeModule);
    console.log(`✅ ${route.name} route loaded`);
  } catch (error) {
    console.error(`❌ ${route.name} failed:`, error.message);
    // Fallback route
    app.use(`/api/${route.name}`, (req, res) => {
      res.json({ 
        message: `${route.name} endpoint - working but route file not loaded`,
        fallback: true,
        path: req.path
      });
    });
  }
});

console.log('✅ All routes processed');

module.exports = app;