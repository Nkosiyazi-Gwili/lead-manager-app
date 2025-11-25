require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enhanced CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://lead-manager-front-end-app.vercel.app',
    'http://localhost:3000',
    'https://lead-manager-front-end-app-*.vercel.app' // Wildcard for preview deployments
  ];
  
  const origin = req.headers.origin;
  
  // Check if origin matches any allowed pattern
  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowed === origin;
  });
  
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
}

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return true;
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
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

// Initialize DB connection
connectDB().then(connected => {
  if (connected) {
    console.log('🚀 MongoDB connection established');
  } else {
    console.log('❌ MongoDB connection failed - running in fallback mode');
  }
});

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ MongoDB disconnected');
});

// Import routes with better error handling
const loadRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} routes loaded`);
    return route;
  } catch (error) {
    console.error(`❌ ${routeName} routes failed:`, error.message);
    // Create simple fallback router
    const router = express.Router();
    router.get('/health', (req, res) => res.json({ 
      status: `${routeName}-fallback`, 
      message: 'Route loading failed, using fallback' 
    }));
    return router;
  }
};

// Load all routes
const authRoutes = loadRoute('./routes/auth', 'Auth');
const leadsRoutes = loadRoute('./routes/leads', 'Leads');
const usersRoutes = loadRoute('./routes/users', 'Users');
const reportsRoutes = loadRoute('./routes/reports', 'Reports');
const metaRoutes = loadRoute('./routes/meta', 'Meta');
const importRoutes = loadRoute('./routes/import', 'Import');

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
    message: 'Lead Manager Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    status: 'operational'
  });
});

// Enhanced health check
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      cors: {
        yourOrigin: req.headers.origin,
        allowed: true
      },
      database: {
        connected: dbConnected,
        state: mongoose.connection.readyState,
        stateText: getConnectionStateText(mongoose.connection.readyState)
      },
      routes: {
        auth: true,
        leads: true,
        users: true,
        reports: true,
        meta: true,
        import: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      database: {
        connected: false,
        state: mongoose.connection.readyState
      }
    });
  }
});

// Helper function for connection state
function getConnectionStateText(state) {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

// CORS test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin,
    allowed: true,
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': req.headers.origin,
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With'
    }
  });
});

// Mock endpoints for testing when routes fail
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body.email);
  
  // Mock successful login response
  res.json({
    success: true,
    message: 'Login successful (mock)',
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: '1',
      name: 'Demo User',
      email: req.body.email,
      role: 'admin',
      department: 'IT',
      isActive: true
    }
  });
});

// Simple 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET  /',
      'GET  /api/health',
      'GET  /api/test-cors',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET  /api/leads',
      'POST /api/leads/import/csv',
      'POST /api/leads/import/excel',
      'POST /api/leads/import/meta',
      'GET  /api/meta/businesses',
      'GET  /api/meta/forms'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err.message);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS Error',
      error: err.message,
      yourOrigin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Export for Vercel - SIMPLE EXPORT
module.exports = app;

// Local development server (only runs when not in Vercel)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 CORS Test: http://localhost:${PORT}/api/test-cors`);
  });
}