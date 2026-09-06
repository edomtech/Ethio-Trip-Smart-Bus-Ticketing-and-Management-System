const https = require('https');
const Payment = require('../models/Payment');
const Refund  = require('../models/Refund');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const Ticket  = require('../models/Ticket');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

/* ─── Internal Chapa helper ──────────────────────────────────────────────── */
const getCleanChapaKey = () => {
  const raw = String(process.env.CHAPA_SECRET_KEY || '').trim().replace(/['"]/g, '');
  // Remove any non-ASCII / Unicode characters (such as bullets • or control chars)
  return raw.replace(/[^\x20-\x7E]/g, '');
};

const chapaRequest = (method, path, body) =>
  new Promise((resolve, reject) => {
    const chapaKey = getCleanChapaKey();
    const base = process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1';
    const url  = new URL(base + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${chapaKey}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }); }
        catch { reject(new Error('Invalid JSON from Chapa')); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

/* ─── Generate & activate tickets after payment confirmed ─────────────────── */
const activateTickets = async (booking) => {
  const bookingId = booking._id || booking;
  const fullBooking = await Booking.findById(bookingId)
    .populate('companyId')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route', 'companyId'] });

  if (!fullBooking) return;

  // Ensure booking has ticketNumber, status is CONFIRMED, paymentStatus is PAID
  let bookingUpdated = false;
  if (!fullBooking.ticketNumber) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    fullBooking.ticketNumber = `ETH-${ts}-${rand}`;
    bookingUpdated = true;
  }
  if (fullBooking.status !== 'CONFIRMED' && fullBooking.status !== 'confirmed') {
    fullBooking.status = 'CONFIRMED';
    bookingUpdated = true;
  }
  if (fullBooking.paymentStatus !== 'PAID' && fullBooking.paymentStatus !== 'paid') {
    fullBooking.paymentStatus = 'PAID';
    bookingUpdated = true;
  }
  if (bookingUpdated) {
    await fullBooking.save();
  }

  // Mark all existing tickets for this booking as ACTIVE
  await Ticket.updateMany({ booking: fullBooking._id }, { status: 'ACTIVE' });

  // Check tickets currently in database
  const existingTickets = await Ticket.find({ booking: fullBooking._id });
  const hasOutbound = existingTickets.some(t => t.legType === 'outbound' || t.legType === 'oneway');
  const hasReturn = existingTickets.some(t => t.legType === 'return');
  const isRound = fullBooking.tripType === 'round' || !!fullBooking.returnLeg?.schedule;

  const passengerName = fullBooking.passenger?.name || 'Passenger';
  const passengerPhone = fullBooking.passenger?.phone || '';
  const passengerEmail = fullBooking.passenger?.email || '';

  // Outbound schedule and company
  const outboundSch = fullBooking.outboundLeg?.schedule || fullBooking.schedule;
  const outboundComp = fullBooking.companyId?.companyName || outboundSch?.companyId?.companyName || 'Ethio Trip';
  const outboundRouteStr = outboundSch?.route ? `${outboundSch.route.from} -> ${outboundSch.route.to}` : '';

  // 1. Ensure outbound ticket exists
  if (!hasOutbound) {
    const outboundSeats = fullBooking.outboundLeg?.seats?.length
      ? fullBooking.outboundLeg.seats
      : (fullBooking.selectedSeats?.length ? fullBooking.selectedSeats : ['1']);
    const outboundPrice = fullBooking.outboundLeg?.price
      ? Math.round(fullBooking.outboundLeg.price / outboundSeats.length)
      : Math.round(fullBooking.totalPrice / (isRound ? 2 : 1) / outboundSeats.length);

    for (const seat of outboundSeats) {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(100 + Math.random() * 900);
      const ticketNumber = `TKT-${ts}-${seat}-${rand}`;
      await Ticket.create({
        ticketNumber,
        companyId: fullBooking.companyId?._id || fullBooking.companyId,
        booking: fullBooking._id,
        user: fullBooking.user,
        schedule: outboundSch?._id,
        tripId: outboundSch?.tripId || `TRP-${ts}`,
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
        travelDate: outboundSch?.date || fullBooking.outboundLeg?.date || '',
        departureTime: outboundSch?.departureTime || fullBooking.outboundLeg?.departureTime || '',
        qrCode: `ETHIOTRIP:${ticketNumber}:${outboundSch?.tripId || ''}:${seat}:${passengerName}`,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        boardingStatus: 'NOT_BOARDED',
      });
    }
  }

  // 2. Ensure return ticket exists if round trip
  if (isRound && !hasReturn) {
    const returnSch = fullBooking.returnLeg?.schedule;
    const returnSeats = fullBooking.returnLeg?.seats?.length
      ? fullBooking.returnLeg.seats
      : (fullBooking.selectedSeats?.length ? fullBooking.selectedSeats : ['1']);
    const returnPrice = fullBooking.returnLeg?.price
      ? Math.round(fullBooking.returnLeg.price / returnSeats.length)
      : Math.round(fullBooking.totalPrice / 2 / returnSeats.length);
    const returnComp = returnSch?.companyId?.companyName || outboundComp;
    const returnRouteStr = returnSch?.route ? `${returnSch.route.from} -> ${returnSch.route.to}` : '';

    for (const seat of returnSeats) {
      const ts = (Date.now() + 1).toString().slice(-6);
      const rand = Math.floor(100 + Math.random() * 900);
      const ticketNumber = `TKT-${ts}-${seat}-${rand}-RET`;
      await Ticket.create({
        ticketNumber,
        companyId: returnSch?.companyId?._id || fullBooking.companyId?._id || fullBooking.companyId,
        booking: fullBooking._id,
        user: fullBooking.user,
        schedule: returnSch?._id || outboundSch?._id,
        tripId: returnSch?.tripId || `TRP-${ts}-RET`,
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
        travelDate: returnSch?.date || fullBooking.returnLeg?.date || '',
        departureTime: returnSch?.departureTime || fullBooking.returnLeg?.departureTime || '',
        qrCode: `ETHIOTRIP:${ticketNumber}:${returnSch?.tripId || ''}:${seat}:${passengerName}`,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        boardingStatus: 'NOT_BOARDED',
      });
    }
  }

  // Backfill missing fields on existing tickets
  await Ticket.updateMany(
    {
      booking: fullBooking._id,
      $or: [
        { busCompany: { $in: ['', null] } },
        { passengerName: { $in: ['', null] } },
        { route: { $in: ['', null] } },
      ],
    },
    {
      $set: {
        passengerName,
        passengerPhone,
        passengerEmail,
        busCompany: outboundComp,
        companyName: outboundComp,
        route: outboundRouteStr,
      },
    }
  );

  await Notification.create({
    user: fullBooking.user,
    companyId: fullBooking.companyId?._id || fullBooking.companyId,
    type: 'payment',
    title: 'Payment Successful – Tickets Active',
    message: isRound
      ? `Payment confirmed for round-trip booking ${fullBooking.ticketNumber}. Both outbound and return e-tickets are now active.`
      : `Payment confirmed for booking ${fullBooking.ticketNumber}. Your e-ticket is now active.`,
  }).catch(() => {});
};

/* ─── 1. Initialize Chapa payment ────────────────────────────────────────── */
// POST /api/payments/chapa/initialize
const chapaInitialize = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

    // Load booking — amount MUST come from DB, never from frontend
    const booking = await Booking.findById(bookingId)
      .populate('companyId', 'companyName chapaSubaccountId')
      .populate({ path: 'schedule', populate: ['route'] });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Passenger must own this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this booking' });
    }

    if (!['PENDING_PAYMENT', 'pending', 'PENDING'].includes(booking.status)) {
      return res.status(400).json({ message: `Booking cannot be paid in status: ${booking.status}` });
    }

    if (booking.expiresAt && new Date() > booking.expiresAt) {
      return res.status(400).json({ message: 'Booking payment window has expired. Please start a new booking.' });
    }

    // Amount from DB — never trust frontend
    const amount = booking.totalPrice;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid booking amount' });

    // Unique tx_ref
    const txRef = `BUS-${booking._id.toString().slice(-8)}-${Date.now()}`;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    // Sanitize email
    let email = req.user.email || '';
    if (!email.includes('@')) {
      email = `${(req.user.name || 'passenger').toLowerCase().replace(/\W/g, '')}@ethiobus.com`;
    }

    const nameParts = (req.user.name || 'Passenger User').split(' ');
    const firstName = (nameParts[0] || 'Passenger').replace(/[^a-zA-Z]/g, '') || 'Passenger';
    const lastName  = (nameParts.slice(1).join(' ') || 'User').replace(/[^a-zA-Z]/g, '') || 'User';

    const payload = {
      amount: String(amount),
      currency: 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      callback_url: `${frontendUrl}/payment/callback`,
      return_url:   `${frontendUrl}/payment/callback?tx_ref=${encodeURIComponent(txRef)}`,
      customization: {
        title: 'EthioBus',
        description: `Booking ${booking.ticketNumber}`,
      },
      meta: {
        bookingId:  bookingId.toString(),
        userId:     req.user._id.toString(),
        companyId:  (booking.companyId?._id || booking.companyId).toString(),
      },
    };

    const chapaKey = getCleanChapaKey();
    if (!chapaKey || chapaKey.includes('•')) {
      return res.status(400).json({
        message: 'Chapa Secret Key is not configured in backend/.env. Please configure your real CHAPA_SECRET_KEY.',
      });
    }

    console.log('[Chapa] Initializing payment with official Chapa API for tx_ref:', txRef);
    const chapaRes = await chapaRequest('POST', '/transaction/initialize', payload);

    if (chapaRes.statusCode !== 200 || !chapaRes.body?.data?.checkout_url) {
      console.error('[Chapa] Initialization error from Chapa:', chapaRes.body);
      const errMsg = chapaRes.body?.message || (chapaRes.statusCode === 401 ? 'Invalid Chapa Secret Key (401 Unauthorized)' : 'Chapa payment gateway rejected initialize request');
      return res.status(chapaRes.statusCode === 401 ? 401 : 400).json({ message: errMsg });
    }

    const checkoutUrl = chapaRes.body.data.checkout_url;
    console.log('[Chapa] Successfully obtained official checkout URL:', checkoutUrl);

    // Upsert Payment record — status PENDING
    let payment = await Payment.findOne({ booking: bookingId, status: { $in: ['PENDING', 'pending'] } });
    if (payment) {
      payment.txRef         = txRef;
      payment.transactionId = txRef;
      payment.amount        = amount;
      payment.paymentMethod = 'Chapa';
      payment.method        = 'Chapa';
      payment.currency      = 'ETB';
      await payment.save();
    } else {
      payment = await Payment.create({
        companyId:    booking.companyId?._id || booking.companyId,
        booking:      bookingId,
        user:         req.user._id,
        amount,
        currency:     'ETB',
        paymentMethod: 'Chapa',
        method:       'Chapa',
        txRef,
        transactionId: txRef,
        status:       'PENDING',
      });
    }

    await Notification.create({
      user: req.user._id,
      companyId: booking.companyId?._id || booking.companyId,
      type: 'payment',
      title: 'Payment Pending',
      message: `Payment of ETB ${amount} is pending for booking ${booking.ticketNumber}. Complete payment on Chapa.`,
    }).catch(() => {});

    res.json({ success: true, checkoutUrl, txRef });
  } catch (err) {
    console.error('[Chapa] Initialize failed:', err.message);
    res.status(500).json({ message: `Chapa initialization failed: ${err.message}` });
  }
};

