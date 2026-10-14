const router = require('express').Router();
const {
  getTicketByBooking,
  getTripManifest,
  agentVerifyTicket,
  conductorValidateTicket,
  conductorConfirmBoarding,
  verifyTicket,
  verifyTicketByNumber,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

const ROLES = require('../constants/roles');

router.use(protect);

router.get('/booking/:bookingId', getTicketByBooking);

router.get('/trip-manifest', authorize(ROLES.COMPANY_STAFF, ROLES.CONDUCTOR, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), getTripManifest);

router.post('/agent-verify', authorize(ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), agentVerifyTicket);

router.post('/conductor-validate', authorize(ROLES.CONDUCTOR, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), conductorValidateTicket);

router.post('/conductor-confirm-boarding', authorize(ROLES.CONDUCTOR, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), conductorConfirmBoarding);

router.post('/verify', authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), verifyTicket);
router.get('/verify/:ticketNumber', authorize(ROLES.CONDUCTOR, ROLES.COMPANY_STAFF, ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN), verifyTicketByNumber);

module.exports = router;
