const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// SIMPLE CORS FOR LOCAL DEVELOPMENT
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Manual environment configuration for production
console.log('🔍 Checking environment configuration...');

// Manual connection string for production
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

console.log('📋 Configuration:');
console.log('   MONGODB_URI:', MONGODB_URI ? '*** SET ***' : 'MISSING');
console.log('   JWT_SECRET:', JWT_SECRET ? '*** SET ***' : 'MISSING');
console.log('   JWT_EXPIRE:', JWT_EXPIRE);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');

// Validate required configuration - ALLOW DEFAULT IN DEVELOPMENT
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required but not set');
  console.error('💡 Set it in .env file or environment variables');
  process.exit(1);
}

// Only require secure JWT in production
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.error('❌ JWT_SECRET is required but not properly set in production');
    console.error('💡 Set a secure JWT_SECRET in production environment variables');
    process.exit(1);
  }
} else {
  // Development - just warn but don't exit
  if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    console.warn('⚠️  Using default JWT_SECRET in development - change for production');
  }
}

console.log('✅ All required configuration is set');

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
};

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
    console.log(`🔗 CORS enabled for all origins`);
  });
};

startServer();

module.exports = app;