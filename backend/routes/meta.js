const express = require('express');
const axios = require('axios');
const Lead = require('../models/Lead');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Meta Business API configuration
const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Store access token securely (in production, use environment variables)
let metaAccessToken = process.env.META_ACCESS_TOKEN || '';

// Set Meta access token
router.post('/setup', auth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Validate the token by making a test request
    try {
      const testResponse = await axios.get(
        `${META_API_BASE_URL}/me`,
        { params: { access_token: accessToken } }
      );
      
      metaAccessToken = accessToken;
      
      res.json({
        success: true,
        message: 'Meta access token configured successfully',
        user: testResponse.data
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access token',
        error: error.response?.data?.error?.message || 'Token validation failed'
      });
    }
  } catch (error) {
    console.error('Meta setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup Meta integration',
      error: error.message
    });
  }
});

// Get Meta Business accounts
router.get('/businesses', auth, async (req, res) => {
  try {
    if (!metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta access token not configured. Please setup first.'
      });
    }

    const response = await axios.get(
      `${META_API_BASE_URL}/me/businesses`,
      { params: { access_token: metaAccessToken, fields: 'id,name,verification_status' } }
    );

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business accounts',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Get leads from Meta forms
router.get('/leads', auth, async (req, res) => {
  try {
    const { formId, businessId } = req.query;
    
    if (!metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta access token not configured'
      });
    }

    if (!formId) {
      return res.status(400).json({
        success: false,
        message: 'Form ID is required'
      });
    }

    // Get leads from Meta form
    const response = await axios.get(
      `${META_API_BASE_URL}/${formId}/leads`,
      { 
        params: { 
          access_token: metaAccessToken,
          fields: 'id,created_time,field_data'
        }
      }
    );

    const leads = response.data.data;
    
    res.json({
      success: true,
      data: leads,
      total: leads.length
    });
  } catch (error) {
    console.error('Get Meta leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads from Meta',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Import leads from Meta to your system
router.post('/import', auth, async (req, res) => {
  try {
    const { formId, businessId } = req.body;
    
    if (!metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta access token not configured'
      });
    }

    if (!formId) {
      return res.status(400).json({
        success: false,
        message: 'Form ID is required'
      });
    }

    // Fetch leads from Meta
    const response = await axios.get(
      `${META_API_BASE_URL}/${formId}/leads`,
      { 
        params: { 
          access_token: metaAccessToken,
          fields: 'id,created_time,field_data,ad_id,ad_name,form_id'
        }
      }
    );

    const metaLeads = response.data.data;
    const importedLeads = [];

    // Process and import each lead
    for (const metaLead of metaLeads) {
      try {
        // Extract lead data from field_data
        const leadData = extractLeadDataFromMeta(metaLead, req.user.id);
        
        // Check if lead already exists
        const existingLead = await Lead.findOne({ 
          metaAdId: metaLead.ad_id,
          'metaData.lead_id': metaLead.id 
        });

        if (!existingLead) {
          const newLead = await Lead.create(leadData);
          importedLeads.push(newLead);
        }
      } catch (leadError) {
        console.error('Error importing individual lead:', leadError);
        // Continue with next lead even if one fails
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedLeads.length} leads from Meta`,
      data: importedLeads,
      totalImported: importedLeads.length,
      totalSkipped: metaLeads.length - importedLeads.length
    });
  } catch (error) {
    console.error('Meta import error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import leads from Meta',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Get Meta forms for a page
router.get('/forms', auth, async (req, res) => {
  try {
    const { pageId } = req.query;
    
    if (!metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Meta access token not configured'
      });
    }

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'Page ID is required'
      });
    }

    const response = await axios.get(
      `${META_API_BASE_URL}/${pageId}/leadgen_forms`,
      { 
        params: { 
          access_token: metaAccessToken,
          fields: 'id,name,status,leads_count,created_time,page{id,name}'
        }
      }
    );

    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forms',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Helper function to extract lead data from Meta response
function extractLeadDataFromMeta(metaLead, userId) {
  const fieldData = {};
  
  // Extract all fields from Meta lead
  metaLead.field_data.forEach(field => {
    fieldData[field.name] = field.values[0];
  });

  // Map Meta fields to your lead schema
  return {
    leadSource: 'meta_business',
    createdBy: userId,
    name: fieldData['first_name'] || fieldData['full_name'] || '',
    surname: fieldData['last_name'] || '',
    emailAddress: fieldData['email'] || '',
    mobileNumber: fieldData['phone_number'] || fieldData['mobile_number'] || '',
    telephoneNumber: fieldData['phone_number'] || '',
    companyTradingName: fieldData['company_name'] || fieldData['business_name'] || '',
    companyRegisteredName: fieldData['company_name'] || '',
    occupation: fieldData['job_title'] || fieldData['occupation'] || '',
    industry: fieldData['industry'] || fieldData['business_industry'] || '',
    address: [
      fieldData['city'],
      fieldData['state'],
      fieldData['country']
    ].filter(Boolean).join(', '),
    // Meta-specific fields
    metaAdId: metaLead.ad_id,
    metaFormId: metaLead.form_id,
    metaLeadId: metaLead.id,
    metaData: {
      lead_id: metaLead.id,
      created_time: metaLead.created_time,
      ad_id: metaLead.ad_id,
      ad_name: metaLead.ad_name,
      form_id: metaLead.form_id,
      field_data: fieldData
    },
    notes: [
      {
        content: `Imported from Meta Business form on ${new Date(metaLead.created_time).toLocaleDateString()}`,
        createdBy: userId
      }
    ]
  };
}

module.exports = router;