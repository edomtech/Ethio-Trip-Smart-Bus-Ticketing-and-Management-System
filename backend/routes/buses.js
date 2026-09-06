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

router.get('/public', getPublicBuses);

router.get('/', protect, getBuses);
router.get('/:id', protect, getBusById);
router.post('/', protect, authorize('company_admin', 'super_admin', 'admin'), createBus);
router.put('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), updateBus);
router.delete('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), deleteBus);

module.exports = router;
