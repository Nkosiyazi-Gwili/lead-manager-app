const User = require('../models/User');

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

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