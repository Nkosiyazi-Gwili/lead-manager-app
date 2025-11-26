// server.js - SELF-CONTAINED WORKING VERSION
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// MANUAL CORS - GUARANTEED TO WORK
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'https://lead-manager-front-end-app-git-main-gwilinkosiyazis-projects.vercel.app',
  'https://lead-manager-front-end-app-gwilinkosiyazis-projects.vercel.app',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight request handled for:', origin);
    return res.status(200).end();
  }
  
  console.log(`📍 ${req.method} ${req.path} from: ${origin}`);
  next();
});

app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Connect to DB
connectDB();

// Simple User Model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  department: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ===== AUTH ROUTES - INCLUDED DIRECTLY =====

// LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📧 Login attempt received');
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Ensure DB connection
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    const userResponse = user.toJSON();

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// REGISTER ROUTE
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    // Create token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// GET CURRENT USER
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-key'
    );

    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('❌ Auth check error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// ===== BASIC ROUTES =====

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Smart Register API is running!',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    yourOrigin: req.headers.origin
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  res.json({
    success: true,
    message: '✅ Server is healthy',
    timestamp: new Date().toISOString(),
    mongodb: dbConnected ? 'connected' : 'disconnected',
    yourOrigin: req.headers.origin
  });
});

// CORS test
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: '✅ CORS is working!',
    yourOrigin: req.headers.origin,
    allowedOrigins: allowedOrigins
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
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
    console.log(`🔗 Login: http://localhost:${PORT}/api/auth/login`);
    console.log(`🌐 Allowed origins:`, allowedOrigins);
  });
}