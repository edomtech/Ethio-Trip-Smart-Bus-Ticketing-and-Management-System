const router = require('express').Router();
const {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} = require('../controllers/routeController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

router.get('/', optionalProtect, getRoutes);
router.get('/:id', getRouteById);
router.post('/', protect, authorize('company_admin', 'super_admin', 'admin'), createRoute);
router.put('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), updateRoute);
router.delete('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), deleteRoute);

module.exports = router;
