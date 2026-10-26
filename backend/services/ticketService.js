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


const parseQrPayload = (rawPayload) => {
  const raw = String(rawPayload || '').trim();
  const result = { ticketNumber: raw, bookingRef: '', leg: '', seat: '' };

  if (!raw) return result;

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      result.ticketNumber =
        parsed.ticketNumber || parsed.tkt || parsed.ticket || parsed.ticketNo || raw;
      result.bookingRef =
        parsed.bookingReference || parsed.bookingRef || parsed.booking || parsed.ref || '';
      result.leg = String(parsed.legType || parsed.leg || '').toLowerCase();
      result.seat = parsed.seatNumber ? String(parsed.seatNumber) : (parsed.seat ? String(parsed.seat) : '');
      return result;
    } catch {
      /* fall through to text parsing */
    }
  }

  if (raw.startsWith('ETHIOTRIP:')) {
    const parts = raw.split(':');
    result.ticketNumber = (parts[1] || '').trim();
    if (parts.length === 3 && parts[2]) {
      result.seat = String(parts[2]).trim();
    } else if (parts[3]) {
      result.seat = String(parts[3]).trim();
    }
    return result;
  }

  const ticketMatch = raw.match(/TICKET:\s*([^\s\n\r|;]+)/i);
  if (ticketMatch && ticketMatch[1]) result.ticketNumber = ticketMatch[1].trim();

  const legMatch = raw.match(/LEG:\s*([A-Za-z]+)/i);
  if (legMatch && legMatch[1]) {
    const leg = legMatch[1].trim().toLowerCase();
    result.leg = leg.startsWith('ret') ? 'return' : leg.startsWith('out') ? 'outbound' : leg;
  }

  const seatMatch = raw.match(/SEAT:\s*([^\n\r|;]+)/i);
  if (seatMatch && seatMatch[1]) result.seat = seatMatch[1].trim().split(/[\s,]+/)[0];

  const urlMatch = raw.match(/ticket=([^&\s]+)/i);
  if (!ticketMatch && urlMatch && urlMatch[1]) {
    result.ticketNumber = decodeURIComponent(urlMatch[1]).trim();
  }

  return result;
};

const populateTicketRelations = (ticketId) =>
  Ticket.findById(ticketId)
    .populate('companyId', 'companyName logo')
    .populate('user', 'name email phone')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
    .populate('booking')
    .populate('boardedBy', 'name email')
    .populate('verifiedBy', 'name email role');

const resolveTicketFromBooking = async (bookingRef, { leg, seat, scheduleId, userComp }) => {
  if (!bookingRef) return null;

  const mongoose = require('mongoose');
  const ref = String(bookingRef).trim();
  const isId = mongoose.Types.ObjectId.isValid(ref);

  const booking = await Booking.findOne({
    $or: [
      { ticketNumber: ref },
      ...(isId ? [{ _id: ref }] : []),
    ],
  });

  if (!booking) return null;

  if (userComp) {
    const bComp = booking.companyId?._id?.toString() || booking.companyId?.toString() || null;
    if (!bComp || bComp !== userComp) return null;
  }

  let tickets = await Ticket.find({ booking: booking._id });

  if (tickets.length === 0) {
    if (booking.status !== BOOKING_STATUS.CONFIRMED && booking.paymentStatus !== PAYMENT_STATUS.PAID) {
      return null;
    }
    tickets = await generateTicketsForBooking(booking, 'PENDING');
  }

  if (!tickets || tickets.length === 0) return null;

  const normalizedLeg = leg === 'return' || leg === 'ret' ? 'return' : leg === 'outbound' || leg === 'out' ? 'outbound' : '';
  const normalizedSeat = seat ? String(seat).trim().split(/[\s,]+/)[0] : '';

  const candidates = tickets.filter((t) => {
    if (normalizedSeat && String(t.seatNumber) !== normalizedSeat) return false;
    if (normalizedLeg && t.legType !== 'oneway' && t.legType !== normalizedLeg) return false;
    return true;
  });

  let pool = candidates.length > 0 ? candidates : tickets;

  if (scheduleId) {
    const tripMatch = pool.filter((t) => String(t.schedule?._id || t.schedule) === String(scheduleId));
    if (tripMatch.length > 0) pool = tripMatch;
  }

  if (normalizedLeg) {
    const legMatch = pool.filter((t) => t.legType === normalizedLeg || t.legType === 'oneway');
    if (legMatch.length > 0) pool = legMatch;
  }

  const chosen = pool[0];
  return populateTicketRelations(chosen._id);
};

