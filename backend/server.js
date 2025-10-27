require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS Configuration
const allowedOrigins = [

  'https://lead-manager-app-psi.vercel.app',
  'http://localhost:3000',
  
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
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

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.url, 'Origin:', req.headers.origin);
  next();
});

// MongoDB connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
}

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ MongoDB Connected');
    } else {
      console.log('❌ MongoDB URI not available');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};

// Connect to MongoDB
connectDB();

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
  // Create simple fallback routes if module loading fails
  authRoutes = express.Router();
  leadsRoutes = express.Router();
  usersRoutes = express.Router();
  reportsRoutes = express.Router();
  metaRoutes = express.Router();
  importRoutes = express.Router();
  
  // Add basic health check to all routes
  [authRoutes, leadsRoutes, usersRoutes, reportsRoutes, metaRoutes, importRoutes].forEach(router => {
    router.get('/health', (req, res) => {
      res.json({ status: 'Route module loading failed - using fallback' });
    });
  });
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
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
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

// Export for Vercel serverless
module.exports = app;

// Only listen locally in development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`✅ CORS enabled for:`, allowedOrigins);
  });
}