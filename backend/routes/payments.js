const router = require('express').Router();
const {
  initiatePayment,
  verifyPayment,
  getUserPaymentHistory,
  getAllPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.post('/initiate', protect, initiatePayment);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getUserPaymentHistory);
router.get('/', protect, authorize('admin'), getAllPayments);

module.exports = router;
