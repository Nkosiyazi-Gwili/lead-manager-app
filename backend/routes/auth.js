const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Database connection check middleware
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database not available. Please try again later.',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  next();
};

// MongoDB operation with timeout handling
const withTimeout = (operation, timeoutMs = 10000) => {
  return Promise.race([
    operation,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
    )
  ]);
};

// Register - with role-based access control
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], checkDBConnection, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, department } = req.body;

    // Check if user already exists with timeout
    const existingUser = await withTimeout(
      User.findOne({ email }).maxTimeMS(5000)
    );
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine user role based on context
    let finalRole = 'other';
    let finalDepartment = 'other';

    // If request comes from authenticated admin, use provided role
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const requestingUser = await withTimeout(
          User.findById(decoded.id).maxTimeMS(5000)
        );
        
        if (requestingUser && requestingUser.role === 'admin') {
          // Admin can assign any role
          finalRole = role || 'other';
          finalDepartment = department || 'other';
        } else {
          // Non-admin users can only create 'other' role accounts
          finalRole = 'other';
          finalDepartment = 'other';
        }
      } catch (error) {
        // Invalid token or no user - public registration gets 'other' role
        finalRole = 'other';
        finalDepartment = 'other';
      }
    } else {
      // Public registration - always 'other' role
      finalRole = 'other';
      finalDepartment = 'other';
    }

    // Create user with timeout
    const user = await withTimeout(
      User.create({
        name,
        email,
        password,
        role: finalRole,
        department: finalDepartment
      })
    );

    const token = createToken(user._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Database operation timeout') {
      return res.status(503).json({ 
        message: 'Registration timeout. Please try again.',
        code: 'OPERATION_TIMEOUT'
      });
    }
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DATABASE_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
});

// Login
router.post('/login', checkDBConnection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user with timeout
    const user = await withTimeout(
      User.findOne({ email }).select('+password').maxTimeMS(5000)
    );
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password with timeout
    const isPasswordValid = await withTimeout(
      user.correctPassword(password, user.password)
    );
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = createToken(user._id);

    res.json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'Database operation timeout') {
      return res.status(503).json({ 
        message: 'Login timeout. Please try again.',
        code: 'OPERATION_TIMEOUT'
      });
    }
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DATABASE_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
});

// Get current user
router.get('/me', auth, checkDBConnection, async (req, res) => {
  try {
    const user = await withTimeout(
      User.findById(req.user.id).maxTimeMS(5000)
    );
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    
    if (error.message === 'Database operation timeout') {
      return res.status(503).json({ 
        message: 'Request timeout. Please try again.',
        code: 'OPERATION_TIMEOUT'
      });
    }
    
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        message: 'Database unavailable. Please try again later.',
        code: 'DATABASE_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to get user profile',
      code: 'SERVER_ERROR'
    });
  }
});

// Test endpoint - no database required
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth endpoint is working',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;