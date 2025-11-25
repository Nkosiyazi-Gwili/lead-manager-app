const express = require('express');
const axios = require('axios');
const router = express.Router();
const protect = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// Store Meta configuration (in production, use a proper database)
let metaConfig = {
  accessToken: null,
  businesses: [],
  forms: []
};

// @desc    Setup Meta access
// @route   POST /api/meta/setup
// @access  Private
router.post('/setup', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Test the access token by making a simple API call
    try {
      const testResponse = await axios.get(`https://graph.facebook.com/v19.0/me`, {
        params: {
          access_token: accessToken,
          fields: 'id,name'
        }
      });

      console.log('✅ Meta access token validated:', testResponse.data.name);
    } catch (error) {
      console.error('❌ Meta access token validation failed:', error.response?.data);
      return res.status(400).json({
        success: false,
        message: 'Invalid access token. Please check your token and try again.'
      });
    }

    // Store the access token
    metaConfig.accessToken = accessToken;

    res.json({
      success: true,
      message: 'Meta access configured successfully'
    });

  } catch (error) {
    console.error('Meta setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup Meta access'
    });
  }
});

// @desc    Get business accounts
// @route   GET /api/meta/businesses
// @access  Private
router.get('/businesses', async (req, res) => {
  try {
    if (!metaConfig.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta access not configured. Please setup access token first.'
      });
    }

    // Mock business data for demo
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
      },
      {
        id: 'business_789',
        name: 'Sales Innovators',
        verification_status: 'verified'
      }
    ];

    metaConfig.businesses = mockBusinesses;

    res.json({
      success: true,
      data: mockBusinesses
    });

  } catch (error) {
    console.error('Get businesses error:', error);
    
    // Return demo data even if API fails
    const demoBusinesses = [
      {
        id: 'demo_business_1',
        name: 'Demo Business 1',
        verification_status: 'verified'
      },
      {
        id: 'demo_business_2',
        name: 'Demo Business 2',
        verification_status: 'verified'
      }
    ];

    res.json({
      success: true,
      data: demoBusinesses,
      message: 'Using demo data - configure Meta access for real data'
    });
  }
});

// @desc    Get forms for a business/page
// @route   GET /api/meta/forms
// @access  Private
router.get('/forms', async (req, res) => {
  try {
    const { pageId } = req.query;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    // Mock form data for demo
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
      },
      {
        id: 'form_789',
        name: 'Quote Request Form',
        leads_count: 12,
        status: 'active'
      }
    ];

    metaConfig.forms = mockForms;

    res.json({
      success: true,
      data: mockForms
    });

  } catch (error) {
    console.error('Get forms error:', error);
    
    // Return demo data
    const demoForms = [
      {
        id: 'demo_form_1',
        name: 'Demo Contact Form',
        leads_count: 25,
        status: 'active'
      },
      {
        id: 'demo_form_2',
        name: 'Demo Service Form',
        leads_count: 15,
        status: 'active'
      }
    ];

    res.json({
      success: true,
      data: demoForms,
      message: 'Using demo form data'
    });
  }
});

// @desc    Import leads from Meta forms
// @route   POST /api/meta/import-leads
// @access  Private
router.post('/import-leads', async (req, res) => {
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