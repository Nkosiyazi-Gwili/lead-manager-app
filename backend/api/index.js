// api/index.js - COMPLETE WITH ALL ROUTES
const express = require('express');

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

// ==================== BASIC ENDPOINTS ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Backend API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Health check passed',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Test CORS endpoint
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
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body.email);
  
  res.json({
    success: true,
    message: 'Login successful',
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: '1',
      name: 'Test User',
      email: req.body.email,
      role: 'admin',
      department: 'IT',
      isActive: true
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register attempt:', req.body);
  
  res.json({
    success: true,
    message: 'Registration successful',
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: '2',
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'user',
      department: req.body.department || 'General',
      isActive: true
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  res.json({
    success: true,
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@company.com',
      role: 'admin',
      department: 'IT',
      isActive: true
    }
  });
});

// ==================== LEADS ROUTES ====================
app.get('/api/leads', (req, res) => {
  const mockLeads = [
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
  
  res.json({
    success: true,
    leads: mockLeads,
    total: mockLeads.length,
    page: 1,
    limit: 10
  });
});

app.post('/api/leads', (req, res) => {
  console.log('➕ Create lead:', req.body);
  
  res.json({
    success: true,
    message: 'Lead created successfully',
    lead: {
      id: '3',
      ...req.body,
      leadStatus: 'new',
      createdAt: new Date().toISOString()
    }
  });
});

app.put('/api/leads/:id', (req, res) => {
  console.log('✏️ Update lead:', req.params.id, req.body);
  
  res.json({
    success: true,
    message: 'Lead updated successfully',
    lead: {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  });
});

app.delete('/api/leads/:id', (req, res) => {
  console.log('🗑️ Delete lead:', req.params.id);
  
  res.json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

// ==================== IMPORT ROUTES ====================
app.post('/api/leads/import/csv', (req, res) => {
  console.log('📥 CSV import attempt');
  
  res.json({
    success: true,
    message: 'CSV import completed successfully',
    leads: [
      {
        id: 'csv-1',
        companyTradingName: 'CSV Import Company',
        name: 'CSV',
        surname: 'User',
        emailAddress: 'csv@example.com',
        mobileNumber: '+27781112233',
        leadStatus: 'new',
        source: 'csv_import'
      }
    ],
    importedCount: 1,
    errorCount: 0
  });
});

app.post('/api/leads/import/excel', (req, res) => {
  console.log('📥 Excel import attempt');
  
  res.json({
    success: true,
    message: 'Excel import completed successfully',
    leads: [
      {
        id: 'excel-1',
        companyTradingName: 'Excel Import Company',
        name: 'Excel',
        surname: 'User',
        emailAddress: 'excel@example.com',
        mobileNumber: '+27784445566',
        leadStatus: 'new',
        source: 'excel_import'
      }
    ],
    importedCount: 1,
    errorCount: 0
  });
});

app.post('/api/leads/import/meta', (req, res) => {
  console.log('📥 Meta import attempt:', req.body);
  
  res.json({
    success: true,
    message: 'Meta import completed successfully',
    leads: [
      {
        id: 'meta-1',
        companyTradingName: 'Meta Lead Company',
        name: 'Meta',
        surname: 'User',
        emailAddress: 'meta@example.com',
        mobileNumber: '+27789998877',
        leadStatus: 'new',
        source: 'meta_forms',
        metaFormId: req.body.formId,
        metaBusinessId: req.body.businessId
      }
    ],
    importedCount: 1,
    errorCount: 0
  });
});

// ==================== META ROUTES ====================
app.post('/api/meta/setup', (req, res) => {
  console.log('🔧 Meta setup:', req.body.accessToken ? 'Token provided' : 'No token');
  
  res.json({
    success: true,
    message: 'Meta access configured successfully'
  });
});

app.get('/api/meta/businesses', (req, res) => {
  const mockBusinesses = [
    {
      id: 'business_123',
      name: 'Tech Solutions SA',
      verification_status: 'verified'
    },
    {
      id: 'business_456',
      name: 'Marketing Pro',
      verification_status: 'pending'
    }
  ];
  
  res.json({
    success: true,
    data: mockBusinesses
  });
});

app.get('/api/meta/forms', (req, res) => {
  const pageId = req.query.pageId;
  
  const mockForms = [
    {
      id: 'form_123',
      name: 'Contact Form - Website',
      leads_count: 45,
      status: 'active'
    },
    {
      id: 'form_456',
      name: 'Service Inquiry Form',
      leads_count: 23,
      status: 'active'
    }
  ];
  
  res.json({
    success: true,
    data: mockForms
  });
});

app.post('/api/meta/import-leads', (req, res) => {
  console.log('📥 Meta leads import:', req.body);
  
  res.json({
    success: true,
    message: 'Successfully imported leads from Meta forms',
    leads: [
      {
        id: 'meta_import_1',
        companyTradingName: 'Meta Business Client',
        name: 'James',
        surname: 'Wilson',
        emailAddress: 'james@metabusiness.com',
        mobileNumber: '+27781234567',
        leadStatus: 'new',
        source: 'meta_forms'
      }
    ],
    importedCount: 1
  });
});

// ==================== USERS ROUTES ====================
app.get('/api/users', (req, res) => {
  const mockUsers = [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin',
      department: 'IT',
      isActive: true
    },
    {
      id: '2',
      name: 'Manager User',
      email: 'manager@company.com',
      role: 'manager',
      department: 'Sales',
      isActive: true
    }
  ];
  
  res.json({
    success: true,
    users: mockUsers,
    total: mockUsers.length
  });
});

app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@company.com',
      role: 'admin',
      department: 'IT',
      isActive: true
    }
  });
});

// ==================== REPORTS ROUTES ====================
app.get('/api/reports/leads', (req, res) => {
  const mockReport = {
    totalLeads: 150,
    newLeads: 45,
    contactedLeads: 67,
    convertedLeads: 38,
    conversionRate: 25.3,
    leadsBySource: {
      manual: 50,
      csv_import: 45,
      excel_import: 30,
      meta_forms: 25
    },
    leadsByStatus: {
      new: 45,
      contacted: 67,
      qualified: 25,
      converted: 13
    }
  };
  
  res.json({
    success: true,
    report: mockReport
  });
});

// ==================== ERROR HANDLING ====================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET    /',
      'GET    /api/health',
      'GET    /api/test-cors',
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/auth/me',
      'GET    /api/leads',
      'POST   /api/leads',
      'PUT    /api/leads/:id',
      'DELETE /api/leads/:id',
      'POST   /api/leads/import/csv',
      'POST   /api/leads/import/excel',
      'POST   /api/leads/import/meta',
      'POST   /api/meta/setup',
      'GET    /api/meta/businesses',
      'GET    /api/meta/forms',
      'POST   /api/meta/import-leads',
      'GET    /api/users',
      'GET    /api/users/profile',
      'GET    /api/reports/leads'
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