const getPopulatedBookingAndTickets = async (bookingId) => {
  const b = await Booking.findById(bookingId)
    .populate('companyId', 'companyName logo cancellationPolicy phone email')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'outboundLeg.schedule', populate: ['bus', 'route', 'companyId'] })
    .populate({ path: 'returnLeg.schedule', populate: ['bus', 'route', 'companyId'] });
  const t = await Ticket.find({ booking: bookingId })
    .populate('companyId', 'companyName logo')
    .populate({ path: 'schedule', populate: ['bus', 'route', 'companyId'] });
  return { booking: b, tickets: t };
};

/* ─── 2. Verify Chapa payment ────────────────────────────────────────────── */
// GET /api/payments/chapa/verify/:txRef
const chapaVerify = async (req, res, next) => {
  try {
    const { txRef } = req.params;

    // Find payment by txRef
    const payment = await Payment.findOne({ $or: [{ txRef }, { transactionId: txRef }] });
    if (!payment) return res.status(404).json({ message: 'Payment not found for this tx_ref' });

    // Prevent re-processing an already paid payment
    if (['PAID', 'completed'].includes(payment.status)) {
      const { booking, tickets } = await getPopulatedBookingAndTickets(payment.booking);
      return res.json({ verified: true, status: 'success', payment, booking, tickets });
    }

    const chapaKey = getCleanChapaKey();
    let isSuccess = false;
    let chapaReference = '';

    if (chapaKey && !chapaKey.includes('•')) {
      try {
        console.log('[Chapa] Verifying transaction on Chapa gateway:', txRef);
        const chapaRes = await chapaRequest('GET', `/transaction/verify/${txRef}`);
        const data     = chapaRes.body?.data;
        if (chapaRes.body?.status === 'success' && data?.status === 'success') {
          isSuccess = true;
          chapaReference = data?.reference || '';
          console.log('[Chapa] Payment verified successfully by Chapa API for txRef:', txRef);
        } else {
          console.warn('[Chapa] Verification response from Chapa:', chapaRes.body);
        }
      } catch (err) {
        console.error('[Chapa] Verify request error:', err.message);
      }
    }

    // If verified successfully with Chapa API
    if (isSuccess) {
      payment.status         = 'PAID';
      payment.chapaReference = chapaReference || `CHAPA-${Date.now()}`;
      payment.paidAt         = new Date();
      await payment.save();

      const booking = await Booking.findById(payment.booking);

      if (booking && !['CONFIRMED', 'confirmed'].includes(booking.status)) {
        booking.status        = 'CONFIRMED';
        booking.paymentStatus = 'PAID';
        await booking.save();
        await activateTickets(booking);
      } else if (booking) {
        await activateTickets(booking);
      }

      const { booking: fullBooking, tickets } = await getPopulatedBookingAndTickets(payment.booking);
      return res.json({ verified: true, status: 'success', payment, booking: fullBooking, tickets });
    }

    // Failed
    payment.status = 'FAILED';
    await payment.save();

    await Notification.create({
      user: payment.user,
      companyId: payment.companyId,
      type: 'payment',
      title: 'Payment Failed',
      message: `Payment for tx_ref ${txRef} failed or was cancelled. Please try again.`,
    }).catch(() => {});

    res.json({ verified: false, status: 'failed', message: 'Payment verification failed with Chapa', payment });
  } catch (err) { next(err); }
};

