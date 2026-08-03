const router = require('express').Router();
const {
  getTicketByBooking,
  verifyTicketByNumber,
  printTicket,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

router.get('/booking/:bookingId', protect, getTicketByBooking);
router.get('/verify/:ticketNumber', protect, authorize('agent', 'admin'), verifyTicketByNumber);
router.post('/:id/print', protect, authorize('agent', 'admin'), printTicket);

module.exports = router;
