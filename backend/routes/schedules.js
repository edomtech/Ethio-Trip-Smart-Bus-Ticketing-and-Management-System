const router = require('express').Router();
const {
  getSchedules,
  getMyAssignedSchedules,
  searchSchedules,
  getScheduleById,
  getSeatMap,
  createSchedule,
  updateSchedule,
  assignConductor,
  deleteSchedule,
} = require('../controllers/scheduleController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

router.get('/', optionalProtect, getSchedules);
router.get('/search', optionalProtect, searchSchedules);
router.get('/my-assigned', protect, authorize('conductor', 'company_admin', 'super_admin', 'admin'), getMyAssignedSchedules);
router.get('/:id', getScheduleById);
router.get('/:id/seats', getSeatMap);
router.post('/', protect, authorize('company_admin', 'super_admin', 'admin'), createSchedule);
router.put('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), updateSchedule);
router.put('/:id/assign-conductor', protect, authorize('company_admin', 'super_admin', 'admin'), assignConductor);
router.delete('/:id', protect, authorize('company_admin', 'super_admin', 'admin'), deleteSchedule);

module.exports = router;
