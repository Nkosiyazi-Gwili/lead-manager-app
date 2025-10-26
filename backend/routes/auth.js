const express = require('express');
const { login, register, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth'); // Changed from { protect }

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, register);
router.get('/me', protect, getMe);

module.exports = router;