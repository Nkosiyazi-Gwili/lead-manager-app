const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('🔍 Starting Server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '*** SET ***' : 'MISSING');

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://lead-manager-app-psi.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());
app.use(express.json());

// Health check (works without DB)
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK',
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint without DB
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working without database',
    environment: process.env.NODE_ENV 
  });
});

// MongoDB Connection with better Vercel optimization
let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return true;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    console.log('⏳ Connection in progress, waiting...');
    return await connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      if (!process.env.MONGODB_URI) {
        console.log('⚠️  MONGODB_URI not found');
        return false;
      }

      console.log('🔗 Attempting to connect to MongoDB...');

      // Close any existing connections first
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      // Optimized for Vercel serverless
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        maxPoolSize: 5, // Smaller pool for serverless
        minPoolSize: 1,
        maxIdleTimeMS: 30000, // Close idle connections after 30s
        bufferCommands: true, // Enable buffering
        bufferMaxEntries: 0, // Unlimited buffering
      });

      isConnected = true;
      console.log('✅ MongoDB connected successfully!');

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
        isConnected = false;
        connectionPromise = null;
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        isConnected = false;
        connectionPromise = null;
      });

      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      isConnected = false;
      connectionPromise = null;
      return false;
    }
  })();

  return await connectionPromise;
};

// Database connection middleware
const withDB = async (req, res, next) => {
  try {
    const dbConnected = await connectDB();
    req.dbConnected = dbConnected;
    
    if (!dbConnected) {
      console.log('⚠️  Database not connected for request:', req.method, req.path);
    }
    
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    req.dbConnected = false;
    next();
  }
};

// Apply database middleware to all API routes
app.use('/api/', withDB);

// Import routes with better error handling
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.log('❌ Auth routes failed:', error.message);
  
  // Fallback auth routes
  app.post('/api/auth/login', (req, res) => {
    if (!req.dbConnected) {
      return res.status(503).json({ 
        success: false,
        message: 'Database not available. Please try again.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Auth system error' 
    });
  });
}

try {
  const leadsRoutes = require('./routes/leads');
  app.use('/api/leads', leadsRoutes);
  console.log('✅ Leads routes loaded');
} catch (error) {
  console.log('❌ Leads routes failed:', error.message);
}

try {
  const usersRoutes = require('./routes/users');
  app.use('/api/users', usersRoutes);
  console.log('✅ Users routes loaded');
} catch (error) {
  console.log('⚠️ Users routes not loaded:', error.message);
}

try {
  const reportsRoutes = require('./routes/reports');
  app.use('/api/reports', reportsRoutes);
  console.log('✅ Reports routes loaded');
} catch (error) {
  console.log('⚠️ Reports routes not loaded:', error.message);
}

// Add this to your server.js route loading section
try {
  console.log('📁 Loading meta routes...');
  const metaRoutes = require('./routes/meta');
  app.use('/api/meta', metaRoutes);
  console.log('✅ Meta routes loaded successfully');
} catch (error) {
  console.error('❌ FAILED to load meta routes:', error.message);
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  // Handle MongoDB timeout errors specifically
  if (error.name === 'MongoServerSelectionError' || error.message.includes('buffering timed out')) {
    return res.status(503).json({ 
      success: false,
      message: 'Database connection timeout. Please try again.',
      code: 'DATABASE_TIMEOUT'
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// General 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
//   console.log(`💡 Environment: ${process.env.NODE_ENV}`);
// });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;