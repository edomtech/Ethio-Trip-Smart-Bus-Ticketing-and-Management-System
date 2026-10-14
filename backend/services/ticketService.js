const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { BOOKING_STATUS, PAYMENT_STATUS, TICKET_STATUS, BOARDING_STATUS } = require('../constants/statuses');


const generateTicketsForBooking = async (bookingOrId, defaultVerificationStatus = 'PENDING') => {
  const booking = typeof bookingOrId === 'object' && bookingOrId._id
    ? bookingOrId
    : await Booking.findById(bookingOrId)
        .populate('companyId')
        .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] })
        .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route', 'companyId'] })
        .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route', 'companyId'] });

  if (!booking) return [];

  const existingTickets = await Ticket.find({ booking: booking._id });
  const isRound = booking.tripType === 'round' || !!booking.returnLeg?.schedule;

  const outboundSch = booking.outboundLeg?.schedule || booking.schedule;
  const outboundComp = booking.companyId?.companyName || outboundSch?.companyId?.companyName || 'Ethio Trip';
  const outboundRouteStr = outboundSch?.route ? `${outboundSch.route.from} → ${outboundSch.route.to}` : '';

  const passengerName = booking.passenger?.name || 'Passenger';
  const passengerPhone = booking.passenger?.phone || '';
  const passengerEmail = booking.passenger?.email || '';

  const tickets = [];

  const outboundSeats = booking.outboundLeg?.seats?.length
    ? booking.outboundLeg.seats
    : (booking.selectedSeats?.length ? booking.selectedSeats : ['1']);
  const outboundPrice = booking.outboundLeg?.price
    ? Math.round(booking.outboundLeg.price / outboundSeats.length)
    : Math.round(booking.totalPrice / (isRound ? 2 : 1) / outboundSeats.length);

  const initialTicketStatus = booking.paymentStatus === PAYMENT_STATUS.PAID
    ? TICKET_STATUS.ACTIVE
    : TICKET_STATUS.PENDING;

  for (const seat of outboundSeats) {
    let tkt = existingTickets.find((t) => t.seatNumber === String(seat) && t.legType !== 'return');
    if (!tkt) {
      const crypto = require('crypto');
      const ts = Date.now().toString(36).toUpperCase();
      const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
      const ticketNumber = `TKT-${ts}-${seat}-${rand}`;
      const tripId = outboundSch?.tripId || `TRP-${ts}`;
      const qrCode = `ETHIOTRIP:${ticketNumber}:${tripId}:${seat}:${passengerName}`;

      tkt = await Ticket.create({
        ticketNumber,
        companyId: booking.companyId?._id || booking.companyId,
        booking: booking._id,
        user: booking.user,
        schedule: outboundSch?._id,
        tripId,
        legType: isRound ? 'outbound' : 'oneway',
        passengerName,
        passengerPhone,
        passengerEmail,
        seatNumber: String(seat),
        price: outboundPrice,
        busCompany: outboundComp,
        companyName: outboundComp,
        route: outboundRouteStr,
        from: outboundSch?.route?.from || '',
        to: outboundSch?.route?.to || '',
        travelDate: outboundSch?.date || booking.outboundLeg?.date || '',
        departureTime: outboundSch?.departureTime || booking.outboundLeg?.departureTime || '',
        qrCode,
        status: initialTicketStatus,
        verificationStatus: defaultVerificationStatus,
        boardingStatus: BOARDING_STATUS.NOT_BOARDED,
      });
    }
    tickets.push(tkt);
  }

  if (isRound && booking.returnLeg?.schedule) {
    const returnSch = booking.returnLeg.schedule;
    const returnSeats = booking.returnLeg.seats?.length ? booking.returnLeg.seats : outboundSeats;
    const returnPrice = booking.returnLeg.price
      ? Math.round(booking.returnLeg.price / returnSeats.length)
      : Math.round(booking.totalPrice / 2 / returnSeats.length);
    const returnComp = returnSch?.companyId?.companyName || outboundComp;
    const returnRouteStr = returnSch?.route ? `${returnSch.route.from} → ${returnSch.route.to}` : '';

    for (const seat of returnSeats) {
      let tkt = existingTickets.find((t) => t.seatNumber === String(seat) && t.legType === 'return');
      if (!tkt) {
        const crypto = require('crypto');
        const ts = (Date.now() + 1).toString(36).toUpperCase();
        const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
        const ticketNumber = `TKT-${ts}-${seat}-${rand}-RET`;
        const tripId = returnSch?.tripId || `TRP-${ts}-RET`;
        const qrCode = `ETHIOTRIP:${ticketNumber}:${tripId}:${seat}:${passengerName}`;

        tkt = await Ticket.create({
          ticketNumber,
          companyId: returnSch?.companyId?._id || booking.companyId?._id || booking.companyId,
          booking: booking._id,
          user: booking.user,
          schedule: returnSch?._id || outboundSch?._id,
          tripId,
          legType: 'return',
          passengerName,
          passengerPhone,
          passengerEmail,
          seatNumber: String(seat),
          price: returnPrice,
          busCompany: returnComp,
          companyName: returnComp,
          route: returnRouteStr,
          from: returnSch?.route?.from || '',
          to: returnSch?.route?.to || '',
          travelDate: returnSch?.date || booking.returnLeg?.date || '',
          departureTime: returnSch?.departureTime || booking.returnLeg?.departureTime || '',
          qrCode,
          status: initialTicketStatus,
          verificationStatus: defaultVerificationStatus,
          boardingStatus: BOARDING_STATUS.NOT_BOARDED,
        });
      }
      tickets.push(tkt);
    }
  }

  return tickets;
};


