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

const ROLES = require('../constants/roles');

router.get('/', optionalProtect, getSchedules);
router.get('/search', optionalProtect, searchSchedules);
router.get('/my-assigned', protect, authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), getMyAssignedSchedules);
router.get('/:id', optionalProtect, getScheduleById);
router.get('/:id/seats', optionalProtect, getSeatMap);
router.post('/', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), createSchedule);
router.put('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), updateSchedule);
router.put('/:id/assign-conductor', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), assignConductor);
router.delete('/:id', protect, authorize(ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), deleteSchedule);

module.exports = router;
