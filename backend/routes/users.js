const router = require('express').Router();
const {
  getAllUsers,
  getStaff,
  getConductors,
  createStaff,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/staff', authorize('super_admin', 'company_admin', 'admin'), getStaff);
router.post('/staff', authorize('super_admin', 'company_admin', 'admin'), createStaff);
router.get('/conductors', authorize('super_admin', 'company_admin', 'admin'), getConductors);
router.get('/agents', authorize('super_admin', 'company_admin', 'admin'), getStaff);
router.post('/agents', authorize('super_admin', 'company_admin', 'admin'), createStaff);

router.get('/', authorize('super_admin', 'company_admin', 'admin'), getAllUsers);
router.get('/:id', authorize('super_admin', 'company_admin', 'admin'), getUserById);
router.put('/:id', authorize('super_admin', 'company_admin', 'admin'), updateUser);
router.delete('/:id', authorize('super_admin', 'company_admin', 'admin'), deleteUser);

module.exports = router;
