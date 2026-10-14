const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const Ticket = require('../models/Ticket');
const Discount = require('../models/Discount');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const ticketService = require('./ticketService');
const { BOOKING_STATUS, PAYMENT_STATUS, TICKET_STATUS } = require('../constants/statuses');
const { ROLES } = require('../constants/roles');


const COMPANY_SCOPED_ROLES = [ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR];


const assertBookingAccess = (booking, user) => {
  if (!user) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  if (user.role === ROLES.SUPER_ADMIN) return;

  const actorCompanyId = user.companyId?._id
    ? user.companyId._id.toString()
    : user.companyId
      ? user.companyId.toString()
      : null;

  if (COMPANY_SCOPED_ROLES.includes(user.role)) {
    if (!actorCompanyId) {
      const err = new Error('Access denied: your account is not assigned to any transport company');
      err.statusCode = 403;
      throw err;
    }

    const bookingCompanyId = booking.companyId?._id
      ? booking.companyId._id.toString()
      : booking.companyId
        ? booking.companyId.toString()
        : null;

    if (!bookingCompanyId || bookingCompanyId !== actorCompanyId) {
      const err = new Error('Access denied: this booking belongs to another transport company');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  if (user.role === ROLES.PASSENGER) {
    const ownerId = booking.user?._id || booking.user;
    if (!ownerId || ownerId.toString() !== user._id.toString()) {
      const err = new Error('Access denied to this booking');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const err = new Error('Access denied: your account role cannot access bookings');
  err.statusCode = 403;
  throw err;
};


const checkAndExpirePendingBookings = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: BOOKING_STATUS.PENDING_PAYMENT,
      expiresAt: { $lt: now },
    }).limit(500);

    for (const booking of expiredBookings) {
      const claimed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: BOOKING_STATUS.PENDING_PAYMENT },
        {
          $set: {
            status: BOOKING_STATUS.EXPIRED,
            paymentStatus: PAYMENT_STATUS.EXPIRED,
            cancellationReason: 'PAYMENT_TIMEOUT',
            cancelledAt: now,
          },
        },
        { new: true }
      );

      if (!claimed) continue;

      if (booking.schedule && booking.selectedSeats?.length) {
        await Schedule.findByIdAndUpdate(booking.schedule, {
          $pull: { bookedSeats: { $in: booking.selectedSeats.map(String) } },
          $inc: { availableSeats: booking.selectedSeats.length },
        });
      }

      if (booking.returnLeg?.schedule && booking.returnLeg?.seats?.length) {
        await Schedule.findByIdAndUpdate(booking.returnLeg.schedule, {
          $pull: { bookedSeats: { $in: booking.returnLeg.seats.map(String) } },
          $inc: { availableSeats: booking.returnLeg.seats.length },
        });
      }

      await Ticket.updateMany({ booking: booking._id }, { status: TICKET_STATUS.EXPIRED });

      if (booking.user) {
        await Notification.create({
          user: booking.user,
          companyId: booking.companyId,
          type: 'booking',
          title: 'Booking Expired (Payment Timeout)',
          message: `Your booking ${booking.ticketNumber} expired because payment was not completed within 15 minutes. Reserved seats have been released.`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[BookingService] Error checking expired bookings:', err.message);
  }
};

const cleanerInterval = setInterval(checkAndExpirePendingBookings, 2 * 60 * 1000);
if (cleanerInterval.unref) cleanerInterval.unref();


const atomicallyReserveSeats = async (scheduleId, seatsToReserve) => {
  const schedule = await Schedule.findById(scheduleId).populate('bus');
  if (!schedule) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }

  if (schedule.status !== 'scheduled') {
    const err = new Error('This trip is not open for booking');
    err.statusCode = 400;
    throw err;
  }

  const seatsStr = [...new Set(seatsToReserve.map((s) => String(s).trim()).filter(Boolean))];
  if (seatsStr.length === 0) {
    const err = new Error('No valid seats selected');
    err.statusCode = 400;
    throw err;
  }

  const capacity = schedule.bus?.capacity ?? schedule.totalSeats ?? null;
  if (capacity && seatsStr.length > capacity) {
    const err = new Error('You cannot book more seats than the bus capacity');
    err.statusCode = 400;
    throw err;
  }

  const updatedSchedule = await Schedule.findOneAndUpdate(
    {
      _id: scheduleId,
      status: 'scheduled',
      $expr: { $gte: [{ $ifNull: ['$availableSeats', 0] }, seatsStr.length] },
      bookedSeats: { $nin: seatsStr },
    },
    {
      $push: { bookedSeats: { $each: seatsStr } },
      $inc: { availableSeats: -seatsStr.length },
    },
    { new: true }
  ).populate('bus route companyId');

  if (!updatedSchedule) {
    const err = new Error('One or more of the selected seats is no longer available. Please choose again.');
    err.statusCode = 409;
    throw err;
  }

  return updatedSchedule;
};


const atomicallyReleaseSeats = async (scheduleId, seatsToRelease) => {
  const seatsStr = seatsToRelease.map(String);
  await Schedule.findByIdAndUpdate(scheduleId, {
    $pull: { bookedSeats: { $in: seatsStr } },
    $inc: { availableSeats: seatsStr.length },
  });
};


const createBooking = async (bookingData, authenticatedUser) => {
  await checkAndExpirePendingBookings();

  const {
    scheduleId,
    outboundScheduleId,
    selectedSeats,
    outboundSeats,
    returnScheduleId,
    returnSeats,
    discountCode,
    passengerDetails,
    tripType,
  } = bookingData;

  const primaryScheduleId = outboundScheduleId || scheduleId;
  const primarySeats = outboundSeats || selectedSeats;

  if (!primaryScheduleId || !primarySeats || !primarySeats.length) {
    const err = new Error('Departure schedule and seat selection are required');
    err.statusCode = 400;
    throw err;
  }

  const outboundSchedule = await atomicallyReserveSeats(primaryScheduleId, primarySeats);
  if (!outboundSchedule) {
    const err = new Error('One or more selected departure seats were just booked by another passenger. Please choose different seats.');
    err.statusCode = 409;
    throw err;
  }

  const isRound = tripType === 'round' && returnScheduleId && returnSeats && returnSeats.length > 0;
  let returnSchedule = null;

  if (isRound) {
    returnSchedule = await atomicallyReserveSeats(returnScheduleId, returnSeats);
    if (!returnSchedule) {
      await atomicallyReleaseSeats(primaryScheduleId, primarySeats);
      const err = new Error('One or more selected return seats are no longer available. Please choose different seats.');
      err.statusCode = 409;
      throw err;
    }

    if (returnSchedule.date < outboundSchedule.date) {
      await atomicallyReleaseSeats(primaryScheduleId, primarySeats);
      await atomicallyReleaseSeats(returnScheduleId, returnSeats);
      const err = new Error('Return travel date must be on or after outbound departure date');
      err.statusCode = 400;
      throw err;
    }
  }

  const companyId = outboundSchedule.companyId?._id || outboundSchedule.companyId;

  const outboundFare = outboundSchedule.price * primarySeats.length;
  const returnFare = isRound ? returnSchedule.price * returnSeats.length : 0;
  const baseFare = outboundFare + returnFare;

  let discountAmount = 0;
  let appliedDiscountCode = '';

  if (discountCode) {
    const discountObj = await Discount.findOne({
      companyId,
      code: discountCode.toUpperCase().trim(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (discountObj && baseFare >= (discountObj.minAmount || 0)) {
      if (discountObj.discountType === 'percentage') {
        discountAmount = Math.round((baseFare * discountObj.discountValue) / 100);
      } else {
        discountAmount = Math.min(discountObj.discountValue, baseFare);
      }
      appliedDiscountCode = discountObj.code;
    }
  }

  if (isRound && discountAmount === 0) {
    discountAmount = Math.round(baseFare * 0.1);
    appliedDiscountCode = 'ROUNDTRIP10';
  }

  const totalPrice = Math.max(0, baseFare - discountAmount);

  const holdMinutes = parseInt(process.env.SEAT_HOLD_MINUTES || '15', 10);
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const passengerData = {
    name: (passengerDetails?.name || passengerDetails?.fullName || authenticatedUser.name || 'Passenger').trim(),
    phone: (passengerDetails?.phone || authenticatedUser.phone || '').trim(),
    email: (passengerDetails?.email || authenticatedUser.email || '').trim().toLowerCase(),
    gender: passengerDetails?.gender || 'Male',
    age: passengerDetails?.age || '',
  };

  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ticketNumber = `ETH-${ts}-${rand}`;

  const isPaidDirectly =
    bookingData.paymentStatus === 'PAID' ||
    authenticatedUser.role === 'company_staff' ||
    authenticatedUser.role === 'company_admin' ||
    bookingData.bookingChannel === 'counter' ||
    bookingData.bookingChannel === 'walk_in';

  const initialBookingStatus = isPaidDirectly ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING_PAYMENT;
  const initialPaymentStatus = isPaidDirectly ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING;

  const booking = await Booking.create({
    companyId,
    ticketNumber,
    schedule: outboundSchedule._id,
    passenger: passengerData,
    user: authenticatedUser._id,
    selectedSeats: primarySeats.map(String),
    baseFare,
    discountAmount,
    discountCode: appliedDiscountCode,
    totalPrice,
    tripType: isRound ? 'round' : 'oneway',
    status: initialBookingStatus,
    paymentStatus: initialPaymentStatus,
    paymentMethod: bookingData.paymentMethod || (isPaidDirectly ? 'Cash' : undefined),
    bookingChannel: bookingData.bookingChannel || (isPaidDirectly ? 'walk_in' : 'online'),
    expiresAt,
    outboundLeg: {
      schedule: outboundSchedule._id,
      bus: outboundSchedule.bus?._id || outboundSchedule.bus,
      route: outboundSchedule.route?._id || outboundSchedule.route,
      date: outboundSchedule.date,
      departureTime: outboundSchedule.departureTime,
      seats: primarySeats.map(String),
      price: outboundFare,
      status: 'CONFIRMED',
    },
    returnLeg: isRound ? {
      schedule: returnSchedule._id,
      bus: returnSchedule.bus?._id || returnSchedule.bus,
      route: returnSchedule.route?._id || returnSchedule.route,
      date: returnSchedule.date,
      departureTime: returnSchedule.departureTime,
      seats: returnSeats.map(String),
      price: returnFare,
      status: 'CONFIRMED',
    } : undefined,
  });

  if (isPaidDirectly) {
    const Payment = require('../models/Payment');
    await Payment.create({
      booking: booking._id,
      user: authenticatedUser._id,
      companyId,
      amount: totalPrice,
      currency: 'ETB',
      method: bookingData.paymentMethod || 'Cash',
      status: PAYMENT_STATUS.PAID,
      transactionId: `TXN-${ticketNumber}`,
    }).catch(() => {});
  }

  await AuditLog.create({
    user: authenticatedUser._id,
    userEmail: authenticatedUser.email,
    userRole: authenticatedUser.role,
    companyId,
    action: isPaidDirectly ? 'COUNTER_BOOKING_ISSUED' : 'BOOKING_CREATED',
    entityType: 'Booking',
    entityId: booking._id.toString(),
    details: {
      ticketNumber,
      seats: primarySeats,
      totalPrice,
      tripType: isRound ? 'round' : 'oneway',
      paymentStatus: initialPaymentStatus,
      paymentMethod: bookingData.paymentMethod || (isPaidDirectly ? 'Cash' : undefined),
    },
  }).catch(() => {});

  try {
    await ticketService.generateTicketsForBooking(booking, isPaidDirectly ? 'ACTIVE' : 'PENDING');
  } catch (err) {
    console.error('Failed to generate initial tickets for booking:', err.message);
  }

  const populated = await Booking.findById(booking._id)
    .populate('companyId', 'companyName logo cancellationPolicy phone email')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] });

  return { booking: populated, expiresAt, holdMinutes };
};

const getBookingById = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId)
    .populate('companyId', 'companyName logo cancellationPolicy phone email')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  assertBookingAccess(booking, user);

  return booking;
};

