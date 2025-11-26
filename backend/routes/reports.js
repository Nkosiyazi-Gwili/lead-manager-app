// server.js - COMPLETE DATABASE VERSION FOR VERCEL
require('dotenv').config();
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
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gwilinkosiyazi1:v34FQ0k4xFWyPec3@cluster0.1ccukxh.mongodb.net/leadmanager?retryWrites=true&w=majority';

console.log('🔗 MongoDB URI configured');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
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

// ===== MODELS =====

// User Model
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

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Lead Model
const leadSchema = new mongoose.Schema({
  leadSource: { 
    type: String, 
    required: true, 
    enum: ['manual', 'csv_import', 'meta_business', 'eskils', 'other'] 
  },
  leadStatus: { 
    type: String, 
    required: true, 
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    default: 'new'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companyTradingName: String,
  companyRegisteredName: String,
  address: String,
  name: String,
  surname: String,
  emailAddress: String,
  mobileNumber: String,
  telephoneNumber: String,
  industry: String,
  numberOfEmployees: Number,
  bbbeeLevel: String,
  annualTurnover: String,
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// ===== MIDDLEWARE =====

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

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ===== AUTH ROUTES =====

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Lead Manager Backend API',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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
    }
  });
});

// Check database users
app.get('/api/auth/check-users', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const users = await User.find({}).select('-password').limit(10);
    const userCount = await User.countDocuments();

    res.json({
      success: true,
      message: `Found ${userCount} users in database`,
      users: users,
      count: userCount
    });

  } catch (error) {
    console.error('Check users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking users'
    });
  }
});

// LOGIN - REAL DATABASE
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

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

    console.log('✅ Login successful for:', user.email, 'Role:', user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// GET CURRENT USER
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ===== USER ROUTES =====

// GET ALL USERS
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// GET USERS BY ROLE
app.get('/api/users/role/:role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.params;
    
    const users = await User.find({ 
      role, 
      isActive: true 
    }).select('name email role department');

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// ===== LEAD ROUTES =====

// GET ALL LEADS
app.get('/api/leads', authMiddleware, async (req, res) => {
  try {
    const leads = await Lead.find({})
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: leads,
      count: leads.length
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads'
    });
  }
});

// GET LEAD BY ID
app.get('/api/leads/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead'
    });
  }
});

// CREATE LEAD
app.post('/api/leads', authMiddleware, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user._id
    };

    const lead = await Lead.create(leadData);
    
    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email');

    console.log('✅ Lead created:', lead._id);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: populatedLead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lead'
    });
  }
});

// ===== REPORT ROUTES =====

// GET LEAD STATISTICS
app.get('/api/reports/lead-stats', authMiddleware, async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    
    const statusStats = await Lead.aggregate([
      { $group: { _id: '$leadStatus', count: { $sum: 1 } } }
    ]);

    const sourceStats = await Lead.aggregate([
      { $group: { _id: '$leadSource', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        statusStats,
        sourceStats
      }
    });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead statistics'
    });
  }
});

// ===== META ROUTES =====

// META WEBHOOK ENDPOINT
app.post('/api/meta/webhook', async (req, res) => {
  try {
    console.log('Meta webhook received');
    res.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('Meta webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
});

// ===== IMPORT ROUTES =====

// IMPORT LEADS
app.post('/api/leads/import', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Import endpoint ready'
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing leads'
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

// Export for Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
  });
}