const activateTicketsForBooking = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate('companyId')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route', 'companyId'] });

  if (!booking) return null;

  booking.status = BOOKING_STATUS.CONFIRMED;
  booking.paymentStatus = PAYMENT_STATUS.PAID;
  booking.expiresAt = null;  
  await booking.save();

  const tickets = await generateTicketsForBooking(booking, 'PENDING');
  for (const tkt of tickets) {
    tkt.status = TICKET_STATUS.ACTIVE;
    await tkt.save();
  }

  await Notification.create({
    user: booking.user,
    companyId: booking.companyId?._id || booking.companyId,
    type: 'payment',
    title: 'Payment Confirmed — E-Ticket Ready',
    message: `Payment confirmed for booking ${booking.ticketNumber}. Your digital e-tickets are now active and ready for boarding.`,
  }).catch(() => {});

  return Ticket.find({ booking: booking._id })
    .populate('companyId', 'companyName logo')
    .populate({ path: 'schedule', populate: ['bus', 'route'] });
};


const validateTicketForBoarding = async (ticketIdentifier, currentUser, scheduleId) => {
  let ticketNumber = ticketIdentifier;

  if (ticketIdentifier.startsWith('ETHIOTRIP:') || ticketIdentifier.startsWith('ETHIOBUS:')) {
    const parts = ticketIdentifier.split(':');
    ticketNumber = parts[1] || ticketIdentifier;
  } else if (ticketIdentifier.includes('TICKET:')) {
    const match = ticketIdentifier.match(/TICKET:\s*([^\s\n\r]+)/i);
    if (match) ticketNumber = match[1];
  } else {
    try {
      const parsed = JSON.parse(ticketIdentifier);
      ticketNumber = parsed.tkt || ticketIdentifier;
    } catch {
      ticketNumber = ticketIdentifier;
    }
  }

  const ticketQuery = { ticketNumber: ticketNumber.trim() };
  if (currentUser?.role !== 'super_admin') {
    const userComp = currentUser?.companyId?._id?.toString() || currentUser?.companyId?.toString() || null;
    if (!userComp) {
      return {
        valid: false,
        status: 'WRONG_COMPANY',
        message: 'Your account is not assigned to a transport company, so it cannot validate tickets.',
      };
    }
    ticketQuery.companyId = userComp;
  }

  const ticket = await Ticket.findOne(ticketQuery)
    .populate('companyId', 'companyName logo')
    .populate('user', 'name email phone')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
    .populate('booking')
    .populate('boardedBy', 'name email');

  if (!ticket) {
    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'Ticket not found.',
    };
  }

  if (currentUser?.role !== 'super_admin') {
    const userComp = currentUser?.companyId?._id?.toString() || currentUser?.companyId?.toString() || null;
    const tktComp = ticket.companyId?._id?.toString() || ticket.companyId?.toString() || null;
    if (!userComp || !tktComp || userComp !== tktComp) {
      return {
        valid: false,
        status: 'WRONG_COMPANY',
        message: 'This ticket was not issued by your company.',
      };
    }
  }

  if (ticket.status !== TICKET_STATUS.ACTIVE) {
    return {
      valid: false,
      status: 'INACTIVE',
      message: `Ticket is not active (Current status: ${ticket.status}).`,
      ticket,
    };
  }

  if (ticket.booking && ticket.booking.status !== BOOKING_STATUS.CONFIRMED) {
    return {
      valid: false,
      status: 'BOOKING_UNCONFIRMED',
      message: `Associated booking is not confirmed (Status: ${ticket.booking.status}).`,
      ticket,
    };
  }

  if (ticket.boardingStatus === BOARDING_STATUS.BOARDED) {
    return {
      valid: false,
      status: 'ALREADY_BOARDED',
      message: `Duplicate boarding attempt: Passenger already boarded at ${new Date(ticket.boardedAt || ticket.usedAt).toLocaleTimeString()}.`,
      ticket,
    };
  }

  if (ticket.schedule) {
    const tripStatus = ticket.schedule.status;
    if (tripStatus && tripStatus !== 'scheduled') {
      return {
        valid: false,
        status: 'TRIP_NOT_ACTIVE',
        message: `This trip is ${tripStatus} and cannot be boarded.`,
        ticket,
      };
    }

    const travelDate = ticket.travelDate || ticket.schedule.date;
    if (travelDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tripDay = new Date(travelDate);
      tripDay.setHours(0, 0, 0, 0);
      if (tripDay < today) {
        return {
          valid: false,
          status: 'TRIP_EXPIRED',
          message: 'This ticket is for a trip date that has already passed.',
          ticket,
        };
      }
    }
  }

  if (scheduleId && ticket.schedule?._id?.toString() !== scheduleId.toString()) {
    return {
      valid: false,
      status: 'TRIP_MISMATCH',
      message: `Trip mismatch: Ticket is for trip on ${ticket.schedule?.date} (${ticket.schedule?.departureTime}), not this trip.`,
      ticket,
    };
  }

  return {
    valid: true,
    status: 'VALID_TICKET',
    message: 'VALID TICKET — READY FOR BOARDING',
    ticket,
  };
};


