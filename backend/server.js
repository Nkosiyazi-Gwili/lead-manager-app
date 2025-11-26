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
      serverSelectionTimeoutMS: 5000, // Fast timeout
      socketTimeoutMS: 10000,
      maxPoolSize: 10, // Added connection pool settings
    });
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, using mock data:', error.message);
    return false;
  }
};

// Connect in background (non-blocking) with retry logic
let dbConnectionAttempted = false;
const initializeDB = async () => {
  if (!dbConnectionAttempted) {
    dbConnectionAttempted = true;
    await connectDB();
  }
};
initializeDB();

// Import routes with better error handling
let authRoutes, leadsRoutes, usersRoutes, reportsRoutes, metaRoutes, importRoutes;

try {
  // Use dynamic imports for better error isolation
  authRoutes = require('./routes/auth');
  leadsRoutes = require('./routes/leads');
  usersRoutes = require('./routes/users');
  reportsRoutes = require('./routes/reports');
  metaRoutes = require('./routes/meta');
  importRoutes = require('./routes/import');
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  // Create individual fallback routes with more specific responses
  const createFallbackRouter = (routeName) => {
    const router = express.Router();
    router.all('*', (req, res) => res.status(503).json({
      success: false,
      message: `Service temporarily unavailable - ${routeName} routes failed to load`,
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    }));
    return router;
  };
  
  authRoutes = createFallbackRouter('auth');
  leadsRoutes = createFallbackRouter('leads');
  usersRoutes = createFallbackRouter('users');
  reportsRoutes = createFallbackRouter('reports');
  metaRoutes = createFallbackRouter('meta');
  importRoutes = createFallbackRouter('import');
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/import', importRoutes); // Fixed: moved import routes to proper base path

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

// Test endpoint - FIXED: removed undefined variable
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware - IMPROVED
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: process.env.NODE_ENV === 'production' ? {} : err.message,
      details: process.env.NODE_ENV === 'production' ? {} : err.errors
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found',
      error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler - IMPROVED
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Serverless function handler with connection management - IMPROVED
const handler = async (req, res) => {
  try {
    // Ensure DB connection is active for each request
    const dbConnected = await connectDB();
    
    if (!dbConnected && !isReadOnlyEndpoint(req.path, req.method)) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again.',
        mongodbState: mongoose.connection.readyState,
        stateText: getConnectionStateText(mongoose.connection.readyState)
      });
    }
    
    // Pass request to Express app
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

// Helper to determine if endpoint can work without DB
function isReadOnlyEndpoint(path, method) {
  const readOnlyPaths = ['/api/health', '/', '/api/test-cors'];
  const readOnlyMethods = ['GET', 'OPTIONS'];
  
  return readOnlyPaths.includes(path) && readOnlyMethods.includes(method);
}

// Only listen locally in development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = handler;