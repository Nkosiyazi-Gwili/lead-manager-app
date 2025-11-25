require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Simple CORS configuration for Vercel
app.use(cors({
  origin: [
    'https://lead-manager-front-end-app.vercel.app',
    'http://localhost:3000',
    'https://lead-manager-front-end-app-*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// MongoDB connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadmanager';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Initialize DB connection
connectDB().then(connected => {
  console.log(connected ? '🚀 DB connection established' : '❌ DB connection failed');
});

// Import routes with safe fallbacks
let authRoutes, leadsRoutes, usersRoutes, reportsRoutes, metaRoutes, importRoutes;

try {
  authRoutes = require('./routes/auth');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
  authRoutes = require('express').Router();
  authRoutes.get('/health', (req, res) => res.json({ status: 'auth-fallback' }));
}

try {
  leadsRoutes = require('./routes/leads');
} catch (error) {
  console.error('❌ Leads routes failed:', error.message);
  leadsRoutes = require('express').Router();
}

try {
  usersRoutes = require('./routes/users');
} catch (error) {
  console.error('❌ Users routes failed:', error.message);
  usersRoutes = require('express').Router();
}

try {
  reportsRoutes = require('./routes/reports');
} catch (error) {
  console.error('❌ Reports routes failed:', error.message);
  reportsRoutes = require('express').Router();
}

try {
  metaRoutes = require('./routes/meta');
} catch (error) {
  console.error('❌ Meta routes failed:', error.message);
  metaRoutes = require('express').Router();
}

try {
  importRoutes = require('./routes/import');
} catch (error) {
  console.error('❌ Import routes failed:', error.message);
  importRoutes = require('express').Router();
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/leads/import', importRoutes);

// Root endpoint - SIMPLE AND RELIABLE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check - SIMPLE AND RELIABLE
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    res.json({ 
      success: true, 
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// CORS test endpoint - SIMPLE AND RELIABLE
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Simple 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Simple error handler - NO COMPLEX LOGIC
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Vercel serverless function handler - SIMPLIFIED
module.exports = (req, res) => {
  return app(req, res);
};

// Local development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}