const router = require('express').Router();
const {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getPublicBuses,
} = require('../controllers/busController');
const { protect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.get('/public', getPublicBuses);

router.get('/', protect, getBuses);
router.get('/:id', protect, getBusById);
router.post('/', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), createBus);
router.put('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), updateBus);
router.delete('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), deleteBus);

module.exports = router;
