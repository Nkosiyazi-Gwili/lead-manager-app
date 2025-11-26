require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();

// Fix for Mongoose 6.x
mongoose.set('strictQuery', true);

// CORS Configuration
const allowedOrigins = [
  'https://lead-manager-front-end-app.vercel.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.url);
  next();
});

// SIMPLIFIED MongoDB connection for Vercel
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not set, using fallback mode');
      return false;
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Import routes with better error handling
const loadRoutes = () => {
  try {
    const authRoutes = require('./routes/auth');
    const leadsRoutes = require('./routes/leads');
    const usersRoutes = require('./routes/users');
    const reportsRoutes = require('./routes/reports');
    const metaRoutes = require('./routes/meta');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/meta', metaRoutes);
    
    console.log('✅ All routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading routes:', error.message);
    
    // Create fallback routes that don't crash
    const createFallbackRoute = (path) => {
      app.use(path, (req, res) => {
        res.json({ 
          success: false, 
          message: `Service temporarily unavailable - ${path} routes failed to load`,
          error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
      });
    };
    
    createFallbackRoute('/api/auth');
    createFallbackRoute('/api/leads');
    createFallbackRoute('/api/users');
    createFallbackRoute('/api/reports');
    createFallbackRoute('/api/meta');
  }
};

// Initialize routes
loadRoutes();

// ===== DIRECT IMPORT ROUTES =====
// Simple mock auth middleware for import routes
const mockProtect = (req, res, next) => {
  // For now, just allow all requests - you can add proper auth later
  req.user = { id: 'mock-user-id' };
  next();
};

// Helper function to validate lead data
const validateLeadData = (lead) => {
  const errors = [];
  
  if (!lead.name || !lead.surname) {
    errors.push('Name and surname are required');
  }
  
  if (!lead.emailAddress) {
    errors.push('Email address is required');
  } else if (!/\S+@\S+\.\S+/.test(lead.emailAddress)) {
    errors.push('Invalid email format');
  }
  
  if (!lead.mobileNumber) {
    errors.push('Mobile number is required');
  }
  
  return errors;
};

// @desc    Import leads from CSV
// @route   POST /api/leads/import/csv
// @access  Private
app.post('/api/leads/import/csv', mockProtect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const leads = [];
    const errors = [];

    // Parse CSV file
    const csvData = req.file.buffer.toString();
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or has no data rows'
      });
    }

    // Get headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const lead = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            // Map CSV headers to lead fields
            switch(header) {
              case 'company_registered_name':
                lead.companyRegisteredName = values[index];
                break;
              case 'company_trading_name':
                lead.companyTradingName = values[index];
                break;
              case 'name':
                lead.name = values[index];
                break;
              case 'surname':
                lead.surname = values[index];
                break;
              case 'occupation':
                lead.occupation = values[index];
                break;
              case 'website':
                lead.website = values[index];
                break;
              case 'telephone_number':
                lead.telephoneNumber = values[index];
                break;
              case 'mobile_number':
                lead.mobileNumber = values[index];
                break;
              case 'whatsapp_number':
                lead.whatsappNumber = values[index];
                break;
              case 'industry':
                lead.industry = values[index];
                break;
              case 'number_of_employees':
                lead.numberOfEmployees = values[index];
                break;
              case 'bbbee_level':
                lead.bbbeeLevel = values[index];
                break;
              case 'number_of_branches':
                lead.numberOfBranches = values[index];
                break;
              case 'email_address':
                lead.emailAddress = values[index];
                break;
              case 'annual_turnover':
                lead.annualTurnover = values[index];
                break;
              case 'trading_hours':
                lead.tradingHours = values[index];
                break;
              case 'directors_name':
                lead.directorsName = values[index];
                break;
              case 'directors_surname':
                lead.directorsSurname = values[index];
                break;
              case 'social_media_handles':
                lead.socialMediaHandles = values[index];
                break;
              default:
                lead[header] = values[index];
            }
          }
        });

        // Validate lead
        const validationErrors = validateLeadData(lead);
        if (validationErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Add metadata
        lead.source = 'csv_import';
        lead.importedAt = new Date().toISOString();
        lead.leadStatus = 'new';
        lead.createdBy = req.user.id;

        leads.push(lead);

      } catch (rowError) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    console.log(`✅ CSV Import: ${leads.length} valid leads, ${errors.length} errors`);

    res.json({
      success: true,
      message: `CSV import completed. ${leads.length} leads imported successfully.`,
      leads: leads,
      importedCount: leads.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process CSV file',
      error: error.message
    });
  }
});

