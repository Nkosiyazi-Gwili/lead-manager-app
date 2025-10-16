const express = require('express');
const {
  getLeads,
  createLead,
  updateLeadStatus,
  assignLead,
  addNote
} = require('../controllers/leadsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/leads - Get all leads with pagination
router.get('/', getLeads);

// POST /api/leads - Create new lead
router.post('/', createLead);

// PATCH /api/leads/:id/status - Update lead status
router.patch('/:id/status', updateLeadStatus);

// PATCH /api/leads/:id/assign - Assign lead to user
router.patch('/:id/assign', assignLead);

// POST /api/leads/:id/notes - Add note to lead
router.post('/:id/notes', addNote);

module.exports = router;