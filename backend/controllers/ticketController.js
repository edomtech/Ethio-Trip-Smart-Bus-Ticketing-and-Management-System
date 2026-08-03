const Booking = require('../models/Booking');

// @desc    Get ticket by booking ID
// @route   GET /api/tickets/booking/:bookingId
// @access  Private
const getTicketByBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate({ path: 'schedule', populate: ['bus', 'route'] });
    if (!booking) return res.status(404).json({ message: 'Ticket not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

// @desc    Verify ticket by ticket number
// @route   GET /api/tickets/verify/:ticketNumber
// @access  Private (Agent/Admin)
const verifyTicketByNumber = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ ticketNumber: req.params.ticketNumber })
      .populate({ path: 'schedule', populate: ['bus', 'route'] });
    if (!booking) return res.status(404).json({ message: 'Ticket not found' });

    res.json({
      success: true,
      ticket: {
        ticketNumber: booking.ticketNumber,
        passengerName: booking.passenger.name,
        phone: booking.passenger.phone,
        route: `${booking.schedule?.route?.from || ''} → ${booking.schedule?.route?.to || ''}`,
        date: booking.schedule?.date,
        time: booking.schedule?.departureTime,
        seats: booking.selectedSeats.join(', '),
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Print ticket job handler
// @route   POST /api/tickets/:id/print
// @access  Private (Agent/Admin)
const printTicket = async (req, res) => {
  res.json({ success: true, message: 'Print job queued successfully' });
};

module.exports = {
  getTicketByBooking,
  verifyTicketByNumber,
  printTicket,
};
