const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// @desc    Get tickets for a booking
// @route   GET /api/tickets/booking/:bookingId
// @access  Private
const getTicketByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate('companyId', 'companyName logo cancellationPolicy phone email')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let tickets = await Ticket.find({ booking: bookingId })
      .populate('companyId', 'companyName logo')
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate('verifiedBy', 'name email')
      .populate('boardedBy', 'name email');

    // Fallback: construct if missing
    if (tickets.length === 0) {
      const isRound = booking.tripType === 'round' || !!booking.returnLeg?.schedule;
      const outboundSch = booking.outboundLeg?.schedule || booking.schedule;
      const returnSch = booking.returnLeg?.schedule;
      const primarySeats = booking.outboundLeg?.seats?.length ? booking.outboundLeg.seats : (booking.selectedSeats || ['1']);
      const returnSeats = booking.returnLeg?.seats?.length ? booking.returnLeg.seats : (booking.selectedSeats || ['1']);
      const status = (booking.status === 'CONFIRMED' || booking.status === 'confirmed' || booking.paymentStatus === 'PAID') ? 'ACTIVE' : booking.status;
      const compName = booking.companyId?.companyName || outboundSch?.companyId?.companyName || '';

      const outboundTickets = primarySeats.map((seat) => ({
        _id: booking._id,
        ticketNumber: booking.ticketNumber,
        companyId: booking.companyId,
        busCompany: compName,
        companyName: compName,
        booking: booking._id,
        passengerName: booking.passenger?.name || 'Passenger',
        seatNumber: String(seat),
        legType: isRound ? 'outbound' : 'oneway',
        price: Math.round((booking.outboundLeg?.price || booking.totalPrice / (isRound ? 2 : 1)) / primarySeats.length),
        status,
        verificationStatus: 'PENDING',
        boardingStatus: 'NOT_BOARDED',
        issuedAt: booking.createdAt,
        schedule: outboundSch,
        route: outboundSch?.route ? `${outboundSch.route.from} -> ${outboundSch.route.to}` : '',
      }));

      const returnTickets = (isRound && returnSch) ? returnSeats.map((seat) => ({
        _id: `${booking._id}-ret`,
        ticketNumber: `${booking.ticketNumber}-RET`,
        companyId: returnSch?.companyId || booking.companyId,
        busCompany: returnSch?.companyId?.companyName || compName,
        companyName: returnSch?.companyId?.companyName || compName,
        booking: booking._id,
        passengerName: booking.passenger?.name || 'Passenger',
        seatNumber: String(seat),
        legType: 'return',
        price: Math.round((booking.returnLeg?.price || booking.totalPrice / 2) / returnSeats.length),
        status,
        verificationStatus: 'PENDING',
        boardingStatus: 'NOT_BOARDED',
        issuedAt: booking.createdAt,
        schedule: returnSch,
        route: returnSch?.route ? `${returnSch.route.from} -> ${returnSch.route.to}` : '',
      })) : [];

      tickets = [...outboundTickets, ...returnTickets];
    }

    res.json({ success: true, booking, tickets });
  } catch (err) {
    next(err);
  }
};

