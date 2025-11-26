require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Fix for Mongoose 6.x
mongoose.set('strictQuery', true);

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
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

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.url);
  next();
});

// SIMPLIFIED MongoDB connection for Vercel
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set, using fallback mode');
      return false;
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Import routes with better error handling
const loadRoutes = () => {
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
    
    // Create fallback routes that don't crash
    const createFallbackRoute = (path) => {
      app.use(path, (req, res) => {
        res.json({ 
          success: false, 
          message: `Service temporarily unavailable - ${path} routes failed to load`,
          error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
      });
    };
    
    createFallbackRoute('/api/auth');
    createFallbackRoute('/api/leads');
    createFallbackRoute('/api/users');
    createFallbackRoute('/api/reports');
    createFallbackRoute('/api/meta');
    createFallbackRoute('/api/import');
  }
};

// Initialize routes
loadRoutes();

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

// Health check (works without DB)
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

// Test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin',
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
    path: req.originalUrl
  });
});

// Vercel serverless function export
module.exports = app;

// Only start server if running locally
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}/api/health`);
  });
}