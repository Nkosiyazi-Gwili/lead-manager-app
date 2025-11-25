// api/index.js - USING ACTUAL ROUTE FILES
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
}

// Global connection state
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;

const connectDB = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    return true;
  }

  // If already connecting, wait
  if (isConnecting) {
    console.log('🔄 MongoDB connection in progress...');
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (mongoose.connection.readyState === 1) {
          resolve(true);
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  isConnecting = true;

  try {
    console.log('🔄 Attempting MongoDB connection...');
    
    // Updated connection options for Mongoose 6+
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    
    console.log('✅ MongoDB Connected successfully');
    connectionRetries = 0;
    isConnecting = false;
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    connectionRetries++;
    isConnecting = false;
    
    if (connectionRetries < MAX_RETRIES) {
      console.log(`🔄 Retrying connection (${connectionRetries}/${MAX_RETRIES})...`);
      setTimeout(connectDB, 2000);
    }
    
    return false;
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Initial connection
connectDB().then(connected => {
  if (connected) {
    console.log('🚀 MongoDB connection established');
  } else {
    console.log('❌ MongoDB connection failed');
  }
});

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
  const createFallbackRouter = (name) => {
    const router = express.Router();
    router.get('/health', (req, res) => res.json({ 
      status: `${name}-fallback`, 
      message: 'Route loading failed, using fallback' 
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

// Use routes - CORRECT ROUTE PATHS
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/leads/import', importRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
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
      environment: process.env.NODE_ENV || 'production',
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
    yourOrigin: req.headers.origin,
    allowedOrigins: allowedOrigins
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
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Export for Vercel - SIMPLE EXPORT
module.exports = app;

// Local development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}