// @desc    Get trip passenger manifest (For Ticket Agent & Conductor)
// @route   GET /api/tickets/trip-manifest
// @access  Private (Agent, Conductor, Company Admin, Super Admin)
const getTripManifest = async (req, res, next) => {
  try {
    const { scheduleId, tripId, date, busId } = req.query;
    let targetScheduleId = scheduleId;

    if (!targetScheduleId && (tripId || (date && busId))) {
      const scheduleFilter = {};
      if (tripId) scheduleFilter.tripId = tripId;
      if (date) scheduleFilter.date = date;
      if (busId) scheduleFilter.bus = busId;

      if (!isSuper(req.user)) {
        const userCompanyId = getCompId(req.user);
        if (userCompanyId) scheduleFilter.companyId = userCompanyId;
      }

      const foundSchedule = await Schedule.findOne(scheduleFilter);
      if (foundSchedule) targetScheduleId = foundSchedule._id;
    }

    if (!targetScheduleId) {
      return res.status(400).json({ message: 'Schedule ID or Trip criteria (Date, Bus / Trip ID) is required' });
    }

    const schedule = await Schedule.findById(targetScheduleId)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo')
      .populate('assignedConductor', 'name email phone');

    if (!schedule) {
      return res.status(404).json({ message: 'Target trip/schedule not found' });
    }

    // Company access check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId && schedule.companyId?._id?.toString() !== userCompanyId && schedule.companyId?.toString() !== userCompanyId) {
        return res.status(403).json({ message: 'Access denied. Trip belongs to another company.' });
      }
    }

    // Conductor trip assignment verification if user is conductor
    if (req.user.role === 'conductor') {
      const assignedConductorId = schedule.assignedConductor?._id?.toString() || schedule.assignedConductor?.toString();
      if (assignedConductorId && assignedConductorId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You are not the assigned conductor for this specific trip.' });
      }
    }

    // Fetch all tickets for this schedule
    const tickets = await Ticket.find({ schedule: targetScheduleId })
      .populate('booking')
      .populate('user', 'name email phone')
      .populate('verifiedBy', 'name email')
      .populate('boardedBy', 'name email')
      .sort('seatNumber');

    res.json({
      success: true,
      schedule,
      totalPassengers: tickets.length,
      verifiedCount: tickets.filter((t) => t.verificationStatus === 'VERIFIED').length,
      pendingVerificationCount: tickets.filter((t) => t.verificationStatus === 'PENDING').length,
      rejectedCount: tickets.filter((t) => t.verificationStatus === 'REJECTED').length,
      boardedCount: tickets.filter((t) => t.boardingStatus === 'BOARDED').length,
      notBoardedCount: tickets.filter((t) => t.boardingStatus === 'NOT_BOARDED').length,
      passengers: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    TICKET AGENT: Verify Ticket Validity (VERIFY / REJECT based on trip selection)
// @route   POST /api/tickets/agent-verify
// @access  Private (Ticket Agent, Company Admin, Super Admin)
const agentVerifyTicket = async (req, res, next) => {
  try {
    let { ticketId, ticketNumber, status, rejectionReason } = req.body; // status: 'VERIFIED' | 'INVALID' | 'REJECTED'

    if (status === 'INVALID') status = 'REJECTED';
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be VERIFIED, INVALID, or REJECTED.' });
    }

    const query = ticketId ? { _id: ticketId } : { ticketNumber };
    const ticket = await Ticket.findOne(query)
      .populate('booking')
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate('companyId');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId?._id?.toString() || ticket.companyId?.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({ message: 'Access denied: Ticket belongs to another company.' });
      }
    }

    const booking = ticket.booking;

    // Check payment status
    if (booking && !['PAID', 'completed'].includes(booking.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify ticket: Payment has not been completed.',
      });
    }

    // Check cancellation
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED' || booking?.status === 'CANCELLED' || booking?.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify ticket: Ticket or booking has been cancelled or refunded.',
      });
    }

    ticket.verificationStatus = status;
    ticket.verifiedBy = req.user._id;
    ticket.verifiedAt = new Date();
    ticket.rejectionReason = status === 'REJECTED' ? (rejectionReason || 'Rejected by Agent') : '';

    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId: ticket.companyId?._id || ticket.companyId,
      action: status === 'VERIFIED' ? 'TICKET_AGENT_VERIFIED' : 'TICKET_AGENT_REJECTED',
      entityType: 'Ticket',
      entityId: ticket.ticketNumber,
      details: {
        ticketNumber: ticket.ticketNumber,
        passengerName: ticket.passengerName,
        verificationStatus: status,
        rejectionReason: ticket.rejectionReason,
      },
    });

    res.json({
      success: true,
      message: `Ticket ${ticket.ticketNumber} marked as ${status} by Ticket Agent.`,
      ticket,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    CONDUCTOR: Validate Ticket for Boarding (QR Scan or Ticket Number search)
// @route   POST /api/tickets/conductor-validate
// @access  Private (Conductor, Company Admin, Super Admin)
const conductorValidateTicket = async (req, res, next) => {
  try {
    let { ticketNumber, qrData, scheduleId, tripId } = req.body;

    if (qrData) {
      if (qrData.startsWith('ETHIOTRIP:')) {
        const parts = qrData.split(':');
        ticketNumber = parts[1] || qrData;
      } else {
        try {
          const parsed = JSON.parse(qrData);
          ticketNumber = parsed.tkt || qrData;
        } catch {
          ticketNumber = qrData;
        }
      }
    }

    if (!ticketNumber) {
      return res.status(400).json({ message: 'Ticket number or QR code content is required.' });
    }

    let ticket = await Ticket.findOne({ ticketNumber })
      .populate('companyId', 'companyName logo')
      .populate('user', 'name email phone')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate('booking')
      .populate('verifiedBy', 'name email')
      .populate('boardedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        status: 'INVALID_TICKET',
        message: 'Ticket not found in platform database.',
      });
    }

    const booking = ticket.booking;
    const schedule = ticket.schedule;

    // 1. Ticket must be ACTIVE / valid
    if (!['ACTIVE', 'valid'].includes(ticket.status)) {
      return res.status(400).json({
        valid: false,
        status: 'INACTIVE_TICKET',
        message: `Ticket is not active (Current status: ${ticket.status}).`,
        ticket,
      });
    }

    // 2. Payment must be PAID / completed
    if (booking && !['PAID', 'completed'].includes(booking.paymentStatus)) {
      return res.status(400).json({
        valid: false,
        status: 'PAYMENT_PENDING',
        message: 'Payment has not been completed for this ticket.',
        ticket,
      });
    }

    // 3. Booking must be CONFIRMED
    if (booking && !['CONFIRMED', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        valid: false,
        status: 'BOOKING_NOT_CONFIRMED',
        message: `Booking is not confirmed (Current status: ${booking.status}).`,
        ticket,
      });
    }

    // 4. Ticket must not be CANCELLED or REFUNDED
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED' || booking?.status === 'CANCELLED' || booking?.status === 'cancelled') {
      return res.status(400).json({
        valid: false,
        status: 'CANCELLED_TICKET',
        message: 'This ticket or booking has been cancelled / refunded.',
        ticket,
      });
    }

    // 5. Must NOT be already boarded
    if (ticket.boardingStatus === 'BOARDED') {
      return res.status(400).json({
        valid: false,
        status: 'ALREADY_BOARDED',
        message: `Duplicate boarding attempt: Passenger already boarded at ${new Date(ticket.boardedAt || ticket.usedAt).toLocaleTimeString()} (Verified by ${ticket.boardedBy?.name || 'Conductor'}).`,
        ticket,
      });
    }

    // 6. Check company isolation
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const ticketCompanyId = ticket.companyId?._id?.toString() || ticket.companyId?.toString();
      if (userCompanyId && ticketCompanyId && userCompanyId !== ticketCompanyId) {
        return res.status(403).json({
          valid: false,
          status: 'WRONG_COMPANY',
          message: `ACCESS DENIED: Ticket belongs to ${ticket.companyId?.companyName || 'another company'}, not your company.`,
          ticket,
        });
      }
    }

    // 7. Check if conductor is assigned to this specific trip
    if (req.user.role === 'conductor') {
      const assignedConductorId = schedule?.assignedConductor?._id?.toString() || schedule?.assignedConductor?.toString();
      if (assignedConductorId && assignedConductorId !== req.user._id.toString()) {
        return res.status(403).json({
          valid: false,
          status: 'UNAUTHORIZED_CONDUCTOR',
          message: 'You are not the assigned conductor for this specific trip.',
          ticket,
        });
      }
    }

    // 8. Matching trip / schedule check if passed in body
    if (scheduleId && schedule?._id?.toString() !== scheduleId.toString()) {
      return res.status(400).json({
        valid: false,
        status: 'TRIP_MISMATCH',
        message: `Trip mismatch: This ticket is for trip on ${schedule?.date} (${schedule?.departureTime}), not the currently active boarding trip.`,
        ticket,
      });
    }

    // 9. CRITICAL RULE: Check Agent Verification Status
    if (ticket.verificationStatus !== 'VERIFIED') {
      return res.json({
        valid: false,
        status: 'NOT_VERIFIED_BY_AGENT',
        message: 'Ticket has not been verified by a Ticket Agent. Boarding is not allowed until ticket validity is verified at the counter.',
        ticket: {
          _id: ticket._id,
          ticketNumber: ticket.ticketNumber,
          passengerName: ticket.passengerName,
          passengerPhone: ticket.passengerPhone || booking?.passenger?.phone,
          seatNumber: ticket.seatNumber,
          price: ticket.price,
          companyName: ticket.companyId?.companyName,
          route: `${schedule?.route?.from || ''} → ${schedule?.route?.to || ''}`,
          date: schedule?.date,
          departureTime: schedule?.departureTime,
          busNumber: schedule?.bus?.busNumber,
          tripId: schedule?.tripId || ticket.tripId,
          paymentStatus: 'PAID',
          verificationStatus: ticket.verificationStatus || 'PENDING',
          verifiedBy: ticket.verifiedBy?.name || null,
          verifiedAt: ticket.verifiedAt || null,
          boardingStatus: ticket.boardingStatus || 'NOT_BOARDED',
        },
      });
    }

    res.json({
      valid: true,
      status: 'VALID_TICKET',
      message: 'VALID TICKET — AGENT VERIFIED & READY FOR BOARDING',
      ticket: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        passengerName: ticket.passengerName,
        passengerPhone: ticket.passengerPhone || booking?.passenger?.phone,
        seatNumber: ticket.seatNumber,
        price: ticket.price,
        companyName: ticket.companyId?.companyName,
        route: `${schedule?.route?.from || ''} → ${schedule?.route?.to || ''}`,
        date: schedule?.date,
        departureTime: schedule?.departureTime,
        busNumber: schedule?.bus?.busNumber,
        tripId: schedule?.tripId || ticket.tripId,
        paymentStatus: 'PAID',
        verificationStatus: ticket.verificationStatus,
        verifiedBy: ticket.verifiedBy?.name || 'Ticket Agent',
        verifiedAt: ticket.verifiedAt,
        boardingStatus: 'NOT_BOARDED',
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    CONDUCTOR: Confirm Boarding
// @route   POST /api/tickets/conductor-confirm-boarding
// @access  Private (Conductor, Company Admin, Super Admin)
const conductorConfirmBoarding = async (req, res, next) => {
  try {
    const { ticketId, ticketNumber } = req.body;

    const query = ticketId ? { _id: ticketId } : { ticketNumber };
    const ticket = await Ticket.findOne(query)
      .populate('booking')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate('companyId');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.verificationStatus !== 'VERIFIED') {
      return res.status(400).json({ message: 'Cannot confirm boarding: Ticket has not been verified by a Ticket Agent.' });
    }

    if (ticket.boardingStatus === 'BOARDED') {
      return res.status(400).json({ message: 'Passenger has already boarded this bus.' });
    }

    ticket.boardingStatus = 'BOARDED';
    ticket.boardedBy = req.user._id;
    ticket.boardedAt = new Date();
    ticket.status = 'ACTIVE';
    ticket.usedAt = new Date();

    await ticket.save();

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId: ticket.companyId?._id || ticket.companyId,
      action: 'PASSENGER_BOARDED',
      entityType: 'Ticket',
      entityId: ticket.ticketNumber,
      details: {
        ticketNumber: ticket.ticketNumber,
        passengerName: ticket.passengerName,
        seatNumber: ticket.seatNumber,
        busNumber: ticket.schedule?.bus?.busNumber,
      },
    });

    res.json({
      success: true,
      message: 'PASSENGER BOARDING CONFIRMED SUCCESSFULLY',
      ticket,
    });
  } catch (err) {
    next(err);
  }
};

// Legacy compatibility
const verifyTicket = (req, res, next) => conductorValidateTicket(req, res, next);
const verifyTicketByNumber = (req, res, next) => {
  req.body = { ticketNumber: req.params.ticketNumber };
  return conductorValidateTicket(req, res, next);
};

module.exports = {
  getTicketByBooking,
  getTripManifest,
  agentVerifyTicket,
  conductorValidateTicket,
  conductorConfirmBoarding,
  verifyTicket,
  verifyTicketByNumber,
};
