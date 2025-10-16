const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// ========== STARTUP LOGS ==========
console.log('🔍 Starting Server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '*** SET ***' : 'MISSING');

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
  'http://localhost:3000',
  'https://lead-manager-app-psi.vercel.app'
];

// Manual CORS Middleware (Vercel-safe)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ========== BODY PARSER ==========
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working without database',
    environment: process.env.NODE_ENV
  });
});

// ========== DATABASE CONNECTION ==========
let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return true;
  }

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

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        bufferCommands: true,
        bufferMaxEntries: 0,
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

// ========== DB CONNECTION MIDDLEWARE ==========
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

app.use('/api/', withDB);

// ========== ROUTES ==========
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.log('❌ Auth routes failed:', error.message);
  app.post('/api/auth/login', (req, res) => {
    if (!req.dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database not available. Please try again.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    res.status(500).json({ success: false, message: 'Auth system error' });
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

try {
  console.log('📁 Loading meta routes...');
  const metaRoutes = require('./routes/meta');
  app.use('/api/meta', metaRoutes);
  console.log('✅ Meta routes loaded successfully');
} catch (error) {
  console.error('❌ FAILED to load meta routes:', error.message);
}

// ========== ERROR HANDLING ==========
app.use((error, req, res, next) => {
  console.error('Server error:', error);

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

// ========== 404 HANDLERS ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// ========== EXPORT FOR VERCEL ==========
module.exports = app;