const cancelBooking = async (bookingId, user, reason) => {
  const booking = await getBookingById(bookingId, user);

  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REFUNDED, BOOKING_STATUS.EXPIRED].includes(booking.status)) {
    const err = new Error(`Booking is already ${booking.status}`);
    err.statusCode = 400;
    throw err;
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = reason || 'Cancelled by passenger';
  booking.cancelledAt = new Date();
  await booking.save();

  if (booking.schedule && booking.selectedSeats?.length) {
    await atomicallyReleaseSeats(booking.schedule, booking.selectedSeats);
  }
  if (booking.returnLeg?.schedule && booking.returnLeg?.seats?.length) {
    await atomicallyReleaseSeats(booking.returnLeg.schedule, booking.returnLeg.seats);
  }

  await Ticket.updateMany({ booking: booking._id }, { status: TICKET_STATUS.CANCELLED });

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: booking.companyId?._id || booking.companyId,
    action: 'BOOKING_CANCELLED',
    entityType: 'Booking',
    entityId: booking._id.toString(),
    details: { reason },
  }).catch(() => {});

  return booking;
};

const getUserBookings = async (userId) => {
  return Booking.find({ user: userId })
    .populate('companyId', 'companyName logo phone email')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] })
    .sort({ createdAt: -1 });
};

const getCompanyBookings = async (companyId, queryParams = {}) => {
  const filter = { companyId };
  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.paymentStatus) filter.paymentStatus = queryParams.paymentStatus;

  return Booking.find(filter)
    .populate('user', 'name email phone')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .sort({ createdAt: -1 });
};

const getAllBookingsSuperAdmin = async (queryParams = {}) => {
  const filter = {};
  if (queryParams.companyId) filter.companyId = queryParams.companyId;
  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.paymentStatus) filter.paymentStatus = queryParams.paymentStatus;

  return Booking.find(filter)
    .populate('companyId', 'companyName')
    .populate('user', 'name email phone')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .sort({ createdAt: -1 });
};

module.exports = {
  checkAndExpirePendingBookings,
  atomicallyReserveSeats,
  atomicallyReleaseSeats,
  createBooking,
  getBookingById,
  cancelBooking,
  getUserBookings,
  getCompanyBookings,
  getAllBookingsSuperAdmin,
  assertBookingAccess,
};
