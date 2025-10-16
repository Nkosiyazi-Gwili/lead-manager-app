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

// CORS Configuration
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

app.options('*', cors());
app.use(express.json());

// Enhanced health check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: dbStatus === 1 ? 'OK' : 'WARNING',
    message: 'Server is running',
    database: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// SIMPLE TEST ENDPOINT - NO DATABASE REQUIRED
app.post('/api/auth/simple-login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  // Mock successful login for testing
  res.json({
    success: true,
    message: 'Login successful (test endpoint)',
    token: 'test-jwt-token-12345',
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: email,
      role: 'admin'
    }
  });
});

// Database connection with better error handling
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not found');
      return false;
    }

    console.log('🔗 Connecting to MongoDB...');
    
    // Remove deprecated options for newer mongoose versions
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB connected successfully!');
    return true;
    
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Import routes with better error handling
const loadRoutes = async () => {
  try {
    // Auth routes
    app.use('/api/auth', require('./routes/auth'));
    console.log('✅ Auth routes loaded');
  } catch (error) {
    console.log('❌ Failed to load auth routes:', error.message);
  }

  try {
    // Leads routes
    app.use('/api/leads', require('./routes/leads'));
    console.log('✅ Leads routes loaded');
  } catch (error) {
    console.log('❌ Failed to load leads routes:', error.message);
    // Create fallback leads route
    app.get('/api/leads', (req, res) => {
      res.status(503).json({
        success: false,
        message: 'Leads service temporarily unavailable'
      });
    });
  }

  try {
    // Users routes
    app.use('/api/users', require('./routes/users'));
    console.log('✅ Users routes loaded');
  } catch (error) {
    console.log('❌ Failed to load users routes:', error.message);
  }

  // Remove reports routes if they don't exist
  console.log('ℹ️  Reports routes skipped - not implemented');
};

// Initialize server
const startServer = async () => {
  // Connect to database first
  const dbConnected = await connectDB();
  
  // Load routes
  await loadRoutes();
  
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
    console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🔗 CORS enabled for: ${allowedOrigins.join(', ')}`);
  });
};

// Start the server
startServer();

module.exports = app;