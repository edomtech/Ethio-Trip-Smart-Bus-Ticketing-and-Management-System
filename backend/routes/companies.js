const express = require('express');
const router = express.Router();
const {
  registerCompany,
  getCompanies,
  getActiveCompanies,
  getCompanyById,
  updateCompanyStatus,
  updateCompanyProfile,
  getMyCompany,
} = require('../controllers/companyController');
const { protect, authorize, requireCompanyAccess } = require('../middleware/auth');

router.post('/register', registerCompany);
router.get('/active', getActiveCompanies);

router.use(protect);

router.get('/my-company', requireCompanyAccess, getMyCompany);
router.put('/my-company', authorize('company_admin', 'super_admin'), requireCompanyAccess, updateCompanyProfile);

router.get('/', authorize('super_admin'), getCompanies);
router.get('/:id', getCompanyById);
router.patch('/:id/status', authorize('super_admin'), updateCompanyStatus);

module.exports = router;
