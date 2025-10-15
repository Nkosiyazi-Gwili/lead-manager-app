const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '*** SET ***' : 'MISSING');
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '*** SET ***' : 'MISSING');

// CORS Configuration - SIMPLIFIED
const allowedOrigins = [
  'http://localhost:3000',
  'https://lead-manager-app-psi.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Basic health check (NO DATABASE REQUIRED)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Test endpoint without database
app.post('/api/auth/test', (req, res) => {
  res.json({ 
    message: 'Auth endpoint is working',
    received: req.body 
  });
});

// Database connection (NON-BLOCKING)
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not found - running without database');
      return;
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Server will continue running without database');
  }
};

// Connect to DB (but don't crash if it fails)
connectDB();

// Import routes with error handling
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.log('❌ Failed to load auth routes:', error.message);
  // Create fallback auth route
  app.post('/api/auth/login', (req, res) => {
    res.status(503).json({ 
      message: 'Authentication service temporarily unavailable' 
    });
  });
}

try {
  app.use('/api/leads', require('./routes/leads'));
  console.log('✅ Leads routes loaded');
} catch (error) {
  console.log('⚠️  Leads routes not available:', error.message);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('✅ Users routes loaded');
} catch (error) {
  console.log('⚠️  Users routes not available:', error.message);
}

try {
  app.use('/api/reports', require('./routes/reports'));
  console.log('✅ Reports routes loaded');
} catch (error) {
  console.log('⚠️  Reports routes not available:', error.message);
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 CORS enabled for: ${allowedOrigins.join(', ')}`);
});

module.exports = app;