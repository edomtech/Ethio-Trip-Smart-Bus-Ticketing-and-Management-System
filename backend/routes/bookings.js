const router = require('express').Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getDailyBookings,
  getBookingById,
  cancelBooking,
  processRefundDecision,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/daily', authorize('super_admin', 'company_admin', 'company_staff', 'admin', 'agent', 'conductor'), getDailyBookings);
router.get('/', authorize('super_admin', 'company_admin', 'company_staff', 'admin', 'agent', 'conductor'), getAllBookings);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);
router.put('/:id/refund-decision', authorize('super_admin', 'company_admin', 'admin'), processRefundDecision);

module.exports = router;