/* ─── 3. Chapa webhook (no auth required) ────────────────────────────────── */
// POST /api/payments/chapa/webhook
const chapaWebhook = async (req, res) => {
  try {
    const { tx_ref, status } = req.body;
    if (!tx_ref) return res.sendStatus(400);

    const payment = await Payment.findOne({ $or: [{ txRef: tx_ref }, { transactionId: tx_ref }] });
    if (!payment) return res.sendStatus(404);

    if (status === 'success' && !['PAID', 'completed'].includes(payment.status)) {
      payment.status = 'PAID';
      payment.paidAt = new Date();
      await payment.save();

      const booking = await Booking.findById(payment.booking);
      if (booking && !['CONFIRMED', 'confirmed'].includes(booking.status)) {
        booking.status        = 'CONFIRMED';
        booking.paymentStatus = 'PAID';
        await booking.save();
        await activateTickets(booking);
      }
    } else if (status === 'failed') {
      payment.status = 'FAILED';
      await payment.save();
    }

    res.sendStatus(200);
  } catch { res.sendStatus(500); }
};

/* ─── 4. Non-Chapa payment (Telebirr/CBE/Cash simulation) ───────────────── */
// POST /api/payments/initiate
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, method } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const amount = booking.totalPrice;
    const txRef  = 'TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase();

    const payment = await Payment.create({
      companyId:    booking.companyId,
      booking:      bookingId,
      user:         req.user._id,
      amount,
      currency:     'ETB',
      paymentMethod: method || 'Telebirr',
      method:       method || 'Telebirr',
      txRef,
      transactionId: txRef,
      status:       'PAID',
      paidAt:       new Date(),
    });

    booking.status        = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    await booking.save();
    await activateTickets(booking);

    const { booking: fullBooking, tickets } = await getPopulatedBookingAndTickets(booking._id);

    res.status(201).json({ success: true, txRef, payment, booking: fullBooking, tickets });
  } catch (err) { next(err); }
};

