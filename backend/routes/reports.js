const router = require('express').Router();
const { getOverviewReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/overview', protect, authorize('super_admin', 'company_admin', 'admin', 'agent'), getOverviewReport);

module.exports = router;
