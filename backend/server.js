// server.js - WITH BUILT-IN MONGODB URI
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'https://lead-manager-front-end-app-git-main-gwilinkosiyazis-projects.vercel.app',
  'https://lead-manager-front-end-app-gwilinkosiyazis-projects.vercel.app',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// MongoDB connection - WITH FALLBACK URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';

console.log('🔗 MongoDB URI:', MONGODB_URI ? '***' + MONGODB_URI.slice(-20) : 'Not found');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return true;
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Connect to database
connectDB();

// User Model (matches your seed data)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  department: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Remove password when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ===== ROUTES =====

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Smart Register Backend API',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  res.json({
    success: true,
    message: dbConnected ? '✅ Server is healthy' : '❌ Database disconnected',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      state: mongoose.connection.readyState
    },
    environment: process.env.NODE_ENV || 'development'
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

// DEBUG: Check all users in database
app.get('/api/auth/debug-users', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({}).select('-password').limit(20);
    const userCount = await User.countDocuments();

    console.log(`📊 Found ${userCount} users in database`);

    res.json({
      success: true,
      message: `Found ${userCount} users in database`,
      users: users,
      count: userCount
    });

  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking users: ' + error.message
    });
  }
});

// REAL LOGIN - DATABASE ONLY
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.email);
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Ensure database connection
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    // Find user by email (case insensitive)
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

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

    // Verify password
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
      process.env.JWT_SECRET || 'fallback-secret-key-for-development',
      { expiresIn: '30d' }
    );

    const userResponse = user.toJSON();

    console.log('✅ Login successful for:', user.email, 'Role:', user.role);

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

// REAL REGISTER - DATABASE ONLY
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    console.log('📝 Registration attempt for:', email);

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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role,
      isActive: true
    });

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret-key-for-development',
      { expiresIn: '30d' }
    );

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
      message: 'Server error during registration',
      error: error.message
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
      process.env.JWT_SECRET || 'fallback-secret-key-for-development'
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

// GET CURRENT USER - PROTECTED
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : error.message
  });
});

// Export for Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Debug Users: http://localhost:${PORT}/api/auth/debug-users`);
    console.log(`🔗 Login: http://localhost:${PORT}/api/auth/login`);
  });
}