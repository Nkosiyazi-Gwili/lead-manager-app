const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads - Vercel compatible
const storage = multer.memoryStorage(); // Use memory storage for Vercel
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
    }
  }
});

// Get all leads with pagination and filtering - IMPROVED
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'sales_agent' || req.user.role === 'marketing_agent') {
      filter.assignedTo = req.user.id;
    }

    // Filter by status
    if (req.query.status && req.query.status !== '') {
      filter.leadStatus = req.query.status;
    }

    // Filter by source
    if (req.query.source && req.query.source !== '') {
      filter.leadSource = req.query.source;
    }

    // Search functionality
    if (req.query.search && req.query.search !== '') {
      filter.$or = [
        { companyTradingName: { $regex: req.query.search, $options: 'i' } },
        { companyRegisteredName: { $regex: req.query.search, $options: 'i' } },
        { name: { $regex: req.query.search, $options: 'i' } },
        { surname: { $regex: req.query.search, $options: 'i' } },
        { emailAddress: { $regex: req.query.search, $options: 'i' } },
        { mobileNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Build query
    const query = Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [leads, total] = await Promise.all([
      query.exec(),
      Lead.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalLeads: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching leads',
      error: error.message 
    });
  }
});

// Get single lead - IMPROVED
router.get('/:id', auth, async (req, res) => {
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

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lead',
      error: error.message 
    });
  }
});

// Create new lead - IMPROVED
router.post('/', auth, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user.id
    };

    const lead = await Lead.create(leadData);
    await lead.populate('assignedTo', 'name email role');
    await lead.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error('Create lead error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating lead',
      error: error.message 
    });
  }
});

// Update lead - IMPROVED
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error('Update lead error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error updating lead',
      error: error.message 
    });
  }
});

// Import from CSV - IMPROVED for Vercel
router.post('/import/csv', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    const results = [];
    const leads = [];

    // Process CSV from buffer (Vercel compatible)
    const fileBuffer = req.file.buffer;
    
    return new Promise((resolve, reject) => {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      bufferStream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            for (const row of results) {
              const leadData = mapCSVRowToLead(row, req.user.id);
              leads.push(leadData);
            }

            if (leads.length === 0) {
              return res.status(400).json({
                success: false,
                message: 'No valid data found in CSV file'
              });
            }

            const createdLeads = await Lead.insertMany(leads);

            res.json({ 
              success: true,
              message: `${createdLeads.length} leads imported successfully`, 
              data: createdLeads 
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(new Error('Error processing CSV file: ' + error.message));
        });
    }).catch(error => {
      console.error('CSV import error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Import from Excel - IMPROVED for Vercel
router.post('/import/excel', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    // Process Excel from buffer (Vercel compatible)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in Excel file'
      });
    }

    const leads = data.map(row => mapExcelRowToLead(row, req.user.id));
    const createdLeads = await Lead.insertMany(leads);

    res.json({ 
      success: true,
      message: `${createdLeads.length} leads imported successfully`, 
      data: createdLeads 
    });
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Assign lead - IMPROVED
router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'assignedTo field is required'
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true, runValidators: true }
    )
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
      data: lead,
      message: 'Lead assigned successfully'
    });
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error assigning lead',
      error: error.message 
    });
  }
});

// Import from Meta Business
router.post('/import/meta', auth, async (req, res) => {
  try {
    // For now, simulate Meta import since we need proper setup
    // In production, this would call the actual Meta API
    
    const mockLeads = [
      {
        name: 'Meta',
        surname: 'User 1',
        emailAddress: 'meta1@example.com',
        mobileNumber: '+27781112233',
        companyTradingName: 'Meta Business Client',
        leadSource: 'meta_business',
        createdBy: req.user.id,
        metaData: {
          source: 'meta_business_simulation'
        }
      },
      {
        name: 'Meta', 
        surname: 'User 2',
        emailAddress: 'meta2@example.com',
        mobileNumber: '+27784445566',
        companyTradingName: 'Another Meta Client',
        leadSource: 'meta_business',
        createdBy: req.user.id,
        metaData: {
          source: 'meta_business_simulation'
        }
      }
    ];

    const createdLeads = await Lead.insertMany(mockLeads);

    res.json({
      success: true,
      message: `${createdLeads.length} demo leads imported from Meta Business`,
      data: createdLeads,
      note: 'This is a simulation. Configure Meta API access for real integration.'
    });
  } catch (error) {
    console.error('Meta import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing from Meta',
      error: error.message
    });
  }
});

