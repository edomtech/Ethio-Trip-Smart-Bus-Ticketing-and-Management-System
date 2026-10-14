const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../constants/roles');

router.use(protect);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getAuditLogs);

module.exports = router;