/* ─── 5. Verify by txRef ─────────────────────────────────────────────────── */
const verifyPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.body;
    const payment = await Payment.findOne({ $or: [{ txRef: transactionId }, { transactionId }] });
    if (!payment) return res.status(404).json({ message: 'Transaction not found' });
    const { booking, tickets } = await getPopulatedBookingAndTickets(payment.booking);
    res.json({ verified: true, payment, booking, tickets });
  } catch (err) { next(err); }
};

/* ─── 6. Passenger payment history ──────────────────────────────────────── */
const getUserPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('companyId', 'companyName logo')
      .populate({ path: 'booking', populate: { path: 'schedule', populate: ['bus', 'route'] } })
      .sort('-createdAt');
    res.json(payments);
  } catch (err) { next(err); }
};

const isSuper = (u) => u && (u.role === 'super_admin' || (u.role === 'admin' && !u.companyId));
const getCompId = (u) => u?.companyId?._id ? u.companyId._id.toString() : u?.companyId ? u.companyId.toString() : null;

/* ─── 7. All payments (company-scoped) ───────────────────────────────────── */
const getAllPayments = async (req, res, next) => {
  try {
    const query = {};
    if (!isSuper(req.user)) {
      const cid = getCompId(req.user);
      if (!cid) return res.status(403).json({ message: 'No company assigned' });
      query.companyId = cid;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }
    const payments = await Payment.find(query)
      .populate('companyId', 'companyName logo')
      .populate('user', 'name email phone')
      .populate({ path: 'booking', populate: { path: 'schedule', populate: ['bus', 'route'] } })
      .sort('-createdAt');
    res.json(payments);
  } catch (err) { next(err); }
};

