const router = require('express').Router();
const {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} = require('../controllers/routeController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.get('/', optionalProtect, getRoutes);
router.get('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR, ROLES.SUPER_ADMIN), getRouteById);
router.post('/', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), createRoute);
router.put('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), updateRoute);
router.delete('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), deleteRoute);

module.exports = router;
