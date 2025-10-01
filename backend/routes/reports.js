const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    let leadFilter = {};
    
    // Role-based filtering
    if (req.user.role === 'sales_agent' || req.user.role === 'marketing_agent') {
      leadFilter.assignedTo = req.user.id;
    }

    const [
      totalLeads,
      statusCounts,
      sourceCounts,
      myLeads
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$leadStatus', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } }
      ]),
      req.user.role === 'sales_agent' || req.user.role === 'marketing_agent' 
        ? Lead.countDocuments({ assignedTo: req.user.id })
        : Promise.resolve(0)
    ]);

    // Convert arrays to objects
    const statusCountsObj = {};
    statusCounts.forEach(item => {
      statusCountsObj[item._id] = item.count;
    });

    const sourceCountsObj = {};
    sourceCounts.forEach(item => {
      sourceCountsObj[item._id] = item.count;
    });

    // Calculate conversion rate
    const wonLeads = statusCountsObj['closed_won'] || 0;
    const totalClosed = wonLeads + (statusCountsObj['closed_lost'] || 0);
    const conversionRate = totalClosed > 0 ? ((wonLeads / totalClosed) * 100).toFixed(2) : 0;

    res.json({
      totalLeads,
      statusCounts: statusCountsObj,
      sourceCounts: sourceCountsObj,
      myLeads,
      conversionRate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lead conversion report
router.get('/conversion', auth, authorize('admin', 'sales_manager', 'marketing_manager'), async (req, res) => {
  try {
    const conversionReport = await Lead.aggregate([
      {
        $group: {
          _id: '$leadStatus',
          count: { $sum: 1 },
          avgCreationTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
        }
      }
    ]);

    res.json(conversionReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Agent performance report
router.get('/agent-performance', auth, authorize('admin', 'sales_manager'), async (req, res) => {
  try {
    const agentPerformance = await Lead.aggregate([
      {
        $match: { assignedTo: { $ne: null } }
      },
      {
        $group: {
          _id: '$assignedTo',
          totalLeads: { $sum: 1 },
          wonLeads: { $sum: { $cond: [{ $eq: ['$leadStatus', 'closed_won'] }, 1, 0] } },
          lostLeads: { $sum: { $cond: [{ $eq: ['$leadStatus', 'closed_lost'] }, 1, 0] } },
          avgResponseTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: '$agent'
      },
      {
        $project: {
          'agent.name': 1,
          'agent.email': 1,
          'agent.role': 1,
          totalLeads: 1,
          wonLeads: 1,
          lostLeads: 1,
          conversionRate: { $multiply: [{ $divide: ['$wonLeads', '$totalLeads'] }, 100] },
          avgResponseTime: 1
        }
      }
    ]);

    res.json(agentPerformance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;