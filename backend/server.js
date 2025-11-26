// server.js - MINIMAL WORKING VERSION FOR VERCEL
const express = require('express');
const app = express();

// SIMPLE CORS - ALLOW ALL ORIGINS FOR TESTING
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// SIMPLE LOGGING
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== BASIC ROUTES =====

// Root endpoint - ALWAYS WORKS
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Backend is running on Vercel!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Health check passed',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS test
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: '✅ CORS is working!',
    yourOrigin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// SIMPLE LOGIN ENDPOINT (MOCK DATA)
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Mock successful login - ALWAYS RETURNS SUCCESS
    const mockUser = {
      id: '12345',
      name: 'Test User',
      email: email,
      role: 'user'
    };

    const mockToken = 'mock_jwt_token_' + Date.now();

    console.log('✅ Mock login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful (mock)',
      token: mockToken,
      user: mockUser
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// SIMPLE REGISTER ENDPOINT
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Mock registration
    const mockUser = {
      id: '67890',
      name: name,
      email: email,
      role: 'user'
    };

    const mockToken = 'mock_jwt_token_' + Date.now();

    res.status(201).json({
      success: true,
      message: 'User registered successfully (mock)',
      token: mockToken,
      user: mockUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// GET CURRENT USER (MOCK)
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
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ✅ SIMPLE EXPORT - NO COMPLEX LOGIC
module.exports = app;

// Local development (optional)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  });
}