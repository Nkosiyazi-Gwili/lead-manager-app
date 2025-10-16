const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Check if JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generate JWT Token
const generateToken = (userId) => {
  console.log('🔐 Generating JWT token for user:', userId);
  try {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    console.log('✅ Token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ JWT generation failed:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  console.log('🔐 LOGIN REQUEST RECEIVED');
  
  try {
    const { email, password } = req.body;
    console.log('📧 Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log('🔍 Searching for user in database...');
    // Check if user exists with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ User found:', user.email);
    console.log('👤 User details:', {
      id: user._id,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if password matches
    console.log('🔑 Verifying password...');
    const isPasswordMatch = await user.comparePassword(password);
    console.log('✅ Password verification result:', isPasswordMatch);

    if (!isPasswordMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    console.log('📝 Updating last login...');
    user.lastLogin = new Date();
    await user.save();

    // Create token
    console.log('🎫 Generating JWT token...');
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    console.log('✅ LOGIN SUCCESSFUL for:', user.email);
    console.log('📤 Sending response...');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Specific error handling
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoTimeoutError') {
      console.log('❌ Database connection error');
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT error');
      return res.status(500).json({
        success: false,
        message: 'Authentication service error'
      });
    }

    console.log('❌ Generic server error');
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      // Include detailed error in development
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        errorName: error.name
      })
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    console.log('👤 GetMe called for user:', req.user?._id);
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
};

// @desc    Register user (for admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'sales_agent'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user
    });

  } catch (error) {
    console.error('Register error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};