const express = require('express');
const Lead = require('../models/Lead');
const router = express.Router();

// Import auth middleware
const protect = require('../middleware/auth'); // Changed from auth

// Apply auth middleware to all routes
router.use(protect); // Changed from auth

// @desc    Get all leads with pagination and filtering
// @route   GET /api/leads
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      source, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== '') filter.leadStatus = status;
    if (source && source !== '') filter.leadSource = source;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get leads with pagination
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalLeads = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(totalLeads / limitNum);

    res.json({
      success: true,
      data: leads,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalLeads,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
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

// @desc    Get lead by ID
// @route   GET /api/leads/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
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
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching lead'
    });
  }
});

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
router.post('/', async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user._id
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedLead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error('Create lead error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating lead'
    });
  }
});

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
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
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error('Update lead error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating lead'
    });
  }
});

// @desc    Assign lead to user
// @route   PATCH /api/leads/:id/assign
// @access  Private/Admin/Manager
router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    // If assignedTo is empty string, set to null (unassign)
    const updateData = assignedTo === '' ? { assignedTo: null } : { assignedTo };

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
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
      message: assignedTo ? 'Lead assigned successfully' : 'Lead unassigned successfully'
    });
  } catch (error) {
    console.error('Assign lead error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error assigning lead'
    });
  }
});

// @desc    Update lead status
// @route   PATCH /api/leads/:id/status
// @access  Private
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { leadStatus: status },
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email')
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
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating lead status'
    });
  }
});

// @desc    Add note to lead
// @route   POST /api/leads/:id/notes
// @access  Private
router.post('/:id/notes', async (req, res) => {
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

    lead.notes.push({
      content,
      createdBy: req.user._id
    });

    await lead.save();

    // Populate the notes with user info
    const updatedLead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    res.json({
      success: true,
      data: updatedLead.notes,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add note error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding note'
    });
  }
});

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
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
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting lead'
    });
  }
});

module.exports = router;