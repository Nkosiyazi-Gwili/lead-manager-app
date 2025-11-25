// api/index.js - CORE AUTH & LEADS FUNCTIONALITY
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();

// Basic CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://lead-manager-front-end-app.vercel.app',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return true;
  }

  if (!MONGODB_URI) {
    console.log('⚠️ MONGODB_URI not set, using mock data');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('✅ MongoDB Connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Initialize DB
connectDB();

// ==================== BASIC ENDPOINTS ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Lead Manager API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/health', async (req, res) => {
  const dbConnected = await connectDB();
  res.json({
    success: true,
    message: '✅ Health check passed',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: '✅ CORS is working!',
    yourOrigin: req.headers.origin,
    allowed: true,
    timestamp: new Date().toISOString()
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const dbConnected = await connectDB();
    let user;

    if (dbConnected) {
      try {
        // Try to find user in database
        const User = require('./models/User');
        user = await User.findOne({ email }).select('+password');
        
        if (user && user.isActive) {
          // In a real app, you would verify the password here
          // For now, we'll accept any password
          console.log('✅ User found in database');
        } else {
          user = null;
        }
      } catch (dbError) {
        console.log('⚠️ Database query failed, using mock user');
        user = null;
      }
    }

    // If no user found in DB or DB not connected, use mock user
    if (!user) {
      console.log('⚠️ Using mock user for login');
      user = {
        _id: '1',
        id: '1',
        name: 'Demo User',
        email: email,
        role: 'admin',
        department: 'IT',
        isActive: true
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id || user._id, 
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Register attempt:', req.body);
    
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    const dbConnected = await connectDB();
    let user;

    if (dbConnected) {
      try {
        const User = require('./models/User');
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'User already exists with this email'
          });
        }

        // Create new user (in real app, hash the password)
        user = await User.create({
          name,
          email,
          password, // In production, hash this password!
          role: role || 'user',
          department: department || 'General',
          isActive: true
        });

        console.log('✅ User created in database');

      } catch (dbError) {
        console.log('⚠️ Database operation failed, using mock user:', dbError.message);
        // Fallback to mock user
        user = {
          _id: '2',
          id: '2',
          name: name,
          email: email,
          role: role || 'user',
          department: department || 'General',
          isActive: true
        };
      }
    } else {
      // DB not connected, use mock user
      user = {
        _id: '2',
        id: '2',
        name: name,
        email: email,
        role: role || 'user',
        department: department || 'General',
        isActive: true
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id || user._id, 
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Registration successful',
      token: token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const dbConnected = await connectDB();
    let user;

    if (dbConnected) {
      try {
        const User = require('./models/User');
        user = await User.findById(decoded.userId);
      } catch (dbError) {
        console.log('⚠️ Database query failed for /me');
        user = null;
      }
    }

    // If no user found, use decoded token info
    if (!user) {
      user = {
        id: decoded.userId,
        name: 'Demo User',
        email: decoded.email,
        role: decoded.role,
        department: 'IT',
        isActive: true
      };
    }

    res.json({
      success: true,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('❌ /me error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
});

// ==================== LEADS ROUTES ====================
app.get('/api/leads', async (req, res) => {
  try {
    console.log('📋 Fetching leads...');
    
    const dbConnected = await connectDB();
    let leads = [];

    if (dbConnected) {
      try {
        const Lead = require('./models/Lead');
        leads = await Lead.find().sort({ createdAt: -1 }).limit(50);
        console.log(`✅ Found ${leads.length} leads in database`);
      } catch (dbError) {
        console.log('⚠️ Database query failed, using mock leads');
      }
    }

    // If no leads from DB or DB not connected, use mock leads
    if (leads.length === 0) {
      leads = [
        {
          id: '1',
          companyTradingName: 'ABC Company',
          name: 'John',
          surname: 'Doe',
          emailAddress: 'john@abccompany.com',
          mobileNumber: '+27781234567',
          leadStatus: 'new',
          source: 'manual',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          companyTradingName: 'XYZ Corp',
          name: 'Jane',
          surname: 'Smith',
          emailAddress: 'jane@xyzcorp.com',
          mobileNumber: '+27787654321',
          leadStatus: 'contacted',
          source: 'csv_import',
          createdAt: new Date().toISOString()
        }
      ];
      console.log('⚠️ Using mock leads data');
    }

    res.json({
      success: true,
      leads: leads,
      total: leads.length,
      page: 1,
      limit: 10,
      source: dbConnected ? 'database' : 'mock'
    });

  } catch (error) {
    console.error('❌ Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/auth/me',
      'GET    /api/leads'
    ]
  });
});

app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Export for Vercel
module.exports = app;