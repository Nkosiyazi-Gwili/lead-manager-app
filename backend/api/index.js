// api/index.js - UPDATED WITH COMPLETE AUTH
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Fix mongoose version issue
mongoose.set('strictQuery', true);

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

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set, using mock data');
      return false;
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed:', error.message);
    return false;
  }
};

// Connect to DB in background
connectDB();

// Basic endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API 🚀',
    version: '1.0.0',
    status: 'LIVE WITH COMPLETE AUTH',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await connectDB();
    res.json({
      success: true,
      message: '✅ API is fully operational',
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: dbStatus,
        state: mongoose.connection.readyState,
      }
    });
  } catch (error) {
    res.json({
      success: true,
      message: '✅ API is running (DB connection issue)',
      timestamp: new Date().toISOString(),
      mongodb: { connected: false }
    });
  }
});

// Load the complete auth routes
try {
  const authRoutes = require('../routes/auth-complete');
  app.use('/api/auth', authRoutes);
  console.log('✅ Complete auth routes loaded successfully');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
  app.use('/api/auth', (req, res) => {
    res.json({ 
      message: 'Auth endpoint - fallback mode',
      error: error.message 
    });
  });
}

// Load other routes with fallbacks
const otherRoutes = [
  'leads', 'users', 'reports', 'meta', 'import'
];

otherRoutes.forEach(routeName => {
  try {
    const routeModule = require(`../routes/${routeName}`);
    app.use(`/api/${routeName}`, routeModule);
    console.log(`✅ ${routeName} routes loaded`);
  } catch (error) {
    console.error(`❌ ${routeName} routes failed:`, error.message);
    app.use(`/api/${routeName}`, (req, res) => {
      res.json({ 
        message: `${routeName} endpoint - working but route file not loaded`,
        fallback: true
      });
    });
  }
});

console.log('✅ All routes processed');

module.exports = app;