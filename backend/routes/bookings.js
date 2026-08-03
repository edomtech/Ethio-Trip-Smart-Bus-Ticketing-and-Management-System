const router = require('express').Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getDailyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/daily', protect, authorize('admin', 'agent'), getDailyBookings);
router.get('/', protect, authorize('admin', 'agent'), getAllBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking);

module.exports = router;
