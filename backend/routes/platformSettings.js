const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/platformSettingController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../constants/roles');

router.get('/', getSettings);

router.put('/', protect, authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, 'admin'), updateSettings);

module.exports = router;
