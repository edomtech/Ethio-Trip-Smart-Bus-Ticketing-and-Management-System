const Review = require('../models/Review');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');

const PAID_STATES = [PAYMENT_STATUS.PAID, 'completed', 'PAID'];
const REVIEWABLE_BOOKING_STATES = [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CONFIRMED, 'completed', 'confirmed'];

const getCompanyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ companyId: req.params.companyId })
      .populate('user', 'name city')
      .sort('-createdAt');
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    next(err);
  }
};

const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment, categories } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ message: 'Booking ID and rating (1-5) are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.user || booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only review your own completed trip' });
    }

    if (!PAID_STATES.includes(booking.paymentStatus)) {
      return res.status(400).json({ message: 'You can only review trips that have been paid for' });
    }

    if (!REVIEWABLE_BOOKING_STATES.includes(booking.status)) {
      return res.status(400).json({ message: 'You can only review trips that are not cancelled or refunded' });
    }

    const existing = await Review.findOne({ user: req.user._id, booking: bookingId });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a review for this booking' });
    }

    const review = await Review.create({
      user: req.user._id,
      companyId: booking.companyId,
      booking: bookingId,
      rating: Number(rating),
      comment: comment || '',
      categories: categories || {},
    });

    const allCompanyReviews = await Review.find({ companyId: booking.companyId });
    const avgRating = allCompanyReviews.reduce((sum, r) => sum + r.rating, 0) / allCompanyReviews.length;

    await Company.findByIdAndUpdate(booking.companyId, {
      rating: Number(avgRating.toFixed(1)),
      totalReviews: allCompanyReviews.length,
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCompanyReviews,
  createReview,
};
