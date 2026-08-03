const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const { scheduleId, selectedSeats, totalAmount, passengerDetails } = req.body;
    if (!scheduleId || !selectedSeats || !selectedSeats.length) {
      return res.status(400).json({ message: 'Schedule ID and selected seats are required' });
    }

    const schedule = await Schedule.findById(scheduleId).populate('bus').populate('route');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    const conflict = selectedSeats.some((seat) => schedule.bookedSeats.includes(seat));
    if (conflict) {
      return res.status(400).json({ message: 'One or more selected seats are already booked' });
    }

    const booking = await Booking.create({
      schedule: scheduleId,
      passenger: passengerDetails || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
      },
      user: req.user._id,
      selectedSeats,
      totalPrice: Number(totalAmount || schedule.price * selectedSeats.length),
      status: 'pending',
      paymentStatus: 'pending',
    });

    const populated = await Booking.findById(booking._id).populate({
      path: 'schedule',
      populate: ['bus', 'route'],
    });

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's bookings
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .sort('-createdAt');
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings (Admin/Agent)
// @route   GET /api/bookings
// @access  Private (Admin/Agent)
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate('user', 'name email phone')
      .sort('-createdAt');
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// @desc    Get daily bookings
// @route   GET /api/bookings/daily
// @access  Private (Admin/Agent)
const getDailyBookings = async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const schedules = await Schedule.find({ date: targetDate });
    const scheduleIds = schedules.map((s) => s._id);

    const bookings = await Booking.find({ schedule: { $in: scheduleIds } })
      .populate({ path: 'schedule', populate: ['bus', 'route'] });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'schedule', populate: ['bus', 'route'] });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel booking & release reserved seats
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Release seats on schedule
    await Schedule.findByIdAndUpdate(booking.schedule, {
      $pull: { bookedSeats: { $in: booking.selectedSeats } },
      $inc: { availableSeats: booking.selectedSeats.length },
    });

    res.json(booking);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  getDailyBookings,
  getBookingById,
  cancelBooking,
};
