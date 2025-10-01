const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Get all leads with pagination and filtering
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

    if (req.query.status) {
      filter.leadStatus = req.query.status;
    }

    if (req.query.source) {
      filter.leadSource = req.query.source;
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Lead.countDocuments(filter);

    res.json({
      leads,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new lead
router.post('/', auth, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user.id
    };

    const lead = await Lead.create(leadData);
    await lead.populate('assignedTo', 'name email');
    await lead.populate('createdBy', 'name email');

    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update lead
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Import from CSV
router.post('/import/csv', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const leads = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            const leadData = mapCSVRowToLead(row, req.user.id);
            leads.push(leadData);
          }

          const createdLeads = await Lead.insertMany(leads);
          fs.unlinkSync(req.file.path);

          res.json({ 
            message: `${createdLeads.length} leads imported successfully`, 
            leads: createdLeads 
          });
        } catch (error) {
          fs.unlinkSync(req.file.path);
          res.status(400).json({ message: error.message });
        }
      })
      .on('error', (error) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV file' });
      });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
});

// Import from Excel
router.post('/import/excel', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const leads = data.map(row => mapExcelRowToLead(row, req.user.id));
    const createdLeads = await Lead.insertMany(leads);

    fs.unlinkSync(req.file.path);

    res.json({ 
      message: `${createdLeads.length} leads imported successfully`, 
      leads: createdLeads 
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
});

// Assign lead
router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.assignedTo = req.body.assignedTo;
    await lead.save();
    await lead.populate('assignedTo', 'name email');

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update lead status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.leadStatus = req.body.status;
    await lead.save();

    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add note to lead
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.notes.push({
      content: req.body.content,
      createdBy: req.user.id
    });

    await lead.save();
    await lead.populate('notes.createdBy', 'name email');
    
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Helper functions for mapping imported data
function mapCSVRowToLead(row, userId) {
  return {
    leadSource: 'csv_import',
    createdBy: userId,
    companyRegisteredName: row.company_registered_name,
    companyTradingName: row.company_trading_name,
    address: row.address,
    name: row.name,
    surname: row.surname,
    occupation: row.occupation,
    website: row.website,
    telephoneNumber: row.telephone_number,
    mobileNumber: row.mobile_number,
    whatsappNumber: row.whatsapp_number,
    industry: row.industry,
    numberOfEmployees: row.number_of_employees ? parseInt(row.number_of_employees) : undefined,
    bbbeeLevel: row.bbbee_level,
    numberOfBranches: row.number_of_branches ? parseInt(row.number_of_branches) : undefined,
    emailAddress: row.email_address,
    annualTurnover: row.annual_turnover,
    tradingHours: row.trading_hours,
    directorsName: row.directors_name,
    directorsSurname: row.directors_surname,
    socialMediaHandles: row.social_media_handles
  };
}

function mapExcelRowToLead(row, userId) {
  return {
    leadSource: 'csv_import',
    createdBy: userId,
    companyRegisteredName: row.company_registered_name,
    companyTradingName: row.company_trading_name,
    address: row.address,
    name: row.name,
    surname: row.surname,
    occupation: row.occupation,
    website: row.website,
    telephoneNumber: row.telephone_number,
    mobileNumber: row.mobile_number,
    whatsappNumber: row.whatsapp_number,
    industry: row.industry,
    numberOfEmployees: row.number_of_employees,
    bbbeeLevel: row.bbbee_level,
    numberOfBranches: row.number_of_branches,
    emailAddress: row.email_address,
    annualTurnover: row.annual_turnover,
    tradingHours: row.trading_hours,
    directorsName: row.directors_name,
    directorsSurname: row.directors_surname,
    socialMediaHandles: row.social_media_handles
  };
}

module.exports = router;