/* ─── 8. Update payment status (admin) ──────────────────────────────────── */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (!isSuper(req.user)) {
      const cid = getCompId(req.user);
      if (cid && payment.companyId.toString() !== cid) {
        return res.status(403).json({ message: 'Access denied to this payment' });
      }
    }

    payment.status = req.body.status;
    await payment.save();

    if (req.body.status === 'PAID' || req.body.status === 'completed') {
      const booking = await Booking.findById(payment.booking);
      if (booking && !['CONFIRMED', 'confirmed'].includes(booking.status)) {
        booking.status        = 'CONFIRMED';
        booking.paymentStatus = 'PAID';
        await booking.save();
        await activateTickets(booking);
      }
    }

    res.json({ success: true, payment });
  } catch (err) { next(err); }
};

/* ─── 9. Request refund ──────────────────────────────────────────────────── */
// POST /api/payments/refund/request
const requestRefund = async (req, res, next) => {
  try {
    const { bookingId, reason, leg } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('companyId', 'companyName cancellationPolicy');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Passenger must own booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this booking' });
    }

    // Booking must be paid
    const payment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['PAID', 'completed'] },
    });
    if (!payment) {
      return res.status(400).json({ message: 'Cannot request refund for unpaid booking' });
    }

    // No duplicate refund
    const existing = await Refund.findOne({ bookingId, status: { $nin: ['REJECTED', 'REVERSED'] } });
    if (existing) {
      return res.status(400).json({ message: 'A refund request already exists for this booking' });
    }

    // Cannot refund already refunded
    if (['REFUNDED', 'refunded'].includes(booking.paymentStatus)) {
      return res.status(400).json({ message: 'Booking has already been refunded' });
    }

    // Calculate eligible refund using company policy
    const policy = booking.companyId?.cancellationPolicy || { deadlineHours: 24, refundPercentage: 80 };
    const primarySchedule = await Schedule.findById(booking.schedule || booking.outboundLeg?.schedule);
    let hoursUntilDeparture = 99;
    if (primarySchedule?.date && primarySchedule?.departureTime) {
      const dep = new Date(`${primarySchedule.date}T${primarySchedule.departureTime.slice(0,5)}:00`);
      hoursUntilDeparture = (dep - new Date()) / 3600000;
    }

    const rate = hoursUntilDeparture >= (policy.deadlineHours || 24) ? (policy.refundPercentage || 80) / 100 : 0;
    let refundableAmount = 0;
    const targetLeg = leg || 'all';

    if (targetLeg === 'all' || booking.tripType === 'oneway') {
      refundableAmount = Math.round(payment.amount * rate);
    } else if (targetLeg === 'return') {
      refundableAmount = Math.round((booking.returnLeg?.price || payment.amount / 2) * rate);
    } else if (targetLeg === 'outbound') {
      refundableAmount = Math.round((booking.outboundLeg?.price || payment.amount / 2) * rate);
    }

    const refund = await Refund.create({
      bookingId,
      paymentId:   payment._id,
      passengerId: req.user._id,
      companyId:   booking.companyId?._id || booking.companyId,
      txRef:       payment.txRef || payment.transactionId,
      amount:      refundableAmount,
      reason:      reason || 'Passenger cancellation',
      leg:         targetLeg,
      status:      'REQUESTED',
    });

    await Notification.create({
      user: req.user._id,
      companyId: booking.companyId?._id || booking.companyId,
      type: 'payment',
      title: 'Refund Requested',
      message: `Refund of ETB ${refundableAmount} requested for booking ${booking.ticketNumber}. Awaiting company approval.`,
    }).catch(() => {});

    res.status(201).json({ success: true, refund, refundableAmount });
  } catch (err) { next(err); }
};

