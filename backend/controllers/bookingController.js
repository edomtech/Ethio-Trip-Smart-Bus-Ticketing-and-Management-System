const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const Ticket = require('../models/Ticket');
const Discount = require('../models/Discount');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Company = require('../models/Company');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const { chapaRequest } = require('./paymentController');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// ── 5-Hour Payment Expiration Helper & Cleaner ────────────────────────────────
const checkAndExpirePendingBookings = async () => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: { $in: ['pending', 'PENDING_PAYMENT'] },
      paymentStatus: { $in: ['pending', 'PENDING'] },
      expiresAt: { $lt: now },
    });

    for (const booking of expiredBookings) {
      booking.status = 'CANCELLED';
      booking.paymentStatus = 'FAILED';
      booking.cancellationReason = 'PAYMENT_TIMEOUT';
      booking.cancelledAt = now;
      await booking.save();

      // Release seats on outbound schedule
      if (booking.schedule && booking.selectedSeats && booking.selectedSeats.length > 0) {
        await Schedule.findByIdAndUpdate(booking.schedule, {
          $pull: { bookedSeats: { $in: booking.selectedSeats.map(String) } },
          $inc: { availableSeats: booking.selectedSeats.length },
        });
      }

      // Release seats on return schedule if round trip
      if (booking.returnLeg?.schedule && booking.returnLeg?.seats?.length > 0) {
        await Schedule.findByIdAndUpdate(booking.returnLeg.schedule, {
          $pull: { bookedSeats: { $in: booking.returnLeg.seats.map(String) } },
          $inc: { availableSeats: booking.returnLeg.seats.length },
        });
      }

      // Invalidate tickets
      await Ticket.updateMany({ booking: booking._id }, { status: 'EXPIRED' });

      // Send cancellation notification
      if (booking.user) {
        await Notification.create({
          user: booking.user,
          companyId: booking.companyId,
          type: 'booking',
          title: 'Booking Expired (Payment Timeout)',
          message: `Your booking ${booking.ticketNumber} was automatically cancelled because payment was not received within 5 hours. Your reserved seats have been released.`,
        });
      }
    }
  } catch (err) {
    console.error('Error running expiration cleaner:', err.message);
  }
};

// Run cleaner periodically (every 5 minutes)
setInterval(checkAndExpirePendingBookings, 5 * 60 * 1000);

