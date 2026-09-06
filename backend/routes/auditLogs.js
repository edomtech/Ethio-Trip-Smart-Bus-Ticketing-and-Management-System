const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', authorize('super_admin', 'company_admin', 'admin'), getAuditLogs);

module.exports = router;
