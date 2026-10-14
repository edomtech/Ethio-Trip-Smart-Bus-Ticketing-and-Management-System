const router = require('express').Router();
const {
  chapaInitialize,
  chapaVerify,
  initiatePayment,
  verifyPayment,
  getUserPaymentHistory,
  getAllPayments,
  updatePaymentStatus,
  requestRefund,
  getRefunds,
  getMyRefunds,
  refundDecision,
  verifyRefund,
  submitManualReceipt,
  reviewManualReceipt,
  getPendingManualReceipts,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const ROLES = require('../constants/roles');


router.use(protect);

router.post('/chapa/initialize', chapaInitialize);
router.get('/chapa/verify/:txRef', chapaVerify);

router.post('/manual/submit', submitManualReceipt);
router.get('/manual/pending', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), getPendingManualReceipts);
router.put('/manual/:id/review', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), reviewManualReceipt);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);

router.get('/history', getUserPaymentHistory);

router.post('/refund/request', requestRefund);
router.get('/refund/my', getMyRefunds);
router.get('/refund/all', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), getRefunds);
router.put('/refund/:id/decision', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), refundDecision);
router.get('/refund/:id/verify', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), verifyRefund);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF), getAllPayments);
router.put('/:id/status', authorize(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN), updatePaymentStatus);


module.exports = router;
