const express = require('express');
const { getUsersByRole } = require('../controllers/usersController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/role/:role', getUsersByRole);

module.exports = router;