const bookingService = require('../services/bookingService');
const paymentService = require('../services/paymentService');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');


const createBooking = async (req, res, next) => {
  try {
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Seats reserved successfully. Please complete payment within the hold window.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await bookingService.cancelBooking(req.params.id, req.user, reason);
    res.json({
      success: true,
      message: 'Booking cancelled successfully. Reserved seats released.',
      booking,
    });
  } catch (err) {
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user._id);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

const getBookings = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      const bookings = await bookingService.getAllBookingsSuperAdmin(req.query);
      return res.json(bookings);
    }

    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) return res.status(403).json({ message: 'No company assigned' });

    const bookings = await bookingService.getCompanyBookings(companyId, req.query);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

const getDailyBookings = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const query = { createdAt: { $gte: today, $lt: tomorrow } };
    if (req.user.role === 'super_admin') {
      const bookings = await bookingService.getAllBookingsSuperAdmin(query);
      return res.json(bookings);
    }
    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) {
      return res.status(403).json({ message: 'No company assigned' });
    }
    const bookings = await bookingService.getCompanyBookings(companyId, query);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

const processRefundDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return res.status(400).json({ message: 'decision must be APPROVED or REJECTED' });
    }

    const booking = await bookingService.getBookingById(id, req.user);
    if (decision === 'APPROVED') {
      booking.status = 'REFUNDED';
      booking.paymentStatus = 'REFUNDED';
    }
    booking.refundDecision = decision;
    booking.refundReason = reason || booking.refundReason;
    booking.refundDecidedBy = req.user._id;
    booking.refundDecidedAt = new Date();
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

const cleanupExpired = async (req, res, next) => {
  try {
    await bookingService.checkAndExpirePendingBookings();
    res.json({ success: true, message: 'Expired booking cleaner executed' });
  } catch (err) {
    next(err);
  }
};

const uploadPaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receiptImage, paymentMethod, transactionReference, submittedAmount, receiptNote } = req.body;

    const result = await paymentService.submitManualPaymentReceipt(
      id,
      { receiptImage, paymentMethod, transactionReference, submittedAmount, receiptNote },
      req.user
    );

    res.json({
      success: true,
      message: 'Payment receipt uploaded successfully! Waiting for company staff verification.',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getPendingReceipts = async (req, res, next) => {
  try {
    const filter = {
      $or: [
        { receiptStatus: 'PENDING' },
        { status: BOOKING_STATUS.PENDING_VERIFICATION },
        { status: BOOKING_STATUS.RECEIPT_SUBMITTED },
      ],
    };

    if (req.user.role !== 'super_admin') {
      const companyId = req.user.companyId?._id || req.user.companyId;
      if (!companyId) return res.json([]);
      filter.companyId = companyId;
    }

    const bookings = await Booking.find(filter)
      .populate('companyId', 'companyName logo phone email')
      .populate('user', 'name email phone')
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] })
      .sort({ receiptUploadedAt: -1, updatedAt: -1 });

    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

const reviewPaymentReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, note, rejectionReason } = req.body;  

    const result = await paymentService.reviewManualPaymentReceipt(
      id,
      decision,
      { rejectionReason: rejectionReason || note, note },
      req.user
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};


module.exports = {
  createBooking,
  getBookingById,
  cancelBooking,
  getMyBookings,
  getAllBookings: getBookings,
  getBookings,
  getDailyBookings,
  processRefundDecision,
  cleanupExpired,
  uploadPaymentReceipt,
  getPendingReceipts,
  reviewPaymentReceipt,
};
