const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
} = require('../controllers/conductorReportController');
const { protect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.use(protect);

router
  .route('/')
  .post(authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), createReport)
  .get(authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), getReports);

router
  .route('/:id')
  .get(authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), getReportById);

router
  .route('/:id/status')
  .put(authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), updateReportStatus);

module.exports = router;
