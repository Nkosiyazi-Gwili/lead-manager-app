require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-app-psi.vercel.app',
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

// MongoDB connection with connection caching for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return;
  }

  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI);
      isConnected = true;
      console.log('✅ MongoDB Connected');
      
      mongoose.connection.on('error', err => {
        console.error('❌ MongoDB connection error:', err);
        isConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('❌ MongoDB disconnected');
        isConnected = false;
      });
    } else {
      console.log('❌ MongoDB URI not available');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    isConnected = false;
    throw err;
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
  router.get('/health', (req, res) => res.json({ status: 'fallback' }));
  authRoutes = leadsRoutes = usersRoutes = reportsRoutes = metaRoutes = importRoutes = router;
}

// Use routes
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
    message: 'Smart Register Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

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
    message: 'Route not found'
  });
});

// Serverless function handler
module.exports = async (req, res) => {
  try {
    // Connect to DB on cold start
    await connectDB();
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

// Only listen locally in development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}