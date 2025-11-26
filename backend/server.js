require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ENHANCED CORS Configuration - FIXED
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'https://lead-manager-front-end-app-git-main-gwilinkosiyazis-projects.vercel.app',
  'https://lead-manager-front-end-app-gwilinkosiyazis-projects.vercel.app',
  'http://localhost:3000'
];

// Use the cors middleware with proper configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests globally
app.options('*', cors());

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

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    console.log('🔄 Attempting MongoDB connection...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

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
    environment: process.env.NODE_ENV,
    cors: {
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    }
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
      environment: process.env.NODE_ENV,
      mongodb: {
        connected: dbConnected,
        state: mongoose.connection.readyState,
      },
      cors: {
        allowedOrigins: allowedOrigins,
        yourOrigin: req.headers.origin
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
      }
    });
  }
});

// Enhanced CORS test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    headers: {
      'access-control-allow-origin': req.headers.origin,
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With, Accept'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      yourOrigin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }
  
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
    message: 'Route not found: ' + req.originalUrl
  });
});

// ✅ SIMPLE EXPORT FOR VERCEL
module.exports = app;

// Only listen locally in development
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 CORS test: http://localhost:${PORT}/api/test-cors`);
    console.log(`🌐 Allowed origins:`, allowedOrigins);
  });
}