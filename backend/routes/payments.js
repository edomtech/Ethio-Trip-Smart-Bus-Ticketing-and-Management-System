const router = require('express').Router();
const {
  chapaInitialize,
  chapaVerify,
  chapaWebhook,
  initiatePayment,
  verifyPayment,
  getUserPaymentHistory,
  getAllPayments,
  updatePaymentStatus,
  requestRefund,
  getRefunds,
  refundDecision,
  verifyRefund,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Chapa webhook — public, no auth
router.post('/chapa/webhook', chapaWebhook);

// Protected routes
router.use(protect);

// Chapa
router.post('/chapa/initialize', chapaInitialize);
router.get('/chapa/verify/:txRef', chapaVerify);

// Simulate Telebirr/CBE/Cash
router.post('/initiate', initiatePayment);
router.post('/verify',   verifyPayment);

// Passenger history
router.get('/history', getUserPaymentHistory);

// Refund — passenger requests
router.post('/refund/request', requestRefund);

// Refund — company admin / super admin
router.get( '/refund/all',          authorize('super_admin', 'company_admin', 'admin', 'agent'), getRefunds);
router.put( '/refund/:id/decision', authorize('super_admin', 'company_admin', 'admin'),         refundDecision);
router.get( '/refund/:id/verify',   authorize('super_admin', 'company_admin', 'admin'),         verifyRefund);

// Admin
router.get('/', authorize('super_admin', 'company_admin', 'company_staff', 'admin', 'agent'), getAllPayments);
router.put('/:id/status', authorize('super_admin', 'company_admin', 'admin'), updatePaymentStatus);

module.exports = router;