const confirmPassengerBoarding = async (ticketId, ticketNumber, conductorUser) => {
  const baseQuery = ticketId ? { _id: ticketId } : { ticketNumber };
  const query =
    conductorUser?.role === 'super_admin'
      ? baseQuery
      : { ...baseQuery, companyId: conductorUser?.companyId?._id || conductorUser?.companyId || null };

  const ticket = await Ticket.findOne(query)
    .populate('booking')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .populate('companyId');

  if (!ticket) {
    const err = new Error('Ticket not found for your company');
    err.statusCode = 404;
    throw err;
  }

  if (ticket.status !== TICKET_STATUS.ACTIVE) {
    const err = new Error(`Ticket cannot be boarded in status: ${ticket.status}`);
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const claimed = await Ticket.findOneAndUpdate(
    { _id: ticket._id, boardingStatus: { $ne: BOARDING_STATUS.BOARDED } },
    {
      $set: {
        boardingStatus: BOARDING_STATUS.BOARDED,
        boardedBy: conductorUser._id,
        boardedAt: now,
        status: TICKET_STATUS.USED,
        usedAt: now,
      },
    },
    { new: true }
  );

  if (!claimed) {
    const err = new Error('Passenger has already been boarded for this ticket');
    err.statusCode = 409;
    throw err;
  }

  await AuditLog.create({
    user: conductorUser._id,
    userEmail: conductorUser.email,
    userRole: conductorUser.role,
    companyId: ticket.companyId?._id || ticket.companyId,
    action: 'PASSENGER_BOARDED',
    entityType: 'Ticket',
    entityId: ticket.ticketNumber,
    details: {
      ticketNumber: ticket.ticketNumber,
      passengerName: ticket.passengerName,
      seatNumber: ticket.seatNumber,
      boardedAt: now,
    },
  }).catch(() => {});

  return claimed;
};

const getTripManifest = async (scheduleId, user) => {
  const schedule = await Schedule.findById(scheduleId).populate('companyId');
  if (!schedule) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }

  if (user && user.role !== 'super_admin') {
    const userComp = user.companyId?._id?.toString() || user.companyId?.toString() || null;
    const tripComp = schedule.companyId?._id?.toString() || schedule.companyId?.toString() || null;
    if (!userComp || !tripComp || userComp !== tripComp) {
      const err = new Error('Access denied: this trip belongs to another transport company');
      err.statusCode = 403;
      throw err;
    }
  }

  const relatedBookings = await Booking.find({
    $or: [
      { schedule: scheduleId },
      { 'outboundLeg.schedule': scheduleId },
      { 'returnLeg.schedule': scheduleId },
    ],
    status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED] },
  }).populate('companyId')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route', 'companyId'] });

  for (const b of relatedBookings) {
    try {
      const defaultStatus = b.paymentStatus === PAYMENT_STATUS.PAID ? 'VERIFIED' : 'PENDING';
      await generateTicketsForBooking(b, defaultStatus);
    } catch (err) {
      console.error('Error generating tickets for trip manifest:', err.message);
    }
  }

  return Ticket.find({ schedule: scheduleId, status: { $ne: TICKET_STATUS.CANCELLED } })
    .populate('user', 'name email phone')
    .populate('boardedBy', 'name email')
    .populate('booking')
    .sort({ seatNumber: 1 });
};

const getUserTickets = async (userId) => {
  return Ticket.find({ user: userId })
    .populate('companyId', 'companyName logo phone email')
    .populate({ path: 'schedule', populate: ['bus', 'route'] })
    .sort({ createdAt: -1 });
};

const getTicketsByBooking = async (bookingId, user) => {
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

  const { assertBookingAccess } = require('./bookingService');
  assertBookingAccess(booking, user);

  const tickets = await Ticket.find({ booking: bookingId })
    .populate('companyId', 'companyName logo')
    .populate({ path: 'schedule', populate: ['bus', 'route'] });

  return { booking, tickets };
};

module.exports = {
  generateTicketsForBooking,
  activateTicketsForBooking,
  validateTicketForBoarding,
  confirmPassengerBoarding,
  getTripManifest,
  getUserTickets,
  getTicketsByBooking,
};
