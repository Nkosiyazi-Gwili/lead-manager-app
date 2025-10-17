const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// PRODUCTION CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://lead-manager-app-psi.vercel.app',
  'https://lead-manager-app.vercel.app',
  /https:\/\/lead-manager-app-.*\.vercel\.app/,
  /https:\/\/lead-manager-.*-nkosiyazi-gwili\.vercel\.app/
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('✅ CORS allowed for:', origin);
      return callback(null, true);
    } else {
      console.log('🚫 CORS blocked for:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// Test CORS endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    origin: req.headers.origin,
    allowed: true,
    timestamp: new Date().toISOString()
  });
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

// Database connection
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

// Import routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/users', require('./routes/users'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS enabled for production`);
  });
};

startServer();

module.exports = app;