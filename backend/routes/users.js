const router = require('express').Router();
const {
  getAllUsers,
  getStaff,
  getConductors,
  createStaff,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.use(protect);

router.get('/staff', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getStaff);
router.post('/staff', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), createStaff);
router.get('/conductors', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getConductors);

router.get('/agents', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getStaff);
router.post('/agents', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), createStaff);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getAllUsers);
router.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getUserById);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), updateUser);
router.patch('/:id/toggle-status', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), toggleUserStatus);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), deleteUser);

module.exports = router;
