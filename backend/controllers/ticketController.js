const ticketService = require('../services/ticketService');
const Ticket = require('../models/Ticket');

const getTicketByBooking = async (req, res, next) => {
  try {
    const result = await ticketService.getTicketsByBooking(req.params.bookingId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getTripManifest = async (req, res, next) => {
  try {
    const { scheduleId } = req.query;
    if (!scheduleId) return res.status(400).json({ message: 'scheduleId is required' });

    const manifest = await ticketService.getTripManifest(scheduleId, req.user);

    const totalPassengers        = manifest.length;
    const boardedCount           = manifest.filter(t => t.boardingStatus === 'BOARDED').length;
    const notBoardedCount        = totalPassengers - boardedCount;
    const verifiedCount          = manifest.filter(t => t.verificationStatus === 'VERIFIED').length;
    const pendingVerificationCount = manifest.filter(t => t.verificationStatus === 'PENDING').length;
    const rejectedCount          = manifest.filter(t => t.verificationStatus === 'REJECTED').length;

    res.json({
      success: true,
      count: totalPassengers,
      manifest,
      passengers: manifest,           
      totalPassengers,
      boardedCount,
      notBoardedCount,
      verifiedCount,
      pendingVerificationCount,
      rejectedCount,
    });
  } catch (err) {
    next(err);
  }
};

const agentVerifyTicket = async (req, res, next) => {
  try {
    const { ticketId, ticketNumber, status, rejectionReason } = req.body;
    if (status && !['VERIFIED', 'PENDING', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'status must be VERIFIED, PENDING or REJECTED' });
    }
    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ message: 'A rejection reason is required when rejecting a ticket' });
    }

    const query = req.user.role === 'super_admin'
      ? {}
      : { companyId: req.user.companyId?._id || req.user.companyId || null };

    if (ticketId) query._id = ticketId;
    else if (ticketNumber) query.ticketNumber = ticketNumber;
    else return res.status(400).json({ message: 'ticketId or ticketNumber is required' });

    const ticket = await Ticket.findOne(query);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found for your company' });

    if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(ticket.status)) {
      return res.status(400).json({ message: `Ticket cannot be verified in status: ${ticket.status}` });
    }

    ticket.verificationStatus = status || 'VERIFIED';
    ticket.rejectionReason = rejectionReason || '';
    ticket.verifiedBy = req.user._id;
    ticket.verifiedAt = new Date();
    await ticket.save();

    res.json({ success: true, message: `Ticket ${ticket.ticketNumber} updated to ${ticket.verificationStatus}`, ticket });
  } catch (err) {
    next(err);
  }
};

const conductorValidateTicket = async (req, res, next) => {
  try {
    const { ticketNumber, qrData, scheduleId } = req.body;
    const identifier = qrData || ticketNumber;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Ticket number or QR code content is required.' });
    }

    const result = await ticketService.validateTicketForBoarding(identifier, req.user, scheduleId);

    // NOT_VERIFIED_BY_AGENT returns 200 so the conductor UI can still render the
    // matched passenger details alongside the "counter verification required" notice.
    if (!result.valid && result.status === 'NOT_VERIFIED_BY_AGENT') {
      return res.status(200).json({ success: false, ...result });
    }

    if (!result.valid) {
      return res.status(result.status === 'NOT_FOUND' ? 404 : 400).json({ success: false, ...result });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const conductorConfirmBoarding = async (req, res, next) => {
  try {
    const { ticketId, ticketNumber } = req.body;
    const ticket = await ticketService.confirmPassengerBoarding(ticketId, ticketNumber, req.user);
    res.json({
      success: true,
      message: `Passenger boarding confirmed for ticket ${ticket.ticketNumber}`,
      ticket,
    });
  } catch (err) {
    if (err.code === 'NOT_VERIFIED_BY_AGENT') {
      return res.status(403).json({ success: false, code: err.code, message: err.message });
    }
    next(err);
  }
};

const verifyTicket = async (req, res, next) => {
  return conductorValidateTicket(req, res, next);
};

const verifyTicketByNumber = async (req, res, next) => {
  req.body.ticketNumber = req.params.ticketNumber;
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
