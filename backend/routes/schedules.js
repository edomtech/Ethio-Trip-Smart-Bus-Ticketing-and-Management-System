const router = require('express').Router();
const {
  getSchedules,
  searchSchedules,
  getScheduleById,
  getSeatMap,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getSchedules);
router.get('/search', searchSchedules);
router.get('/:id', getScheduleById);
router.get('/:id/seats', getSeatMap);
router.post('/', protect, authorize('admin'), createSchedule);
router.put('/:id', protect, authorize('admin'), updateSchedule);
router.delete('/:id', protect, authorize('admin'), deleteSchedule);

module.exports = router;
