// api/index.js - DEBUG VERSION
console.log('🔧 Starting API load...');

const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Test basic endpoints first
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Lead Manager API - Debug Mode',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running in debug mode',
    mongodb: 'checking routes...'
  });
});

// Load routes one by one to find the problematic one
console.log('🔧 Testing route loading...');

const routes = [
  { name: 'auth', path: './routes/auth' },
  { name: 'leads', path: './routes/leads' },
  { name: 'users', path: './routes/users' },
  { name: 'reports', path: './routes/reports' },
  { name: 'meta', path: './routes/meta' },
  { name: 'import', path: './routes/import' }
];

routes.forEach(route => {
  try {
    console.log(`🔧 Loading ${route.name} route...`);
    const routeModule = require(route.path);
    app.use(`/api/${route.name}`, routeModule);
    console.log(`✅ ${route.name} route loaded successfully`);
  } catch (error) {
    console.error(`❌ ${route.name} route failed:`, error.message);
    app.use(`/api/${route.name}`, (req, res) => {
      res.status(503).json({ 
        error: `${route.name} route unavailable`,
        message: error.message 
      });
    });
  }
});

console.log('✅ All routes processed');

module.exports = app;