const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const router = express.Router();
const protect = require('../middleware/auth');

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

// Apply auth middleware
router.use(protect);

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
router.post('/csv', upload.single('file'), async (req, res) => {
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

    // Here you would typically save to database
    // For now, we'll return the parsed data
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
router.post('/excel', upload.single('file'), async (req, res) => {
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
router.post('/meta', async (req, res) => {
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

module.exports = router;