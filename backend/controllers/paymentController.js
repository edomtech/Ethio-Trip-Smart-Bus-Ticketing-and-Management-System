const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');

// @desc    Initiate payment and confirm booking
// @route   POST /api/payments/initiate
// @access  Private
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, amount, method } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const payment = await Payment.create({
      booking: bookingId,
      user: req.user._id,
      amount: Number(amount || booking.totalPrice),
      method: method || 'Chapa',
      status: 'completed',
      transactionId,
    });

    // Confirm booking status
    booking.status = 'confirmed';
    booking.paymentStatus = 'completed';
    await booking.save();

    // Lock reserved seats in schedule
    await Schedule.findByIdAndUpdate(booking.schedule, {
      $push: { bookedSeats: { $each: booking.selectedSeats } },
      $inc: { availableSeats: -booking.selectedSeats.length },
    });

    res.status(201).json({ success: true, transactionId, payment });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify payment by transaction ID
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.body;
    const payment = await Payment.findOne({ transactionId });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ verified: true, payment });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user payment history
// @route   GET /api/payments/history
// @access  Private
const getUserPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate({
        path: 'booking',
        populate: { path: 'schedule', populate: ['bus', 'route'] },
      })
      .sort('-createdAt');
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Private (Admin)
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate({
        path: 'booking',
        populate: { path: 'schedule', populate: ['bus', 'route'] },
      })
      .sort('-createdAt');
    res.json(payments);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  getUserPaymentHistory,
  getAllPayments,
};