// Update lead status - IMPROVED
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status field is required'
      });
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { leadStatus: status },
      { new: true, runValidators: true }
    )
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
      data: lead,
      message: 'Lead status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating lead status',
      error: error.message 
    });
  }
});

// Add note to lead - IMPROVED
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            content: content.trim(),
            createdBy: req.user.id
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    res.json({
      success: true,
      data: lead,
      message: 'Note added successfully'
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

// Delete lead - NEW ENDPOINT
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting lead',
      error: error.message 
    });
  }
});

// Get lead statistics - NEW ENDPOINT
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let filter = {};
    
    // Role-based filtering for stats
    if (req.user.role === 'sales_agent' || req.user.role === 'marketing_agent') {
      filter.assignedTo = req.user.id;
    }

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      closedWonLeads,
      sourceStats
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, leadStatus: 'new' }),
      Lead.countDocuments({ ...filter, leadStatus: 'contacted' }),
      Lead.countDocuments({ ...filter, leadStatus: 'qualified' }),
      Lead.countDocuments({ ...filter, leadStatus: 'closed_won' }),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: totalLeads,
        new: newLeads,
        contacted: contactedLeads,
        qualified: qualifiedLeads,
        closedWon: closedWonLeads,
        sources: sourceStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching statistics',
      error: error.message 
    });
  }
});

// Helper functions for mapping imported data
function mapCSVRowToLead(row, userId) {
  return {
    leadSource: 'csv_import',
    createdBy: userId,
    companyRegisteredName: row.company_registered_name || row.companyRegisteredName || '',
    companyTradingName: row.company_trading_name || row.companyTradingName || '',
    address: row.address || '',
    name: row.name || '',
    surname: row.surname || '',
    occupation: row.occupation || '',
    website: row.website || '',
    telephoneNumber: row.telephone_number || row.telephoneNumber || '',
    mobileNumber: row.mobile_number || row.mobileNumber || '',
    whatsappNumber: row.whatsapp_number || row.whatsappNumber || '',
    industry: row.industry || '',
    numberOfEmployees: row.number_of_employees ? parseInt(row.number_of_employees) : undefined,
    bbbeeLevel: row.bbbee_level || row.bbbeeLevel || '',
    numberOfBranches: row.number_of_branches ? parseInt(row.number_of_branches) : undefined,
    emailAddress: row.email_address || row.emailAddress || '',
    annualTurnover: row.annual_turnover || row.annualTurnover || '',
    tradingHours: row.trading_hours || row.tradingHours || '',
    directorsName: row.directors_name || row.directorsName || '',
    directorsSurname: row.directors_surname || row.directorsSurname || '',
    socialMediaHandles: row.social_media_handles || row.socialMediaHandles || ''
  };
}

function mapExcelRowToLead(row, userId) {
  return {
    leadSource: 'csv_import',
    createdBy: userId,
    companyRegisteredName: row.company_registered_name || row.companyRegisteredName || '',
    companyTradingName: row.company_trading_name || row.companyTradingName || '',
    address: row.address || '',
    name: row.name || '',
    surname: row.surname || '',
    occupation: row.occupation || '',
    website: row.website || '',
    telephoneNumber: row.telephone_number || row.telephoneNumber || '',
    mobileNumber: row.mobile_number || row.mobileNumber || '',
    whatsappNumber: row.whatsapp_number || row.whatsappNumber || '',
    industry: row.industry || '',
    numberOfEmployees: row.number_of_employees || row.numberOfEmployees,
    bbbeeLevel: row.bbbee_level || row.bbbeeLevel || '',
    numberOfBranches: row.number_of_branches || row.numberOfBranches,
    emailAddress: row.email_address || row.emailAddress || '',
    annualTurnover: row.annual_turnover || row.annualTurnover || '',
    tradingHours: row.trading_hours || row.tradingHours || '',
    directorsName: row.directors_name || row.directorsName || '',
    directorsSurname: row.directors_surname || row.directorsSurname || '',
    socialMediaHandles: row.social_media_handles || row.socialMediaHandles || ''
  };
}

module.exports = router;