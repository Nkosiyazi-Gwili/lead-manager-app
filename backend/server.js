const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration - SIMPLIFIED FOR PRODUCTION
const corsOptions = {
  origin: [
    'https://lead-manager-app-psi.vercel.app',
    'https://lead-manager-app.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
};

// Apply CORS middleware - CRITICAL: Apply before any routes
app.use(cors(corsOptions));

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`, {
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  next();
});

// Manual environment configuration
console.log('🔍 Checking environment configuration...');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

console.log('📋 Configuration:');
console.log('   MONGODB_URI:', MONGODB_URI ? '*** SET ***' : 'MISSING');
console.log('   JWT_SECRET:', JWT_SECRET ? '*** SET ***' : 'MISSING');
console.log('   JWT_EXPIRE:', JWT_EXPIRE);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   VERCEL:', process.env.VERCEL ? 'YES' : 'NO');

// Validate required configuration
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required but not set');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production')) {
  console.error('❌ JWT_SECRET is required but not properly set in production');
  process.exit(1);
}

console.log('✅ All required configuration is set');

// Database connection with improved error handling
let isDatabaseConnected = false;

const connectDB = async () => {
  if (isDatabaseConnected) {
    console.log('✅ Using existing database connection');
    return;
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    isDatabaseConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    console.log('   Database:', mongoose.connection.db?.databaseName);
    console.log('   Host:', mongoose.connection.host);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isDatabaseConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isDatabaseConnected = false;
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Don't exit in serverless - let it continue without DB
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager API Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    cors: 'enabled',
    endpoints: {
      health: '/api/health',
      corsTest: '/api/cors-test',
      auth: '/api/auth',
      leads: '/api/leads',
      users: '/api/users'
    }
  });
});

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled',
    allowedOrigins: [
      'https://lead-manager-app-psi.vercel.app',
      'http://localhost:3000'
    ]
  });
});

// Enhanced CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  // Manually set CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    success: true,
    message: 'CORS is working!',
    origin: req.headers.origin,
    allowed: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test preflight endpoints explicitly
app.options('/api/cors-test', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/auth/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.options('/api/auth/register', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Import routes with error handling
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error);
}

try {
  app.use('/api/leads', require('./routes/leads'));
  console.log('✅ Leads routes loaded');
} catch (error) {
  console.error('❌ Failed to load leads routes:', error);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('✅ Users routes loaded');
} catch (error) {
  console.error('❌ Failed to load users routes:', error);
}

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Global Error Handler:', error);
  
  // Set CORS headers even for errors
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Request blocked by CORS policy',
      origin: req.headers.origin,
      allowedOrigins: [
        'https://lead-manager-app-psi.vercel.app',
        'http://localhost:3000'
      ]
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  // Set CORS headers for 404 responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/cors-test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/leads',
      'POST /api/leads'
    ]
  });
});

// Global 404 handler
app.use('*', (req, res) => {
  // Set CORS headers for global 404
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize server
const startServer = async () => {
  try {
    await connectDB();
    
    // Only start listening if not in Vercel environment
    if (!process.env.VERCEL) {
      const PORT = process.env.PORT || 5000;
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Server started successfully!');
        console.log(`   Port: ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   CORS: Enabled for production`);
        console.log(`   Frontend URL: https://lead-manager-app-psi.vercel.app`);
        console.log(`   Health Check: http://localhost:${PORT}/api/health`);
        console.log(`   CORS Test: http://localhost:${PORT}/api/cors-test\n`);
      });

      // Handle server errors
      server.on('error', (error) => {
        console.error('❌ Server error:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
        }
      });
    } else {
      console.log('🚀 Server running on Vercel - Serverless mode');
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

// Start the server
startServer();

// Export for Vercel
module.exports = app;