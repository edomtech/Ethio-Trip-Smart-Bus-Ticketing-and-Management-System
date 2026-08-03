const router = require('express').Router();
const {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
} = require('../controllers/busController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getBuses);
router.get('/:id', getBusById);
router.post('/', protect, authorize('admin'), createBus);
router.put('/:id', protect, authorize('admin'), updateBus);
router.delete('/:id', protect, authorize('admin'), deleteBus);

module.exports = router;
