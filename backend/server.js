const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// SIMPLE CORS - ALLOW ALL ORIGINS FOR TESTING
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// SIMPLE LOGGING
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// SAFE MongoDB connection - won't crash if DB fails
let isConnecting = false;
let dbConnection = null;

const connectDB = async () => {
  try {
    // Return existing connection if available and connected
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('⚠️  DB connection already in progress, waiting...');
      // Wait for ongoing connection to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (mongoose.connection.readyState === 1) {
        return true;
      }
      return false;
    }
    
    isConnecting = true;
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set, using mock data');
      isConnecting = false;
      return false;
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 5, // Smaller pool for serverless
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    
    console.log('✅ MongoDB connected');
    isConnecting = false;
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed:', error.message);
    isConnecting = false;
    return false;
  }
};

// Import routes with error handling
let authRoutes, leadsRoutes, usersRoutes, reportsRoutes, metaRoutes, importRoutes;

try {
  authRoutes = require('./routes/auth');
  leadsRoutes = require('./routes/leads');
  usersRoutes = require('./routes/users');
  reportsRoutes = require('./routes/reports');
  metaRoutes = require('./routes/meta');
  importRoutes = require('./routes/import');
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  // Create simple fallback routes
  const router = express.Router();
  router.all('*', (req, res) => res.status(503).json({ 
    status: 'fallback',
    message: 'Routes not loaded properly'
  }));
  authRoutes = leadsRoutes = usersRoutes = reportsRoutes = metaRoutes = importRoutes = router;
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/import', importRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Register Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Health check with DB connection test
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      mongodb: {
        connected: dbConnected,
        state: mongoose.connection.readyState,
        stateText: getConnectionStateText(mongoose.connection.readyState)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      mongodb: {
        connected: false,
        state: mongoose.connection.readyState,
        stateText: getConnectionStateText(mongoose.connection.readyState)
      }
    });
  }
});

// Helper function for connection state
function getConnectionStateText(state) {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

// Test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Vercel serverless function handler - SIMPLIFIED
module.exports = async (req, res) => {
  try {
    // For serverless, we don't call app.listen()
    // Just handle the request directly with the Express app
    
    // Optional: Connect to DB if needed for this request
    // But don't block the request if DB is unavailable
    try {
      await connectDB();
    } catch (dbError) {
      console.log('DB connection optional for request');
    }
    
    // Handle the request with Express
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: error.message
    });
  }
};

// ONLY start the server if we're running locally
// This is crucial for Vercel deployment
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}