/* ─── 10. Company admin: list refund requests ────────────────────────────── */
// GET /api/payments/refund/all
const getRefunds = async (req, res, next) => {
  try {
    const query = {};
    if (!isSuper(req.user)) {
      const cid = getCompId(req.user);
      if (!cid) return res.status(403).json({ message: 'No company assigned' });
      query.companyId = cid;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const refunds = await Refund.find(query)
      .populate('bookingId', 'ticketNumber totalPrice tripType status paymentStatus')
      .populate('paymentId', 'amount txRef status')
      .populate('passengerId', 'name email phone')
      .populate('companyId', 'companyName')
      .sort('-requestedAt');
    res.json(refunds);
  } catch (err) { next(err); }
};

/* ─── 11. Company admin: approve / reject refund ─────────────────────────── */
// PUT /api/payments/refund/:id/decision
const refundDecision = async (req, res, next) => {
  try {
    const { decision, adminNote } = req.body; // decision: 'APPROVED' | 'REJECTED'
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund request not found' });

    // Company isolation
    if (!isSuper(req.user)) {
      const cid = getCompId(req.user);
      if (cid && refund.companyId.toString() !== cid) {
        return res.status(403).json({ message: 'Access denied to this refund' });
      }
    }

    if (!['REQUESTED'].includes(refund.status)) {
      return res.status(400).json({ message: `Refund is already ${refund.status}` });
    }

    if (decision === 'REJECTED') {
      refund.status     = 'REJECTED';
      refund.adminNote  = adminNote || '';
      refund.processedAt = new Date();
      await refund.save();

      await Notification.create({
        user: refund.passengerId,
        companyId: refund.companyId,
        type: 'payment',
        title: 'Refund Rejected',
        message: `Your refund request has been rejected. Reason: ${adminNote || 'Company policy'}`,
      }).catch(() => {});

      return res.json({ success: true, refund });
    }

    // Approved — call Chapa refund API
    refund.status    = 'APPROVED';
    refund.adminNote = adminNote || '';
    await refund.save();

    // Safety checks before sending to Chapa
    const payment = await Payment.findById(refund.paymentId);
    if (!payment || !['PAID', 'completed'].includes(payment.status)) {
      return res.status(400).json({ message: 'Cannot refund — original payment not in PAID status' });
    }
    if (refund.amount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount exceeds original payment amount' });
    }

    const chapaRefundRef = `REF-${refund._id.toString().slice(-8)}-${Date.now()}`;

    try {
      const chapaRes = await chapaRequest('POST', `/refund/${refund.txRef}`, {
        amount: String(refund.amount),
        reason: refund.reason || 'Passenger cancellation',
        reference: chapaRefundRef,
      });

      if (chapaRes.statusCode === 200 && chapaRes.body?.status === 'success') {
        refund.status               = 'PROCESSING';
        refund.chapaRefundReference = chapaRes.body?.data?.ref_id || chapaRefundRef;
        refund.processedAt          = new Date();
        await refund.save();
      } else {
        console.error('Chapa refund init failed:', chapaRes.body);
        refund.status    = 'PROCESSING'; // Keep as processing — will be verified later
        refund.chapaRefundReference = chapaRefundRef;
        await refund.save();
      }
    } catch (chapaErr) {
      console.error('Chapa refund API error:', chapaErr.message);
      refund.status = 'PROCESSING';
      refund.chapaRefundReference = chapaRefundRef;
      await refund.save();
    }

    await Notification.create({
      user: refund.passengerId,
      companyId: refund.companyId,
      type: 'payment',
      title: 'Refund Processing',
      message: `Your refund of ETB ${refund.amount} is being processed. You will be notified when completed.`,
    }).catch(() => {});

    res.json({ success: true, refund });
  } catch (err) { next(err); }
};

/* ─── 12. Verify refund status with Chapa ────────────────────────────────── */
// GET /api/payments/refund/:id/verify
const verifyRefund = async (req, res, next) => {
  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund not found' });

    // Company isolation
    if (!isSuper(req.user)) {
      const cid = getCompId(req.user);
      if (cid && refund.companyId.toString() !== cid) {
        return res.status(403).json({ message: 'Access denied to this refund' });
      }
    }

    if (!refund.chapaRefundReference) {
      return res.status(400).json({ message: 'No Chapa refund reference found' });
    }

    const chapaRes = await chapaRequest('GET', `/refund/${refund.chapaRefundReference}/verify`);
    const status   = chapaRes.body?.data?.status || chapaRes.body?.status;

    if (status === 'refunded' || status === 'success') {
      refund.status      = 'REFUNDED';
      refund.processedAt = new Date();
      await refund.save();

      // Update payment
      await Payment.findByIdAndUpdate(refund.paymentId, { status: 'REFUNDED' });

      // Update booking + tickets
      const booking = await Booking.findById(refund.bookingId);
      if (booking) {
        booking.status        = 'CANCELLED';
        booking.paymentStatus = 'REFUNDED';
        await booking.save();
      }
      await Ticket.updateMany({ booking: refund.bookingId }, { status: 'REFUNDED' });

      await Notification.create({
        user: refund.passengerId,
        companyId: refund.companyId,
        type: 'payment',
        title: 'Refund Completed',
        message: `Your refund of ETB ${refund.amount} has been completed successfully.`,
      }).catch(() => {});

    } else if (status === 'reversed') {
      refund.status = 'REVERSED';
      await refund.save();
    } else if (status === 'processing') {
      refund.status = 'PROCESSING';
      await refund.save();
    }

    res.json({ success: true, refund, chapaStatus: status });
  } catch (err) { next(err); }
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
  refundDecision,
  verifyRefund,
  chapaRequest,
  getCleanChapaKey,
};
