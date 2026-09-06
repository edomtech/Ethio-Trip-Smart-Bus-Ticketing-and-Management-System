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

router.use(protect);

// Booking Tickets
router.get('/booking/:bookingId', getTicketByBooking);

// Trip Passenger Manifest for Agents & Conductors
router.get('/trip-manifest', authorize('agent', 'company_staff', 'conductor', 'company_admin', 'super_admin', 'admin'), getTripManifest);

// Agent Ticket Validity Verification (VERIFY / REJECT at Counter)
router.post('/agent-verify', authorize('agent', 'company_staff', 'company_admin', 'super_admin', 'admin'), agentVerifyTicket);

// Conductor Boarding Validation (QR Scan / Ticket Search)
router.post('/conductor-validate', authorize('conductor', 'company_admin', 'super_admin', 'admin'), conductorValidateTicket);

// Conductor Boarding Confirmation
router.post('/conductor-confirm-boarding', authorize('conductor', 'company_admin', 'super_admin', 'admin'), conductorConfirmBoarding);

// Legacy Compatibility
router.post('/verify', authorize('conductor', 'company_admin', 'super_admin', 'admin'), verifyTicket);
router.get('/verify/:ticketNumber', authorize('conductor', 'company_admin', 'super_admin', 'admin'), verifyTicketByNumber);

module.exports = router;
