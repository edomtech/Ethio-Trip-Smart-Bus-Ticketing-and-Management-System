const paymentService = require('../services/paymentService');
const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');

const chapaInitialize = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

    const result = await paymentService.initializePayment(bookingId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const chapaVerify = async (req, res, next) => {
  try {
    const { txRef } = req.params;
    if (!txRef) return res.status(400).json({ message: 'Transaction reference is required' });

    const result = await paymentService.verifyPayment(txRef, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const chapaWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];
    const result = await paymentService.handleWebhook(req.body, signature, req.rawBody);
    res.status(200).json(result);
  } catch (err) {
    console.error('[PaymentController] Webhook error:', err.message);
    res.status(err.statusCode === 401 ? 401 : 400).json({ success: false, message: err.message });
  }
};

const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, isDevMock } = req.body;

    if (isDevMock && process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_MOCK_PAYMENT === 'true') {
      const result = await paymentService.executeDevMockPayment(bookingId, req.user);
      return res.status(201).json(result);
    }

    const result = await paymentService.initializePayment(bookingId, req.user);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { transactionId, txRef } = req.body;
    const ref = transactionId || txRef;
    if (!ref) return res.status(400).json({ message: 'Transaction reference is required' });

    const result = await paymentService.verifyPayment(ref, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getUserPaymentHistory = async (req, res, next) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user._id);
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      const payments = await paymentService.getAllPaymentsSuperAdmin(req.query);
      return res.json(payments);
    }

    const companyId = req.user.companyId?._id || req.user.companyId;
    if (!companyId) return res.status(403).json({ message: 'No company assigned' });

    const payments = await paymentService.getCompanyPayments(companyId);
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (req.user.role !== 'super_admin') {
      const userComp = req.user.companyId?._id?.toString() || req.user.companyId?.toString();
      const payComp = payment.companyId?.toString() || payment.company?.toString();
      if (userComp !== payComp) {
        return res.status(403).json({ message: 'Access denied to this payment' });
      }
    }

    const { status } = req.body;
    if (status === PAYMENT_STATUS.PAID && payment.status !== PAYMENT_STATUS.PAID) {
      return res.status(400).json({
        success: false,
        message: 'Security policy: Payments cannot be manually marked as PAID. They must be verified through the Chapa gateway.',
      });
    }

    if (status) payment.status = status;
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};

const requestRefund = async (req, res, next) => {
  try {
    const { bookingId, reason, leg } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('companyId', 'companyName cancellationPolicy')
      .populate('schedule');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this booking' });
    }

    const tripDateStr = booking.schedule?.date || booking.outboundLeg?.date;
    if (tripDateStr) {
      const tripDate = new Date(tripDateStr);
      if (!isNaN(tripDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tripDayEnd = new Date(tripDate);
        tripDayEnd.setHours(23, 59, 59, 999);
        if (today > tripDayEnd) {
          return res.status(400).json({
            message: 'Refund requests can only be submitted up to the trip departure day. This trip date has already passed.',
          });
        }
      }
    }

    const payment = await Payment.findOne({
      booking: bookingId,
      status: PAYMENT_STATUS.PAID,
    });
    if (!payment) {
      return res.status(400).json({ message: 'Cannot request refund for an unpaid booking' });
    }

    const existing = await Refund.findOne({ bookingId, status: { $nin: ['REJECTED', 'REVERSED'] } });
    if (existing) {
      return res.status(400).json({ message: 'A refund request already exists for this booking' });
    }

    const policy = booking.companyId?.cancellationPolicy || { deadlineHours: 24, refundPercentage: 80 };
    const refundPercentage = policy.refundPercentage || 80;
    const refundableAmount = Math.round((payment.amount * refundPercentage) / 100);

    const refund = await Refund.create({
      bookingId,
      paymentId: payment._id,
      passengerId: req.user._id,
      companyId: booking.companyId?._id || booking.companyId,
      txRef: payment.chapaTxRef || payment.txRef || payment.transactionId,
      amount: refundableAmount,
      reason: reason || 'Passenger cancellation',
      leg: leg || 'all',
      status: 'REQUESTED',
    });

    booking.refundStatus = 'PENDING';
    booking.refundAmount = refundableAmount;
    booking.refundReason = reason || '';
    await booking.save();

    await Notification.create({
      user: req.user._id,
      companyId: booking.companyId?._id || booking.companyId,
      type: 'payment',
      title: 'Refund Request Submitted',
      message: `Refund of ETB ${refundableAmount} requested for booking ${booking.ticketNumber}. Awaiting operator decision.`,
    }).catch(() => {});

    res.status(201).json({ success: true, refund, refundableAmount });
  } catch (err) {
    next(err);
  }
};

