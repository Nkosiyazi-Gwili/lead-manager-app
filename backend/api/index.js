// api/index.js - MINIMAL WORKING VERSION WITH LOGIN
const express = require('express');

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

// Root endpoint - SIMPLE AND GUARANTEED TO WORK
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ API is working!',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Health check passed',
    timestamp: new Date().toISOString()
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

// LOGIN ROUTE - ADDED HERE
app.post('/api/auth/login', (req, res) => {
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

    // Mock login - ALWAYS SUCCESS FOR TESTING
    // In production, you'd validate against a database
    const mockUser = {
      id: '12345',
      name: 'Test User',
      email: email,
      role: 'user'
    };

    // Mock token
    const mockToken = 'mock_jwt_token_' + Date.now();

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token: mockToken,
      user: mockUser
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// REGISTER ROUTE - ADDED FOR COMPLETENESS
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Register attempt:', { name, email, password: password ? '***' : 'missing' });

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const mockUser = {
      id: '67890',
      name: name,
      email: email,
      role: 'user'
    };

    const mockToken = 'mock_jwt_token_' + Date.now();

    console.log('✅ Registration successful for:', email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: mockToken,
      user: mockUser
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
app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Mock user data
    const mockUser = {
      id: '12345',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };

    res.json({
      success: true,
      user: mockUser
    });

  } catch (error) {
    console.error('❌ Auth check error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
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
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Simple export
module.exports = app;