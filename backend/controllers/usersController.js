const User = require('../models/User');

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private (Admin/Sales Manager only)
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = ['admin', 'sales_manager', 'sales_agent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const users = await User.find({ 
      role, 
      isActive: true 
    }).select('name email role');

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Get all sales agents (convenience method)
// @route   GET /api/users/sales-agents
// @access  Private (Admin/Sales Manager only)
exports.getSalesAgents = async (req, res) => {
  try {
    const users = await User.find({ 
      role: 'sales_agent', 
      isActive: true 
    }).select('name email role');

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get sales agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales agents'
    });
  }
};