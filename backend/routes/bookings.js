const router = require('express').Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  getDailyBookings,
  getBookingById,
  cancelBooking,
  processRefundDecision,
  uploadPaymentReceipt,
  getPendingReceipts,
  reviewPaymentReceipt,
} = require('../controllers/bookingController');
const { protect, authorize, requireVerifiedEmail } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.use(protect);

router.post('/', requireVerifiedEmail, createBooking);
router.get('/my', getMyBookings);
router.get('/pending-receipts', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), getPendingReceipts);
router.get('/daily', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR), getDailyBookings);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR), getAllBookings);
router.get('/:id', getBookingById);
router.post('/:id/upload-receipt', uploadPaymentReceipt);
router.put('/:id/review-receipt', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), reviewPaymentReceipt);
router.put('/:id/cancel', cancelBooking);
router.put('/:id/refund-decision', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), processRefundDecision);

module.exports = router;