const getRefunds = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin' && !req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view refunds.',
      });
    }

    const query =
      req.user.role === 'super_admin'
        ? {}
        : { companyId: req.user.companyId?._id || req.user.companyId };

    const refunds = await Refund.find(query)
      .populate('bookingId', 'ticketNumber totalPrice tripType status paymentStatus')
      .populate('paymentId', 'amount txRef chapaTxRef status')
      .populate('passengerId', 'name email phone')
      .populate('companyId', 'companyName')
      .sort('-requestedAt');

    res.json(refunds);
  } catch (err) {
    next(err);
  }
};

const getMyRefunds = async (req, res, next) => {
  try {
    const refunds = await Refund.find({ passengerId: req.user._id })
      .populate('bookingId', 'ticketNumber totalPrice tripType status paymentStatus')
      .populate('paymentId', 'amount txRef chapaTxRef status')
      .populate('companyId', 'companyName')
      .sort('-requestedAt');

    res.json(refunds);
  } catch (err) {
    next(err);
  }
};

const refundDecision = async (req, res, next) => {
  try {
    const { decision, adminNote } = req.body;
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund request not found' });

    if (req.user.role !== 'super_admin') {
      const compId = req.user.companyId?._id?.toString() || req.user.companyId?.toString();
      if (compId !== refund.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied to this refund' });
      }
    }

    if (decision === 'REJECTED') {
      refund.status = 'REJECTED';
      refund.adminNote = adminNote || '';
      refund.processedAt = new Date();
      await refund.save();

      await Booking.findByIdAndUpdate(refund.bookingId, { refundStatus: 'REJECTED' });
      return res.json({ success: true, refund });
    }

    refund.status = 'APPROVED';
    refund.adminNote = adminNote || '';
    refund.processedAt = new Date();
    await refund.save();

    await Booking.findByIdAndUpdate(refund.bookingId, {
      status: BOOKING_STATUS.CANCELLED,
      paymentStatus: PAYMENT_STATUS.REFUNDED,
      refundStatus: 'REFUNDED',
    });

    await Payment.findByIdAndUpdate(refund.paymentId, {
      status: PAYMENT_STATUS.REFUNDED,
    });

    res.json({ success: true, refund });
  } catch (err) {
    next(err);
  }
};

const verifyRefund = async (req, res, next) => {
  try {
    const refund = await Refund.findOne({
      _id: req.params.id,
      ...(req.user.role === 'super_admin' ? {} : { companyId: req.user.companyId?._id || req.user.companyId }),
    })
      .populate('bookingId', 'ticketNumber totalPrice tripType status paymentStatus')
      .populate('paymentId', 'amount txRef chapaTxRef status')
      .populate('passengerId', 'name email phone')
      .populate('companyId', 'companyName');

    if (!refund) return res.status(404).json({ message: 'Refund not found' });
    res.json({ success: true, refund });
  } catch (err) {
    next(err);
  }
};

const submitManualReceipt = async (req, res, next) => {
  try {
    const { bookingId, receiptImage, paymentMethod, transactionReference, submittedAmount, receiptNote } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId is required' });

    const result = await paymentService.submitManualPaymentReceipt(
      bookingId,
      { receiptImage, paymentMethod, transactionReference, submittedAmount, receiptNote },
      req.user
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const reviewManualReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, rejectionReason, note } = req.body;
    if (!decision) return res.status(400).json({ success: false, message: 'Decision (APPROVE or REJECT) is required' });

    const result = await paymentService.reviewManualPaymentReceipt(
      id,
      decision,
      { rejectionReason, note },
      req.user
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getPendingManualReceipts = async (req, res, next) => {
  try {
    const payments = await paymentService.getPendingManualPayments(req.user, req.query);
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
  getMyRefunds,
  refundDecision,
  verifyRefund,
  submitManualReceipt,
  reviewManualReceipt,
  getPendingManualReceipts,
};
