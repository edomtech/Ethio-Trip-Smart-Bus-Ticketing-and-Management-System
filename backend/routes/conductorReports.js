const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
} = require('../controllers/conductorReportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .post(authorize('conductor', 'company_staff', 'agent', 'company_admin', 'super_admin'), createReport)
  .get(authorize('conductor', 'company_staff', 'agent', 'company_admin', 'super_admin'), getReports);

router
  .route('/:id')
  .get(authorize('conductor', 'company_staff', 'agent', 'company_admin', 'super_admin'), getReportById);

router
  .route('/:id/status')
  .put(authorize('company_admin', 'super_admin'), updateReportStatus);

module.exports = router;
