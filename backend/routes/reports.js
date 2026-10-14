const router = require('express').Router();
const { getOverviewReport, getPublicReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../constants/roles');

router.get('/public', getPublicReport);
router.get('/overview', protect, authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), getOverviewReport);

module.exports = router;