// @desc    Import leads from Excel
// @route   POST /api/leads/import/excel
// @access  Private
app.post('/api/leads/import/excel', mockProtect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const leads = [];
    const errors = [];

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no data rows'
      });
    }

    // Process each row
    jsonData.forEach((row, index) => {
      try {
        const lead = {
          companyRegisteredName: row.company_registered_name || row.companyRegisteredName,
          companyTradingName: row.company_trading_name || row.companyTradingName,
          name: row.name,
          surname: row.surname,
          occupation: row.occupation,
          website: row.website,
          telephoneNumber: row.telephone_number || row.telephoneNumber,
          mobileNumber: row.mobile_number || row.mobileNumber,
          whatsappNumber: row.whatsapp_number || row.whatsappNumber,
          industry: row.industry,
          numberOfEmployees: row.number_of_employees || row.numberOfEmployees,
          bbbeeLevel: row.bbbee_level || row.bbbeeLevel,
          numberOfBranches: row.number_of_branches || row.numberOfBranches,
          emailAddress: row.email_address || row.emailAddress,
          annualTurnover: row.annual_turnover || row.annualTurnover,
          tradingHours: row.trading_hours || row.tradingHours,
          directorsName: row.directors_name || row.directorsName,
          directorsSurname: row.directors_surname || row.directorsSurname,
          socialMediaHandles: row.social_media_handles || row.socialMediaHandles
        };

        // Validate lead
        const validationErrors = validateLeadData(lead);
        if (validationErrors.length > 0) {
          errors.push(`Row ${index + 2}: ${validationErrors.join(', ')}`);
          return;
        }

        // Add metadata
        lead.source = 'excel_import';
        lead.importedAt = new Date().toISOString();
        lead.leadStatus = 'new';
        lead.createdBy = req.user.id;

        leads.push(lead);

      } catch (rowError) {
        errors.push(`Row ${index + 2}: ${rowError.message}`);
      }
    });

    console.log(`✅ Excel Import: ${leads.length} valid leads, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Excel import completed. ${leads.length} leads imported successfully.`,
      leads: leads,
      importedCount: leads.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file',
      error: error.message
    });
  }
});

// @desc    Import leads from Meta
// @route   POST /api/leads/import/meta
// @access  Private
app.post('/api/leads/import/meta', mockProtect, async (req, res) => {
  try {
    const { formId, businessId } = req.body;

    if (!formId || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'Form ID and Business ID are required'
      });
    }

    console.log(`📥 Importing leads from Meta form: ${formId}, business: ${businessId}`);

    // Mock lead data - in production, you'd call Meta API
    const mockLeads = [
      {
        id: `meta_${Date.now()}_1`,
        companyRegisteredName: 'Meta Lead Company Pty Ltd',
        companyTradingName: 'Meta Lead Company',
        name: 'James',
        surname: 'Wilson',
        emailAddress: 'james.wilson@metalead.com',
        mobileNumber: '+27781234567',
        occupation: 'Marketing Manager',
        industry: 'Digital Marketing',
        leadStatus: 'new',
        source: 'meta_forms',
        metaFormId: formId,
        metaBusinessId: businessId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: req.user.id
      },
      {
        id: `meta_${Date.now()}_2`,
        companyRegisteredName: 'Social Media Solutions Ltd',
        companyTradingName: 'Social Media Pro',
        name: 'Emily',
        surname: 'Chen',
        emailAddress: 'emily.chen@socialpro.com',
        mobileNumber: '+27787654321',
        occupation: 'Business Owner',
        industry: 'Social Media',
        leadStatus: 'new',
        source: 'meta_forms',
        metaFormId: formId,
        metaBusinessId: businessId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: req.user.id
      }
    ];

    console.log(`✅ Imported ${mockLeads.length} leads from Meta`);

    res.json({
      success: true,
      message: `Successfully imported ${mockLeads.length} leads from Meta forms`,
      leads: mockLeads,
      importedCount: mockLeads.length,
      formId,
      businessId
    });

  } catch (error) {
    console.error('Meta leads import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import leads from Meta',
      error: error.message
    });
  }
});

// Test import endpoints
app.get('/api/leads/import/test', (req, res) => {
  res.json({
    success: true,
    message: 'Import endpoints are working!',
    endpoints: {
      csv: 'POST /api/leads/import/csv',
      excel: 'POST /api/leads/import/excel',
      meta: 'POST /api/leads/import/meta'
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      import: 'Available at /api/leads/import/*',
      auth: 'Available at /api/auth/*',
      leads: 'Available at /api/leads/*',
      users: 'Available at /api/users/*'
    }
  });
});

// Health check (works without DB)
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await connectDB();
    res.json({ 
      success: true, 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      mongodb: {
        connected: dbConnected,
        state: mongoose.connection.readyState,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working!',
    yourOrigin: req.headers.origin || 'No origin',
    allowedOrigins: allowedOrigins
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Vercel serverless function export
module.exports = app;

// Only start server if running locally
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}/api/health`);
    console.log(`📥 Import test: http://localhost:${PORT}/api/leads/import/test`);
  });
}