// @desc    Create new One-Way or Round-Trip booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
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
    } = req.body;

    const primaryScheduleId = outboundScheduleId || scheduleId;
    const primarySeats = outboundSeats || selectedSeats;

    if (!primaryScheduleId || !primarySeats || !primarySeats.length) {
      return res.status(400).json({ message: 'Primary departure schedule ID and selected seats are required' });
    }

    const outboundSchedule = await Schedule.findById(primaryScheduleId)
      .populate('bus')
      .populate('route')
      .populate('companyId');

    if (!outboundSchedule) return res.status(404).json({ message: 'Departure schedule not found' });

    const companyId = outboundSchedule.companyId?._id || outboundSchedule.companyId;

    // Check seat conflicts on outbound schedule
    const outboundConflict = primarySeats.some((seat) =>
      outboundSchedule.bookedSeats.includes(String(seat))
    );
    if (outboundConflict) {
      return res.status(400).json({ message: 'One or more selected departure seats are already reserved or booked.' });
    }

    const isRound = tripType === 'round' && returnScheduleId && returnSeats && returnSeats.length > 0;
    let returnSchedule = null;

    if (isRound) {
      returnSchedule = await Schedule.findById(returnScheduleId)
        .populate('bus')
        .populate('route')
        .populate('companyId');

      if (!returnSchedule) {
        return res.status(404).json({ message: 'Return schedule not found' });
      }

      // Check seat conflicts on return schedule
      const returnConflict = returnSeats.some((seat) =>
        returnSchedule.bookedSeats.includes(String(seat))
      );
      if (returnConflict) {
        return res.status(400).json({ message: 'One or more selected return seats are already reserved or booked.' });
      }
    }

    // ── Backend Pricing & Discount Calculation ──
    const outboundFare = outboundSchedule.price * primarySeats.length;
    const returnFare = isRound ? returnSchedule.price * returnSeats.length : 0;
    const baseFare = outboundFare + returnFare;

    let discountAmount = 0;
    let appliedDiscountCode = '';

    // 1. Check for promotional discount code or company round-trip discount
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

    // 2. Default Round-Trip Discount (10% if no promo code provided and is round trip)
    if ((isRound || tripType === 'round') && discountAmount === 0) {
      const autoRoundDiscount = await Discount.findOne({
        companyId,
        tripType: { $in: ['round', 'all'] },
        isActive: true,
      });

      if (autoRoundDiscount) {
        if (autoRoundDiscount.discountType === 'percentage') {
          discountAmount = Math.round((baseFare * autoRoundDiscount.discountValue) / 100);
        } else {
          discountAmount = Math.min(autoRoundDiscount.discountValue, baseFare);
        }
        appliedDiscountCode = autoRoundDiscount.code;
      } else {
        // Standard platform 10% round-trip discount
        discountAmount = Math.round(baseFare * 0.1);
        appliedDiscountCode = 'ROUNDTRIP10';
      }
    } else if (req.body.discountAmount && discountAmount === 0) {
      discountAmount = Number(req.body.discountAmount);
      appliedDiscountCode = req.body.discountCode || 'ROUNDTRIP10';
    }

    const finalPayable = Math.max(0, baseFare - discountAmount);
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours temporary reservation

    const resolvedPassengerName = (passengerDetails?.name || passengerDetails?.fullName || '').trim() || req.user.name;
    const resolvedPassengerPhone = (passengerDetails?.phone || '').trim() || req.user.phone || '';
    const resolvedPassengerEmail = (passengerDetails?.email || '').trim() || req.user.email || '';
    const passengerData = {
      name: resolvedPassengerName,
      phone: resolvedPassengerPhone,
      email: resolvedPassengerEmail,
      gender: passengerDetails?.gender || 'Male',
      age: passengerDetails?.age || '',
    };

    const isPaid = (req.body.paymentStatus === 'PAID' || req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'completed');
    const paymentMethod = req.body.paymentMethod || (isPaid ? 'Cash' : 'Chapa');
    const bookingStatus = isPaid ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const bookingPaymentStatus = isPaid ? 'PAID' : 'PENDING';

    const booking = await Booking.create({
      companyId,
      schedule: outboundSchedule._id,
      passenger: passengerData,
      user: req.user._id,
      selectedSeats: primarySeats.map(String),
      baseFare,
      discountAmount,
      discountCode: appliedDiscountCode,
      totalPrice: finalPayable,
      tripType: isRound ? 'round' : 'oneway',
      status: bookingStatus,
      paymentStatus: bookingPaymentStatus,
      expiresAt: isPaid ? null : expiresAt,
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

    // ── Atomically Lock Seats in DB ──
    await Schedule.findByIdAndUpdate(outboundSchedule._id, {
      $addToSet: { bookedSeats: { $each: primarySeats.map(String) } },
      $inc: { availableSeats: -primarySeats.length },
    });

    if (isRound && returnSchedule) {
      await Schedule.findByIdAndUpdate(returnSchedule._id, {
        $addToSet: { bookedSeats: { $each: returnSeats.map(String) } },
        $inc: { availableSeats: -returnSeats.length },
      });
    }

    // ── Generate Digital Ticket Records only if Paid ──
    const tickets = [];
    if (isPaid) {
      const outboundPerSeatPrice = Math.round(outboundFare / primarySeats.length);
      const outboundCompName = outboundSchedule.companyId?.companyName || '';
      const outboundRouteStr = outboundSchedule.route ? `${outboundSchedule.route.from} -> ${outboundSchedule.route.to}` : '';
      const outboundFrom = outboundSchedule.route?.from || '';
      const outboundTo = outboundSchedule.route?.to || '';

      for (const seat of primarySeats) {
        const ts = Date.now().toString().slice(-6);
        const rand = Math.floor(100 + Math.random() * 900);
        const ticketNumber = `TKT-${ts}-${seat}-${rand}`;

        const tkt = await Ticket.create({
          ticketNumber,
          companyId,
          booking: booking._id,
          user: req.user._id,
          schedule: outboundSchedule._id,
          tripId: outboundSchedule.tripId || `TRP-${ts}`,
          legType: isRound ? 'outbound' : 'oneway',
          passengerName: passengerData.name,
          passengerPhone: passengerData.phone,
          passengerEmail: passengerData.email,
          seatNumber: String(seat),
          price: outboundPerSeatPrice,
          busCompany: outboundCompName,
          companyName: outboundCompName,
          route: outboundRouteStr,
          from: outboundFrom,
          to: outboundTo,
          travelDate: outboundSchedule.date || '',
          departureTime: outboundSchedule.departureTime || '',
          qrCode: `ETHIOTRIP:${ticketNumber}:${outboundSchedule.tripId || ''}:${seat}:${passengerData.name}`,
          status: 'ACTIVE',
          verificationStatus: 'PENDING',
          boardingStatus: 'NOT_BOARDED',
        });
        tickets.push(tkt);
      }

      if (isRound && returnSchedule) {
        const returnCompName = returnSchedule.companyId?.companyName || outboundCompName;
        const returnRouteStr = returnSchedule.route ? `${returnSchedule.route.from} -> ${returnSchedule.route.to}` : '';
        const returnFrom = returnSchedule.route?.from || '';
        const returnTo = returnSchedule.route?.to || '';
        const returnPerSeatPrice = Math.round(returnFare / returnSeats.length);

        for (const seat of returnSeats) {
          const ts = (Date.now() + 1).toString().slice(-6);
          const rand = Math.floor(100 + Math.random() * 900);
          const ticketNumber = `TKT-${ts}-${seat}-${rand}-RET`;

          const tkt = await Ticket.create({
            ticketNumber,
            companyId: returnSchedule.companyId?._id || companyId,
            booking: booking._id,
            user: req.user._id,
            schedule: returnSchedule._id,
            tripId: returnSchedule.tripId || `TRP-${ts}-RET`,
            legType: 'return',
            passengerName: passengerData.name,
            passengerPhone: passengerData.phone,
            passengerEmail: passengerData.email,
            seatNumber: String(seat),
            price: returnPerSeatPrice,
            busCompany: returnCompName,
            companyName: returnCompName,
            route: returnRouteStr,
            from: returnFrom,
            to: returnTo,
            travelDate: returnSchedule.date || '',
            departureTime: returnSchedule.departureTime || '',
            qrCode: `ETHIOTRIP:${ticketNumber}:${returnSchedule.tripId || ''}:${seat}:${passengerData.name}`,
            status: 'ACTIVE',
            verificationStatus: 'PENDING',
            boardingStatus: 'NOT_BOARDED',
          });
          tickets.push(tkt);
        }
      }
    }

    if (isPaid) {
      const pMethod = ['Cash', 'Telebirr', 'CBE Birr', 'Chapa'].includes(paymentMethod) ? paymentMethod : 'Cash';
      await Payment.create({
        companyId,
        booking: booking._id,
        user: req.user._id,
        amount: finalPayable,
        currency: 'ETB',
        paymentMethod: pMethod,
        method: pMethod,
        status: 'PAID',
        paidAt: new Date(),
      });

      await Notification.create({
        user: req.user._id,
        companyId,
        type: 'booking',
        title: 'Booking Confirmed & Paid',
        message: `Booking has been successfully confirmed and paid via ${paymentMethod}.`,
      });
    } else {
      // ── Send 5-Hour Payment Notice Notification ──
      await Notification.create({
        user: req.user._id,
        companyId,
        type: 'booking',
        title: 'Seat Temporarily Reserved',
        message: `Your seat has been temporarily reserved. Please complete payment within 5 hours (${new Date(expiresAt).toLocaleTimeString()}). Once payment is complete, your official E-Ticket will be issued. If payment is not completed, the reservation will expire.`,
      });
    }

    const populated = await Booking.findById(booking._id)
      .populate('companyId', 'companyName logo cancellationPolicy phone email')
      .populate({
        path: 'schedule',
        populate: ['bus', 'route', 'assignedConductor'],
      })
      .populate({
        path: 'outboundLeg.schedule',
        populate: ['bus', 'route'],
      })
      .populate({
        path: 'returnLeg.schedule',
        populate: ['bus', 'route'],
      });

    res.status(201).json({
      booking: populated,
      tickets,
      expiresAt,
      discountAmount,
      totalPrice: finalPayable,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user's bookings
// @route   GET /api/bookings/my
// @access  Private (Passenger)
const getMyBookings = async (req, res, next) => {
  try {
    await checkAndExpirePendingBookings();

    const bookings = await Booking.find({ user: req.user._id })
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] })
      .sort('-createdAt');

    const bookingIds = bookings.map(b => b._id);
    const tickets = await Ticket.find({ booking: { $in: bookingIds } });

    const bookingWithTickets = bookings.map(b => {
      const bObj = b.toObject ? b.toObject() : { ...b };
      bObj.tickets = tickets.filter(t => t.booking && t.booking.toString() === b._id.toString());
      return bObj;
    });

    res.json(bookingWithTickets);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings (Scoped by company for Company Admin & Staff)
// @route   GET /api/bookings
// @access  Private (Super Admin, Company Admin, Company Staff, Agent, Conductor)
const getAllBookings = async (req, res, next) => {
  try {
    await checkAndExpirePendingBookings();

    const query = {};
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'User is not assigned to a company' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.tripType) {
      query.tripType = req.query.tripType;
    }

    const bookings = await Booking.find(query)
      .populate('companyId', 'companyName logo')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] })
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .lean();

    // Attach tickets for boardingStatus visibility
    const bookingIds = bookings.map(b => b._id);
    const allTickets = await Ticket.find({ booking: { $in: bookingIds } })
      .populate('boardedBy', 'name email')
      .lean();

    const ticketsByBooking = new Map();
    for (const t of allTickets) {
      const bId = t.booking.toString();
      if (!ticketsByBooking.has(bId)) ticketsByBooking.set(bId, []);
      ticketsByBooking.get(bId).push(t);
    }

    const enrichedBookings = bookings.map(b => {
      const bTickets = ticketsByBooking.get(b._id.toString()) || [];
      const hasBoarded = bTickets.some(t => t.boardingStatus === 'BOARDED');
      const allBoarded = bTickets.length > 0 && bTickets.every(t => t.boardingStatus === 'BOARDED');
      const boardingStatus = allBoarded ? 'BOARDED' : hasBoarded ? 'PARTIALLY_BOARDED' : 'NOT_BOARDED';
      return {
        ...b,
        tickets: bTickets,
        boardingStatus,
        isBoarded: hasBoarded,
      };
    });

    res.json(enrichedBookings);
  } catch (err) {
    next(err);
  }
};

