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

router.get('/active', getActiveCompanies);

router.use(protect);

router.post('/register', authorize('super_admin'), registerCompany);
router.post('/', authorize('super_admin'), registerCompany);

router.get('/my-company', authorize('company_admin', 'super_admin'), requireCompanyAccess, getMyCompany);
router.put('/my-company', authorize('company_admin', 'super_admin'), requireCompanyAccess, updateCompanyProfile);

router.get('/', authorize('super_admin'), getCompanies);
router.get('/:id', authorize('super_admin', 'company_admin', 'company_staff'), getCompanyById);
router.put('/:id', authorize('super_admin'), updateCompanyProfile);
router.patch('/:id/status', authorize('super_admin'), updateCompanyStatus);

module.exports = router;
