const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const healthRoutes = require('./health');

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

module.exports = router;