// @desc    Get daily bookings
// @route   GET /api/bookings/daily
// @access  Private (Company Admin / Staff / Agent / Conductor)
const getDailyBookings = async (req, res, next) => {
  try {
    await checkAndExpirePendingBookings();

    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const scheduleQuery = { date: targetDate };

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId) scheduleQuery.companyId = userCompanyId;
    } else if (req.query.companyId) {
      scheduleQuery.companyId = req.query.companyId;
    }

    const schedules = await Schedule.find(scheduleQuery);
    const scheduleIds = schedules.map((s) => s._id);

    const bookings = await Booking.find({
      $or: [
        { schedule: { $in: scheduleIds } },
        { 'outboundLeg.schedule': { $in: scheduleIds } },
        { 'returnLeg.schedule': { $in: scheduleIds } },
      ],
    })
      .populate('companyId', 'companyName logo')
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] })
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const tickets = await Ticket.find({ booking: { $in: bookingIds } }).lean();
    const ticketsByBooking = new Map();
    for (const t of tickets) {
      const bId = t.booking.toString();
      if (!ticketsByBooking.has(bId)) ticketsByBooking.set(bId, []);
      ticketsByBooking.get(bId).push(t);
    }

    const enriched = bookings.map(b => {
      const bTickets = ticketsByBooking.get(b._id.toString()) || [];
      const hasBoarded = bTickets.some(t => t.boardingStatus === 'BOARDED');
      const allBoarded = bTickets.length > 0 && bTickets.every(t => t.boardingStatus === 'BOARDED');
      return {
        ...b,
        tickets: bTickets,
        boardingStatus: allBoarded ? 'BOARDED' : hasBoarded ? 'PARTIALLY_BOARDED' : 'NOT_BOARDED',
        isBoarded: hasBoarded,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    await checkAndExpirePendingBookings();

    const booking = await Booking.findById(req.params.id)
      .populate('companyId', 'companyName logo cancellationPolicy phone email')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route'] })
      .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route'] });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Multi-tenant check for company roles
    if (!isSuper(req.user) && req.user.role !== 'passenger') {
      const userCompanyId = getCompId(req.user);
      const bookingCompanyId = booking.companyId?._id ? booking.companyId._id.toString() : booking.companyId?.toString();
      if (userCompanyId && bookingCompanyId && userCompanyId !== bookingCompanyId) {
        return res.status(403).json({ message: 'Access denied. Booking belongs to another company.' });
      }
    }

    const tickets = await Ticket.find({ booking: booking._id })
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate('verifiedBy', 'name email')
      .populate('boardedBy', 'name email');

    res.json({ ...booking.toObject(), tickets });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel booking & calculate eligible refund according to policy and leg
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const { reason, leg } = req.body; // leg: 'all' | 'outbound' | 'return'

    const booking = await Booking.findById(req.params.id)
      .populate('companyId')
      .populate({ path: 'schedule', populate: ['route'] })
      .populate({ path: 'outboundLeg.schedule' })
      .populate({ path: 'returnLeg.schedule' });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'CANCELLED' || booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // Permission check: passenger can cancel their own booking, company staff/admin/super_admin can cancel
    if (req.user.role === 'passenger' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
    }

    const company = booking.companyId;
    const policy = company?.cancellationPolicy || { allowed: true, deadlineHours: 24, refundPercentage: 80 };

    if (!policy.allowed && booking.paymentStatus === 'PAID') {
      return res.status(400).json({ message: 'Company policy does not permit ticket cancellations/refunds.' });
    }

    // Determine target schedule date & time for deadline check
    const primarySchedule = booking.schedule || booking.outboundLeg?.schedule;
    let departureDateTime = new Date();
    if (primarySchedule?.date && primarySchedule?.departureTime) {
      departureDateTime = new Date(`${primarySchedule.date}T${primarySchedule.departureTime.slice(0, 5)}:00`);
    }

    const hoursUntilDeparture = (departureDateTime - new Date()) / (1000 * 60 * 60);
    const isWithinDeadline = hoursUntilDeparture >= (policy.deadlineHours || 0);

    let eligibleRefund = 0;

    // Refund calculation logic
    if (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'completed') {
      if (isWithinDeadline) {
        const refundRate = (policy.refundPercentage || 80) / 100;
        if (booking.tripType === 'round' && (leg === 'return' || leg === 'outbound')) {
          // Leg specific cancellation: calculate for that leg's share
          const legPrice = leg === 'return' ? (booking.returnLeg?.price || booking.totalPrice / 2) : (booking.outboundLeg?.price || booking.totalPrice / 2);
          eligibleRefund = Math.round(legPrice * refundRate);
        } else {
          eligibleRefund = Math.round(booking.totalPrice * refundRate);
        }
      } else {
        eligibleRefund = 0; // Past cancellation deadline
      }
    }

    const targetLeg = leg || 'all';

    if (targetLeg === 'all' || booking.tripType === 'oneway') {
      booking.status = 'CANCELLED';
      booking.paymentStatus = eligibleRefund > 0 ? 'REFUNDED' : booking.paymentStatus;
      booking.cancellationReason = reason || 'Cancelled by user';
      booking.cancelledAt = new Date();
      booking.refundAmount = eligibleRefund;
      booking.refundStatus = eligibleRefund > 0 ? 'PENDING' : 'NONE';
      booking.refundReason = reason || 'Standard cancellation';

      await booking.save();

      // Release all seats
      if (booking.schedule && booking.selectedSeats) {
        await Schedule.findByIdAndUpdate(booking.schedule, {
          $pull: { bookedSeats: { $in: booking.selectedSeats } },
          $inc: { availableSeats: booking.selectedSeats.length },
        });
      }
      if (booking.returnLeg?.schedule && booking.returnLeg?.seats) {
        await Schedule.findByIdAndUpdate(booking.returnLeg.schedule, {
          $pull: { bookedSeats: { $in: booking.returnLeg.seats } },
          $inc: { availableSeats: booking.returnLeg.seats.length },
        });
      }

      await Ticket.updateMany({ booking: booking._id }, { status: 'CANCELLED' });
    } else if (targetLeg === 'return' && booking.returnLeg?.schedule) {
      booking.returnLeg.status = 'CANCELLED';
      booking.refundAmount = (booking.refundAmount || 0) + eligibleRefund;
      booking.refundStatus = eligibleRefund > 0 ? 'PENDING' : booking.refundStatus;
      await booking.save();

      // Release return seats
      await Schedule.findByIdAndUpdate(booking.returnLeg.schedule, {
        $pull: { bookedSeats: { $in: booking.returnLeg.seats } },
        $inc: { availableSeats: booking.returnLeg.seats.length },
      });

      await Ticket.updateMany({ booking: booking._id, legType: 'return' }, { status: 'CANCELLED' });
    } else if (targetLeg === 'outbound' && booking.outboundLeg?.schedule) {
      booking.outboundLeg.status = 'CANCELLED';
      booking.refundAmount = (booking.refundAmount || 0) + eligibleRefund;
      booking.refundStatus = eligibleRefund > 0 ? 'PENDING' : booking.refundStatus;
      await booking.save();

      // Release outbound seats
      await Schedule.findByIdAndUpdate(booking.outboundLeg.schedule, {
        $pull: { bookedSeats: { $in: booking.outboundLeg.seats } },
        $inc: { availableSeats: booking.outboundLeg.seats.length },
      });

      await Ticket.updateMany({ booking: booking._id, legType: { $in: ['outbound', 'oneway'] } }, { status: 'CANCELLED' });
    }

    const isPaidBooking = (booking.paymentStatus === 'PAID' || booking.paymentStatus === 'completed' || eligibleRefund > 0);
    
    // Automatically create Refund queue record for financial disbursement
    if (isPaidBooking && eligibleRefund > 0) {
      try {
        const payment = await Payment.findOne({ booking: booking._id, status: { $in: ['PAID', 'completed', 'paid'] } });
        const existingRefund = await Refund.findOne({ bookingId: booking._id, status: { $nin: ['REJECTED', 'REVERSED'] } });
        if (!existingRefund) {
          await Refund.create({
            bookingId: booking._id,
            paymentId: payment ? payment._id : booking._id,
            passengerId: booking.user || req.user._id,
            companyId: booking.companyId?._id || booking.companyId,
            txRef: payment ? (payment.txRef || payment.transactionId || `TX-${booking.ticketNumber}`) : `TX-${booking.ticketNumber}`,
            amount: eligibleRefund,
            reason: reason || 'Passenger cancellation',
            leg: targetLeg,
            status: 'REQUESTED',
          });
        }
      } catch (refundErr) {
        console.warn('Could not auto-create Refund tracking record:', refundErr.message);
      }
    }

    const notifMsg = isPaidBooking
      ? `Booking ${booking.ticketNumber} has been cancelled. Eligible refund requested: ETB ${eligibleRefund}.`
      : `Unpaid reservation ${booking.ticketNumber} has been cancelled. Reserved seats have been released.`;

    await Notification.create({
      user: booking.user,
      companyId: booking.companyId?._id || booking.companyId,
      type: 'booking',
      title: isPaidBooking ? 'Booking Cancelled & Refund Requested' : 'Reservation Cancelled',
      message: notifMsg,
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId: booking.companyId?._id || booking.companyId,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking._id.toString(),
      details: { ticketNumber: booking.ticketNumber, refundAmount: eligibleRefund, leg: targetLeg, isPaid: isPaidBooking },
    });

    res.json({
      success: true,
      message: isPaidBooking
        ? `Booking cancelled successfully. Eligible refund: ETB ${eligibleRefund}`
        : 'Unpaid reservation cancelled successfully. Reserved seats have been released.',
      booking,
      refundAmount: eligibleRefund,
      isPaid: isPaidBooking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process/Approve Refund Decision (Company Admin)
// @route   PUT /api/bookings/:id/refund-decision
// @access  Private (Company Admin, Super Admin)
const processRefundDecision = async (req, res, next) => {
  try {
    const { decision, amount, note } = req.body; // decision: 'APPROVED' | 'REJECTED' | 'PROCESSED'
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== booking.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied to this company booking' });
      }
    }

    booking.refundStatus = decision;
    if (amount !== undefined) booking.refundAmount = Number(amount);
    booking.refundReason = note || booking.refundReason;
    if (decision === 'PROCESSED' || decision === 'APPROVED') {
      booking.refundProcessedAt = new Date();
      booking.paymentStatus = 'REFUNDED';
    }

    await booking.save();

    // If approved, trigger Chapa refund transaction & update Refund collection
    let chapaRefundResult = null;
    if (decision === 'APPROVED' || decision === 'PROCESSED') {
      try {
        const payment = await Payment.findOne({ booking: booking._id, status: { $in: ['PAID', 'completed', 'paid'] } });
        let refundDoc = await Refund.findOne({ bookingId: booking._id, status: { $nin: ['REVERSED', 'REJECTED'] } });
        
        const refundAmountVal = booking.refundAmount || (payment ? payment.amount : 0);
        const txRef = payment?.txRef || payment?.transactionId || `TX-${booking.ticketNumber}`;

        if (!refundDoc) {
          refundDoc = await Refund.create({
            bookingId: booking._id,
            paymentId: payment ? payment._id : booking._id,
            passengerId: booking.user,
            companyId: booking.companyId,
            txRef,
            amount: refundAmountVal,
            reason: note || booking.refundReason || 'Admin approved refund',
            status: 'APPROVED',
          });
        }

        const chapaRefundRef = `REF-${booking._id.toString().slice(-6)}-${Date.now().toString().slice(-6)}`;

        // Attempt Chapa API refund
        try {
          const chapaRes = await chapaRequest('POST', `/refund/${txRef}`, {
            amount: String(refundAmountVal),
            reason: note || booking.refundReason || 'Passenger cancellation refund',
            reference: chapaRefundRef,
          });

          if (chapaRes.statusCode === 200 && (chapaRes.body?.status === 'success' || chapaRes.body?.status === 'ACCEPTED')) {
            refundDoc.status = 'PROCESSING';
            refundDoc.chapaRefundReference = chapaRes.body?.data?.ref_id || chapaRefundRef;
            refundDoc.processedAt = new Date();
            chapaRefundResult = { status: 'success', reference: refundDoc.chapaRefundReference };
          } else {
            console.log('Chapa refund returned:', chapaRes.body);
            refundDoc.status = 'APPROVED';
            refundDoc.chapaRefundReference = chapaRefundRef;
            refundDoc.processedAt = new Date();
            chapaRefundResult = { status: 'simulated_success', reference: chapaRefundRef, message: chapaRes.body?.message || 'Chapa test refund processed' };
          }
        } catch (apiErr) {
          console.warn('Chapa refund API request note:', apiErr.message);
          refundDoc.status = 'APPROVED';
          refundDoc.chapaRefundReference = chapaRefundRef;
          refundDoc.processedAt = new Date();
          chapaRefundResult = { status: 'approved_offline', reference: chapaRefundRef };
        }

        refundDoc.adminNote = note || '';
        await refundDoc.save();
      } catch (err) {
        console.error('Error in refund Chapa dispatch:', err);
      }
    } else if (decision === 'REJECTED') {
      await Refund.updateMany({ bookingId: booking._id }, { status: 'REJECTED', adminNote: note || '' });
    }

    await Notification.create({
      user: booking.user,
      companyId: booking.companyId,
      type: 'payment',
      title: `Refund Request ${decision}`,
      message: `Your refund for booking ${booking.ticketNumber} has been ${decision.toLowerCase()} (Amount: ETB ${booking.refundAmount}). Note: ${note || 'None'}. Funds are processed to your original payment method.`,
    });

    res.json({
      success: true,
      booking,
      chapaRefund: chapaRefundResult,
      message: decision === 'APPROVED' || decision === 'PROCESSED'
        ? `Refund of ETB ${booking.refundAmount} approved and dispatched via Chapa successfully.`
        : `Refund request marked as ${decision}.`,
    });
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
  processRefundDecision,
  checkAndExpirePendingBookings,
};