const validateTicketForBoarding = async (ticketIdentifier, currentUser, scheduleId) => {
  const parsed = parseQrPayload(ticketIdentifier);
  const ticketNumber = String(parsed.ticketNumber || '').trim();
  const bookingRef = String(parsed.bookingRef || '').trim();

  if (!ticketNumber && !bookingRef) {
    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'Ticket not found.',
    };
  }

  let userComp =
    currentUser?.role === 'super_admin'
      ? null
      : currentUser?.companyId?._id?.toString() || currentUser?.companyId?.toString() || null;

  if (!userComp && scheduleId) {
    const sch = await Schedule.findById(scheduleId);
    if (sch?.companyId) {
      userComp = sch.companyId.toString();
    }
  }

  if (currentUser?.role !== 'super_admin' && !userComp) {
    return {
      valid: false,
      status: 'WRONG_COMPANY',
      message: 'Your account is not assigned to a transport company, so it cannot validate tickets.',
    };
  }

  const mongoose = require('mongoose');
  const isObjectId = mongoose.Types.ObjectId.isValid(ticketNumber);

  const ticketQuery = isObjectId
    ? { $or: [{ ticketNumber }, { _id: ticketNumber }] }
    : { ticketNumber };
  if (userComp) ticketQuery.companyId = userComp;

  let ticket = await Ticket.findOne(ticketQuery)
    .populate('companyId', 'companyName logo')
    .populate('user', 'name email phone')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
    .populate('booking')
    .populate('boardedBy', 'name email')
    .populate('verifiedBy', 'name email role');

  if (!ticket && isObjectId) {
    // Also try without companyId filter initially to see if it exists
    const anyCompTicket = await Ticket.findById(ticketNumber)
      .populate('companyId', 'companyName logo')
      .populate('user', 'name email phone')
      .populate({ path: 'schedule', populate: ['bus', 'route', 'assignedConductor'] })
      .populate('booking')
      .populate('boardedBy', 'name email')
      .populate('verifiedBy', 'name email role');
    if (anyCompTicket) {
      ticket = anyCompTicket;
    }
  }

  if (!ticket && ticketNumber !== bookingRef) {
    ticket = await resolveTicketFromBooking(bookingRef || ticketNumber, {
      leg: parsed.leg,
      seat: parsed.seat,
      scheduleId,
      userComp,
    });
  }

  if (!ticket && !ticketNumber.startsWith('TKT-')) {
    ticket = await resolveTicketFromBooking(ticketNumber, {
      leg: parsed.leg,
      seat: parsed.seat,
      scheduleId,
      userComp,
    });
  }

  if (!ticket) {
    return {
      valid: false,
      status: 'NOT_FOUND',
      message: 'Ticket not found.',
    };
  }

  if (currentUser?.role !== 'super_admin') {
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
      message: `Trip mismatch: Passenger ticket is for "${ticket.route || (ticket.schedule?.route ? `${ticket.schedule.route.from} → ${ticket.schedule.route.to}` : '')}" on ${ticket.travelDate || ticket.schedule?.date || ''} (${ticket.departureTime || ticket.schedule?.departureTime || ''}), not this selected trip.`,
      ticket,
    };
  }

  if (ticket.verificationStatus === 'REJECTED' || ticket.verificationStatus === 'INVALID') {
    return {
      valid: false,
      status: 'TICKET_REJECTED',
      message: ticket.rejectionReason
        ? `This ticket was rejected by station staff: ${ticket.rejectionReason}`
        : 'This ticket was rejected by station staff and cannot be used for boarding.',
      ticket,
    };
  }

  if (ticket.verificationStatus !== 'VERIFIED') {
    return {
      valid: false,
      status: 'NOT_VERIFIED_BY_AGENT',
      message:
        'This ticket is paid but has not yet been verified by a counter agent. The passenger must be verified at the station counter before boarding.',
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

  if (ticket.verificationStatus !== 'VERIFIED') {
    const err = new Error(
      'Boarding refused: this ticket has not been verified by a counter agent. Please send the passenger to the ticket counter.'
    );
    err.statusCode = 403;
    err.code = 'NOT_VERIFIED_BY_AGENT';
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
      await generateTicketsForBooking(b, 'PENDING');
    } catch (err) {
      console.error('Error generating tickets for trip manifest:', err.message);
    }
  }

  return Ticket.find({ schedule: scheduleId, status: { $ne: TICKET_STATUS.CANCELLED } })
    .populate('user', 'name email phone')
    .populate('boardedBy', 'name email')
    .populate('verifiedBy', 'name email role')
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

  let tickets = await Ticket.find({ booking: bookingId })
    .populate('companyId', 'companyName logo')
    .populate({ path: 'schedule', populate: ['bus', 'route'] });

  if (
    tickets.length === 0 &&
    (booking.status === BOOKING_STATUS.CONFIRMED || booking.paymentStatus === PAYMENT_STATUS.PAID)
  ) {
    try {
      await generateTicketsForBooking(booking, 'PENDING');
      tickets = await Ticket.find({ booking: bookingId })
        .populate('companyId', 'companyName logo')
        .populate({ path: 'schedule', populate: ['bus', 'route'] });
    } catch (err) {
      console.error('Error generating tickets for booking view:', err.message);
    }
  }

  return { booking, tickets };
};

module.exports = {
  generateTicketsForBooking,
  activateTicketsForBooking,
  parseQrPayload,
  validateTicketForBoarding,
  confirmPassengerBoarding,
  getTripManifest,
  getUserTickets,
  getTicketsByBooking,
};
