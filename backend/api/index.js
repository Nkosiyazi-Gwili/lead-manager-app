// api/index.js - WITH MONGODB AUTHENTICATION
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Simple CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url}`);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return true;
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Connect to MongoDB on startup
connectDB();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ API is working!',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState
    }
  });
});

// Health check with DB connection
app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  res.json({
    success: true,
    message: '✅ Health check passed',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: dbConnected,
      state: mongoose.connection.readyState
    }
  });
});

// Test CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: '✅ CORS is working!',
    yourOrigin: req.headers.origin
  });
});

// REAL LOGIN ROUTE WITH MONGODB
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('📧 Login attempt:', { email, password: password ? '***' : 'missing' });

    // Simple validation
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

    // Import User model (simple version)
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      department: String,
      isActive: { type: Boolean, default: true }
    });

    // Remove password when converting to JSON
    userSchema.methods.toJSON = function() {
      const user = this.toObject();
      delete user.password;
      return user;
    };

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
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

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '30d' }
    );

    // Return user data (without password)
    const userResponse = user.toJSON();

    console.log('✅ Login successful for:', email, 'Role:', user.role);

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
      message: 'Server error during login'
    });
  }
});

// REAL REGISTER ROUTE
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    console.log('📝 Register attempt:', { name, email, password: password ? '***' : 'missing' });

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
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

    const User = mongoose.model('User');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '30d' }
    );

    // Return user data (without password)
    const userResponse = user.toJSON();

    console.log('✅ Registration successful for:', email);

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

// Auth middleware
const authMiddleware = async (req, res, next) => {
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
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );

    // Ensure DB connection
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const User = mongoose.model('User');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// GET CURRENT USER (PROTECTED)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// TEST PROTECTED ROUTE
app.get('/api/auth/protected-test', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: '✅ Protected route accessed successfully!',
    user: req.user.toJSON()
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
  console.error('Server error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Simple export
module.exports = app;