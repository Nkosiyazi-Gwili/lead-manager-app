// routes/users.js - FIXED VERSION
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// User model (same as in auth-complete for consistency)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'sales_manager', 'sales_agent', 'marketing_manager', 'marketing_agent'],
    default: 'sales_agent'
  },
  department: {
    type: String,
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Auth middleware (same as in auth-complete)
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as admin'
    });
  }
};

// @desc    Get all users with optional role filter
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    // Build query object
    const query = {};
    
    // Add role filter if provided and valid
    if (req.query.role) {
      const validRoles = ['admin', 'sales_manager', 'sales_agent', 'marketing_manager', 'marketing_agent'];
      if (validRoles.includes(req.query.role)) {
        query.role = req.query.role;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be one of: admin, sales_manager, sales_agent, marketing_manager, marketing_agent'
        });
      }
    }

    // Add active filter if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Add department filter if provided
    if (req.query.department) {
      query.department = req.query.department;
    }

    // Get users (exclude passwords)
    const users = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      filters: Object.keys(query).length > 0 ? query : 'none'
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, email, role, department, isActive } = req.body;

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (department) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    // Prevent users from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// @desc    Get users by role (specific endpoint)
// @route   GET /api/users/role/:role
// @access  Private/Admin
router.get('/role/:role', protect, admin, async (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['admin', 'sales_manager', 'sales_agent', 'marketing_manager', 'marketing_agent'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, sales_manager, sales_agent, marketing_manager, marketing_agent'
      });
    }

    const users = await User.find({ role }).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      role: role
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users by role'
    });
  }
});

// @desc    Get user stats
// @route   GET /api/users/stats/summary
// @access  Private/Admin
router.get('/stats/summary', protect, admin, async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        byRole: stats
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;