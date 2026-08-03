const router = require('express').Router();
const { getOverviewReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.get('/overview', protect, authorize('admin'), getOverviewReport);

module.exports = router;
