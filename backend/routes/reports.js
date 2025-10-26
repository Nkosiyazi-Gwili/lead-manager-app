const express = require('express');
const Lead = require('../models/Lead');
const router = express.Router();

// Import auth middleware
const protect = require('../middleware/auth'); // Changed from auth

// Apply auth middleware to all routes
router.use(protect); // Changed from auth

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get total leads count
    const totalLeads = await Lead.countDocuments();

    // Get leads by status
    const statusCounts = await Lead.aggregate([
      {
        $group: {
          _id: '$leadStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get leads by source
    const sourceCounts = await Lead.aggregate([
      {
        $group: {
          _id: '$leadSource',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get user's assigned leads
    let myLeadsQuery = { assignedTo: userId };
    
    // If user is admin or manager, show all leads assigned to their team
    if (userRole === 'admin' || userRole === 'sales_manager' || userRole === 'marketing_manager') {
      // For managers, get leads assigned to their department
      if (userRole === 'sales_manager') {
        const salesAgents = await User.find({ role: 'sales_agent' }).select('_id');
        myLeadsQuery = { 
          assignedTo: { $in: salesAgents.map(agent => agent._id) } 
        };
      } else if (userRole === 'marketing_manager') {
        const marketingAgents = await User.find({ role: 'marketing_agent' }).select('_id');
        myLeadsQuery = { 
          assignedTo: { $in: marketingAgents.map(agent => agent._id) } 
        };
      } else {
        // Admin can see all assigned leads
        myLeadsQuery = { assignedTo: { $ne: null } };
      }
    }

    const myLeads = await Lead.countDocuments(myLeadsQuery);

    // Calculate conversion rate (closed_won / total contacted leads)
    const contactedLeads = await Lead.countDocuments({
      leadStatus: { $in: ['contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] }
    });
    
    const wonLeads = await Lead.countDocuments({ leadStatus: 'closed_won' });
    const conversionRate = contactedLeads > 0 ? ((wonLeads / contactedLeads) * 100).toFixed(1) : 0;

    // Format the data for frontend
    const statusCountsObj = {};
    statusCounts.forEach(item => {
      statusCountsObj[item._id] = item.count;
    });

    const sourceCountsObj = {};
    sourceCounts.forEach(item => {
      sourceCountsObj[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        totalLeads,
        statusCounts: statusCountsObj,
        sourceCounts: sourceCountsObj,
        myLeads,
        conversionRate
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

module.exports = router;