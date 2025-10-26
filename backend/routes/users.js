const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Import auth middleware
const protect = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin/Manager
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Admin can see all users, managers can see users in their department
    let filter = {};
    if (userRole === 'sales_manager') {
      filter = { 
        $or: [
          { role: 'sales_agent' },
          { role: 'sales_manager' }
        ]
      };
    } else if (userRole === 'marketing_manager') {
      filter = { 
        $or: [
          { role: 'marketing_agent' },
          { role: 'marketing_manager' }
        ]
      };
    } else if (userRole !== 'admin') {
      // Regular users can only see their own profile
      filter = { _id: req.user._id };
    }

    const users = await User.find(filter).select('-password');
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @desc    Get users by role
// @route   GET /api/users/role/:role
// @access  Private/Admin/Manager
router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const userRole = req.user.role;

    // Validate if user has permission to access this data
    if (!['admin', 'sales_manager', 'marketing_manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate role parameter
    const validRoles = ['admin', 'sales_manager', 'sales_agent', 'marketing_manager', 'marketing_agent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    let filter = { role };
    
    // Managers can only see users in their department
    if (userRole === 'sales_manager' && !['sales_manager', 'sales_agent'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (userRole === 'marketing_manager' && !['marketing_manager', 'marketing_agent'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const users = await User.find(filter)
      .select('name email role department isActive')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users by role'
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin/Manager
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userRole = req.user.role;

    // Users can see their own profile, admins/managers can see others
    if (userId !== req.user._id.toString() && !['admin', 'sales_manager', 'marketing_manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Managers can only see users in their department
    if (userRole === 'sales_manager' && !['sales_manager', 'sales_agent'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (userRole === 'marketing_manager' && !['marketing_manager', 'marketing_agent'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin/Manager
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userRole = req.user.role;

    // Users can update their own profile, admins can update others
    if (userId !== req.user._id.toString() && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove password from update data if present
    const updateData = { ...req.body };
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', async (req, res) => {
  try {
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

module.exports = router;