// server.js - Fixed for both local and Vercel
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
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

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// MongoDB connection - LAZY LOADING (only connect when needed)
let dbConnected = false;
const connectDB = async () => {
  if (dbConnected) return true;
  
  try {
    if (mongoose.connection.readyState === 1) {
      dbConnected = true;
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
      maxPoolSize: 2, // Smaller for serverless
    });
    console.log('✅ MongoDB connected');
    dbConnected = true;
    return true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed:', error.message);
    return false;
  }
};

// Routes with error handling
const setupRoutes = () => {
  try {
    const authRoutes = require('./routes/auth');
    const leadsRoutes = require('./routes/leads');
    const usersRoutes = require('./routes/users');
    const reportsRoutes = require('./routes/reports');
    const metaRoutes = require('./routes/meta');
    const importRoutes = require('./routes/import');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/meta', metaRoutes);
    app.use('/api/import', importRoutes);
    
    console.log('✅ All routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading routes:', error.message);
    
    // Fallback routes
    app.use('/api/auth', (req, res) => res.status(503).json({ error: 'Auth routes unavailable' }));
    app.use('/api/leads', (req, res) => res.status(503).json({ error: 'Leads routes unavailable' }));
    app.use('/api/users', (req, res) => res.status(503).json({ error: 'Users routes unavailable' }));
    app.use('/api/reports', (req, res) => res.status(503).json({ error: 'Reports routes unavailable' }));
    app.use('/api/meta', (req, res) => res.status(503).json({ error: 'Meta routes unavailable' }));
    app.use('/api/import', (req, res) => res.status(503).json({ error: 'Import routes unavailable' }));
  }
};

// Initialize routes
setupRoutes();

// Basic endpoints (always work)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await connectDB();
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      mongodb: {
        connected: dbStatus,
        state: mongoose.connection.readyState,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Error handling
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

// Export the app without starting the server
module.exports = app;

// Only start server if running locally (not in Vercel)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
}