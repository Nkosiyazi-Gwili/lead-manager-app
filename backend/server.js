// server.js - COMPLETE SELF-CONTAINED VERSION FOR VERCEL
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const axios = require('axios');

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

console.log('🔗 MongoDB URI:', MONGODB_URI ? '***' + MONGODB_URI.slice(-20) : 'Not found');

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
  role: { type: String, required: true, enum: ['admin', 'sales_manager', 'sales_agent', 'marketing_manager', 'marketing_agent', 'user'] },
  department: { type: String, enum: ['sales', 'marketing', null] },
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
  
  // Eskils specific fields
  idNumber: String,
  dateOfBirth: Date,
  disability: String,
  gender: String,
  race: String,
  postalCode: String,
  course: String,
  level: String,
  studyMode: String,
  
  // Meta Business specific fields
  metaAdId: String,
  metaFormId: String,
  metaCampaignId: String,
  metaData: Object,
  
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

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Manager middleware
const managerMiddleware = (req, res, next) => {
  const managerRoles = ['admin', 'sales_manager', 'marketing_manager'];
  if (!managerRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Manager privileges required.'
    });
  }
  next();
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// ===== BASIC ROUTES =====

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Lead Manager Backend API',
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

// ===== AUTH ROUTES =====

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

// LOGIN
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

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
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

// REGISTER
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

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role,
      isActive: true
    });

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

// GET CURRENT USER
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

// ===== USER ROUTES =====

// GET ALL USERS (Admin only)
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
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
    const { page = 1, limit = 10, status, source, assignedTo } = req.query;
    
    const filter = {};
    if (status) filter.leadStatus = status;
    if (source) filter.leadSource = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // If user is not admin, only show their assigned leads or leads they created
    if (req.user.role !== 'admin') {
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
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
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if user has permission to view this lead
    if (req.user.role !== 'admin' && 
        lead.assignedTo?._id.toString() !== req.user._id.toString() && 
        lead.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this lead'
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
      message: 'Error creating lead',
      error: error.message
    });
  }
});

// UPDATE LEAD
app.put('/api/leads/:id', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        lead.assignedTo?.toString() !== req.user._id.toString() && 
        lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update this lead'
      });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email role')
     .populate('createdBy', 'name email');

    console.log('✅ Lead updated:', updatedLead._id);

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: updatedLead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
      error: error.message
    });
  }
});

// ADD NOTE TO LEAD
app.post('/api/leads/:id/notes', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        lead.assignedTo?.toString() !== req.user._id.toString() && 
        lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to add note to this lead'
      });
    }

    lead.notes.push({
      content,
      createdBy: req.user._id
    });

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    console.log('✅ Note added to lead:', lead._id);

    res.json({
      success: true,
      message: 'Note added successfully',
      data: updatedLead
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note',
      error: error.message
    });
  }
});

// ===== IMPORT ROUTES =====

// IMPORT LEADS FROM FILE
app.post('/api/leads/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const leads = [];
    const errors = [];

    if (req.file.mimetype === 'text/csv') {
      // Process CSV
      const csvData = req.file.buffer.toString();
      const rows = csvData.split('\n').filter(row => row.trim());
      
      // Skip header row and process data
      for (let i = 1; i < rows.length; i++) {
        try {
          const columns = rows[i].split(',').map(col => col.trim());
          
          const leadData = {
            leadSource: 'csv_import',
            leadStatus: 'new',
            companyTradingName: columns[0] || '',
            name: columns[1] || '',
            surname: columns[2] || '',
            emailAddress: columns[3] || '',
            mobileNumber: columns[4] || '',
            industry: columns[5] || '',
            createdBy: req.user._id
          };

          leads.push(leadData);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }
    } else {
      // Process Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      jsonData.forEach((row, index) => {
        try {
          const leadData = {
            leadSource: 'csv_import',
            leadStatus: 'new',
            companyTradingName: row['Company Name'] || row['company'] || '',
            name: row['First Name'] || row['name'] || '',
            surname: row['Last Name'] || row['surname'] || '',
            emailAddress: row['Email'] || row['email'] || '',
            mobileNumber: row['Phone'] || row['Mobile'] || row['phone'] || '',
            industry: row['Industry'] || row['industry'] || '',
            createdBy: req.user._id
          };

          leads.push(leadData);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      });
    }

    // Insert leads into database
    if (leads.length > 0) {
      const insertedLeads = await Lead.insertMany(leads, { ordered: false });
      
      console.log(`✅ Imported ${insertedLeads.length} leads from file`);

      res.json({
        success: true,
        message: `Successfully imported ${insertedLeads.length} leads`,
        imported: insertedLeads.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No valid leads found in file',
        errors
      });
    }

  } catch (error) {
    console.error('Import leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing leads',
      error: error.message
    });
  }
});

// ===== META ROUTES =====

// META BUSINESS WEBHOOK
app.post('/api/meta/webhook', async (req, res) => {
  try {
    console.log('📱 Meta webhook received:', req.body);
    
    // Verify webhook signature (you should implement this)
    const { entry } = req.body;
    
    if (!entry || !Array.isArray(entry)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data'
      });
    }

    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    let processedCount = 0;

    for (const item of entry) {
      try {
        if (item.changes && Array.isArray(item.changes)) {
          for (const change of item.changes) {
            if (change.field === 'leadgen' && change.value) {
              const leadData = change.value;
              
              const metaLead = {
                leadSource: 'meta_business',
                leadStatus: 'new',
                name: leadData.first_name || '',
                surname: leadData.last_name || '',
                emailAddress: leadData.email || '',
                mobileNumber: leadData.phone_number || '',
                metaAdId: leadData.ad_id || '',
                metaFormId: leadData.form_id || '',
                metaCampaignId: leadData.campaign_id || '',
                metaData: leadData,
                createdBy: null // System generated
              };

              await Lead.create(metaLead);
              processedCount++;
              console.log('✅ Meta lead processed:', leadData.id);
            }
          }
        }
      } catch (leadError) {
        console.error('Error processing meta lead:', leadError);
      }
    }

    res.json({
      success: true,
      message: `Processed ${processedCount} meta leads`,
      processed: processedCount
    });

  } catch (error) {
    console.error('Meta webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing meta webhook'
    });
  }
});

// GET META LEAD STATS
app.get('/api/meta/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      { $match: { leadSource: 'meta_business' } },
      {
        $group: {
          _id: '$leadStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalMetaLeads = await Lead.countDocuments({ leadSource: 'meta_business' });

    res.json({
      success: true,
      data: {
        total: totalMetaLeads,
        byStatus: stats
      }
    });
  } catch (error) {
    console.error('Meta stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meta statistics'
    });
  }
});

// ===== REPORT ROUTES =====

// GET LEAD STATISTICS
app.get('/api/reports/lead-stats', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    
    // If user is not admin, only show their stats
    if (req.user.role !== 'admin') {
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const totalLeads = await Lead.countDocuments(filter);
    
    const statusStats = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$leadStatus', count: { $sum: 1 } } }
    ]);

    const sourceStats = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$leadSource', count: { $sum: 1 } } }
    ]);

    const monthlyStats = await Lead.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        statusStats,
        sourceStats,
        monthlyStats
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

// ===== 404 & ERROR HANDLERS =====

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
    console.log(`🔗 Leads: http://localhost:${PORT}/api/leads`);
    console.log(`🔗 Import: http://localhost:${PORT}/api/leads/import`);
    console.log(`🔗 Meta: http://localhost:${PORT}/api/meta/webhook`);
    console.log(`🔗 Reports: http://localhost:${PORT}/api/reports/lead-stats`);
  });
}