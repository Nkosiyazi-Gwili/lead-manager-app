const express = require('express');
const { login, register, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth'); // Make sure this path is correct

const router = express.Router();

router.post('/login', login);
router.post('/register', register); // REMOVED protect middleware - register should be public
router.get('/me', protect, getMe);

module.exports = router;