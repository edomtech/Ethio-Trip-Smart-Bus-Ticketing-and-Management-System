const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Company = require('../models/Company');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const chapaService = require('./chapaService');
const chapaConfig = require('../config/chapa');
const { resolveBackendUrl, resolveFrontendUrl, withQuery } = require('../config/frontend');
const { activateTicketsForBooking } = require('./ticketService');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');
const { ROLES } = require('../constants/roles');

const COMPANY_SCOPED_ROLES = [ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR];


const assertPaymentAccess = (booking, user) => {
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
      const err = new Error('You do not own this booking');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const err = new Error('Access denied: your account role cannot perform this action');
  err.statusCode = 403;
  throw err;
};


const initializePayment = async (bookingId, authenticatedUser, req = null) => {
  const booking = await Booking.findById(bookingId)
    .populate('companyId')
    .populate({ path: 'schedule', populate: ['route'] });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  assertPaymentAccess(booking, authenticatedUser);

  if (booking.status !== BOOKING_STATUS.PENDING_PAYMENT) {
    const err = new Error(`Booking cannot be paid in current status: ${booking.status}`);
    err.statusCode = 400;
    throw err;
  }

  if (booking.expiresAt && new Date() > booking.expiresAt) {
    const err = new Error('The booking payment hold window has expired. Please select your seats again.');
    err.statusCode = 400;
    throw err;
  }

  const amount = Number(booking.totalPrice);
  if (!amount || amount <= 0) {
    const err = new Error('Invalid payable amount for booking');
    err.statusCode = 400;
    throw err;
  }

  const companyDoc = booking.companyId || await Company.findById(booking.company);
  const subaccountId = companyDoc?.payment?.subaccountId || companyDoc?.chapaSubaccountId || null;
  const splitType = companyDoc?.payment?.splitType || 'percentage';
  const splitValue = companyDoc?.payment?.splitValue !== undefined ? companyDoc.payment.splitValue : 90;

  let companyAmount = amount;
  let platformCommission = 0;

  if (subaccountId) {
    if (splitType === 'percentage') {
      companyAmount = Math.round((amount * splitValue) / 100);
      platformCommission = amount - companyAmount;
    } else {
      companyAmount = Math.max(0, amount - splitValue);
      platformCommission = Math.min(amount, splitValue);
    }
  }

  const txRef = `ETHIOTRIP-${booking._id.toString().slice(-8)}-${Date.now()}`;
  const frontendUrl = resolveFrontendUrl(req);
  const backendUrl = resolveBackendUrl(req);

  let email = authenticatedUser.email || '';
  if (!email.includes('@')) {
    email = `${(authenticatedUser.name || 'passenger').toLowerCase().replace(/\W/g, '')}@ethiotrip.com`;
  }

  const nameParts = (authenticatedUser.name || 'Passenger User').trim().split(' ');
  const firstName = (nameParts[0] || 'Passenger').replace(/[^a-zA-Z]/g, '') || 'Passenger';
  const lastName  = (nameParts.slice(1).join(' ') || 'User').replace(/[^a-zA-Z]/g, '') || 'User';

  const chapaResult = await chapaService.initializeTransaction({
    amount,
    currency: 'ETB',
    email,
    firstName,
    lastName,
    txRef,
    callbackUrl: backendUrl ? `${backendUrl}/api/payments/chapa/webhook` : `${frontendUrl}/payment/callback`,
    returnUrl: withQuery(frontendUrl, 'payment/callback', { tx_ref: txRef }),
    subaccountId,
    customization: {
      title: 'Ethio Trip',
      description: `Bus Booking ${booking.ticketNumber}`,
    },
    meta: {
      bookingId: booking._id.toString(),
      userId: authenticatedUser._id.toString(),
      companyId: (companyDoc?._id || booking.companyId).toString(),
      subaccountId: subaccountId || '',
      companyAmount,
      platformCommission,
    },
  });

  let payment = await Payment.findOne({ booking: bookingId, status: PAYMENT_STATUS.PENDING });
  if (payment) {
    payment.txRef = txRef;
    payment.chapaTxRef = txRef;
    payment.transactionId = txRef;
    payment.amount = amount;
    payment.companyAmount = companyAmount;
    payment.platformCommission = platformCommission;
    payment.splitType = splitType;
    payment.splitValue = splitValue;
    payment.chapaSubaccountId = subaccountId;
    payment.paymentMethod = 'Chapa';
    payment.currency = 'ETB';
    payment.mode = chapaConfig.mode;
    await payment.save();
  } else {
    payment = await Payment.create({
      companyId: companyDoc?._id || booking.companyId,
      company: companyDoc?._id || booking.companyId,
      booking: bookingId,
      user: authenticatedUser._id,
      passenger: authenticatedUser._id,
      amount,
      companyAmount,
      platformCommission,
      splitType,
      splitValue,
      chapaSubaccountId: subaccountId,
      currency: 'ETB',
      paymentMethod: 'Chapa',
      method: 'Chapa',
      txRef,
      chapaTxRef: txRef,
      transactionId: txRef,
      status: PAYMENT_STATUS.PENDING,
      mode: chapaConfig.mode,
    });
  }

  await AuditLog.create({
    user: authenticatedUser._id,
    userEmail: authenticatedUser.email,
    userRole: authenticatedUser.role,
    companyId: companyDoc?._id || booking.companyId,
    action: 'PAYMENT_INITIALIZED',
    entityType: 'Payment',
    entityId: payment._id.toString(),
    details: {
      txRef,
      amount,
      subaccountId,
      companyAmount,
      platformCommission,
      bookingNumber: booking.ticketNumber,
    },
  }).catch(() => {});

  return {
    checkoutUrl: chapaResult.checkoutUrl,
    txRef,
    amount,
    mode: chapaConfig.mode,
  };
};


const verifyPayment = async (txRef, authenticatedUser) => {
  const payment = await Payment.findOne({
    $or: [{ chapaTxRef: txRef }, { txRef }, { transactionId: txRef }],
  })
    .populate('booking')
    .populate('companyId');

  if (!payment) {
    const err = new Error('Payment record not found for this transaction reference');
    err.statusCode = 404;
    throw err;
  }

  assertPaymentAccess(payment.booking, authenticatedUser);

  if (payment.status === PAYMENT_STATUS.PAID) {
    const tickets = await activateTicketsForBooking(payment.booking._id || payment.booking);
    const updatedBooking = await Booking.findById(payment.booking._id || payment.booking)
      .populate('companyId')
      .populate({ path: 'schedule', populate: ['bus', 'route'] });
    try {
      const emailService = require('./emailService');
      const bookingPop = updatedBooking || await Booking.findById(payment.booking._id || payment.booking).populate({ path: 'user', select: 'email name' }).populate({ path: 'schedule', populate: ['bus','route'] }).populate('companyId');
      const email = bookingPop?.user?.email || bookingPop?.passengerEmail || authenticatedUser?.email;
      if (email) {
        emailService.sendPaymentConfirmation(email, bookingPop.toObject ? bookingPop.toObject() : bookingPop, payment.toObject ? payment.toObject() : payment).catch(()=>{});
        if (tickets && tickets.length > 0) {
          emailService.sendTicketEmail(email, (tickets[0].toObject?tickets[0].toObject():tickets[0]), bookingPop.toObject ? bookingPop.toObject() : bookingPop).catch(()=>{});
        }
      }
    } catch (e) {}
    return { verified: true, status: 'success', payment, booking: updatedBooking, tickets };
  }

  console.log(`[PaymentService] Independently re-querying Chapa for txRef: ${txRef}`);
  const chapaRes = await chapaService.verifyTransaction(txRef);
  const data = chapaRes.data;

  const isChapaSuccess = chapaRes.isSuccess && (data?.status === 'success');
  const receivedAmount = Number(data?.amount);
  const expectedAmount = Number(payment.amount);
  const isAmountValid = Math.abs(receivedAmount - expectedAmount) < 0.01;
  const isCurrencyValid = (data?.currency || 'ETB').toUpperCase() === 'ETB';

  if (isChapaSuccess && isAmountValid && isCurrencyValid) {
    payment.status = PAYMENT_STATUS.PAID;
    payment.paidAt = new Date();
    payment.verifiedAt = new Date();
    payment.chapaReference = data?.reference || `CHAPA-${Date.now()}`;
    await payment.save();

    const tickets = await activateTicketsForBooking(payment.booking._id || payment.booking);
    const updatedBooking = await Booking.findById(payment.booking._id || payment.booking)
      .populate('companyId')
      .populate({ path: 'schedule', populate: ['bus', 'route'] })
      .populate({ path: 'user', select: 'email name' });

    if (authenticatedUser) {
      await AuditLog.create({
        user: authenticatedUser._id,
        userEmail: authenticatedUser.email,
        userRole: authenticatedUser.role,
        companyId: payment.companyId?._id || payment.companyId,
        action: 'PAYMENT_VERIFIED_SUCCESS',
        entityType: 'Payment',
        entityId: payment._id.toString(),
        details: { txRef, amount: payment.amount, chapaRef: payment.chapaReference },
      }).catch(() => {});
    }

    try {
      const emailService = require('./emailService');
      const email = updatedBooking?.user?.email || updatedBooking?.passengerEmail || authenticatedUser?.email;
      if (email) {
        emailService.sendPaymentConfirmation(email, updatedBooking.toObject ? updatedBooking.toObject() : updatedBooking, payment.toObject ? payment.toObject() : payment).catch(()=>{});
        if (tickets && tickets.length > 0) {
          emailService.sendTicketEmail(email, (tickets[0].toObject?tickets[0].toObject():tickets[0]), updatedBooking.toObject ? updatedBooking.toObject() : updatedBooking).catch(()=>{});
        }
      }
    } catch (e) {}

    return { verified: true, status: 'success', payment, booking: updatedBooking, tickets };
  }

  payment.status = PAYMENT_STATUS.FAILED;
  await payment.save();

  if (authenticatedUser) {
    await AuditLog.create({
      user: authenticatedUser._id,
      userEmail: authenticatedUser.email,
      userRole: authenticatedUser.role,
      companyId: payment.companyId?._id || payment.companyId,
      action: 'PAYMENT_VERIFICATION_FAILED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      details: {
        txRef,
        isChapaSuccess,
        receivedAmount,
        expectedAmount,
        gatewayResponse: chapaRes.body,
      },
    }).catch(() => {});
  }

  const err = new Error('Payment verification failed on Chapa gateway. Amount, currency, or gateway status did not match.');
  err.statusCode = 400;
  throw err;
};


const handleWebhook = async (webhookPayload, signatureHeader = null, rawBody = null) => {
  const signatureValid = chapaService.validateWebhookSignature(rawBody ?? webhookPayload, signatureHeader);
  if (!signatureValid) {
    const err = new Error('Invalid or missing Chapa webhook signature');
    err.statusCode = 401;
    throw err;
  }

  const txRef = webhookPayload.tx_ref || webhookPayload.trx_ref;
  if (!txRef) {
    const err = new Error('Missing transaction reference in webhook payload');
    err.statusCode = 400;
    throw err;
  }

  const payment = await Payment.findOne({
    $or: [{ chapaTxRef: txRef }, { txRef }, { transactionId: txRef }],
  });

  if (!payment) {
    const err = new Error('Payment record not found for webhook reference');
    err.statusCode = 404;
    throw err;
  }

  if (payment.status === PAYMENT_STATUS.PAID) {
    return { success: true, message: 'Payment already verified and processed (idempotent)' };
  }

  const chapaRes = await chapaService.verifyTransaction(txRef);
  const data = chapaRes.data;

  const isVerified = chapaRes.isSuccess && (data?.status === 'success');
  const amountMatches = Math.abs(Number(data?.amount) - Number(payment.amount)) < 0.01;

  if (!isVerified || !amountMatches) {
    console.warn(`[PaymentService Webhook] Verification failed for ${txRef}: amount mismatch or unverified status`);
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    const err = new Error('Webhook transaction could not be independently verified against Chapa API');
    err.statusCode = 400;
    throw err;
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.paidAt = new Date();
  payment.verifiedAt = new Date();
  payment.chapaReference = data?.reference || webhookPayload.reference || '';
  await payment.save();

  await activateTicketsForBooking(payment.booking);

  await AuditLog.create({
    companyId: payment.companyId || payment.company,
    action: 'PAYMENT_VERIFIED_WEBHOOK',
    entityType: 'Payment',
    entityId: payment._id.toString(),
    details: { txRef, amount: payment.amount, chapaRef: payment.chapaReference },
  }).catch(() => {});

  return { success: true, message: 'Payment verified and tickets activated successfully via webhook' };
};


const executeDevMockPayment = async (bookingId, authenticatedUser) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_MOCK_PAYMENT !== 'true') {
    const err = new Error('Mock payments are disabled in production environment');
    err.statusCode = 403;
    throw err;
  }

  const booking = await Booking.findById(bookingId).populate('companyId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (!booking.user || booking.user.toString() !== authenticatedUser._id.toString()) {
    const err = new Error('Unauthorized to simulate payment for this booking');
    err.statusCode = 403;
    throw err;
  }

  const txRef = `DEV-TEST-${booking._id.toString().slice(-6)}-${Date.now()}`;

  let payment = await Payment.findOne({ booking: booking._id, status: PAYMENT_STATUS.PENDING });
  if (payment) {
    payment.status = PAYMENT_STATUS.PAID;
    payment.paidAt = new Date();
    payment.verifiedAt = new Date();
    payment.txRef = txRef;
    payment.chapaTxRef = txRef;
    payment.chapaReference = 'DEV_TEST_VERIFIED';
    await payment.save();
  } else {
    payment = await Payment.create({
      companyId: booking.companyId?._id || booking.companyId,
      company: booking.companyId?._id || booking.companyId,
      booking: booking._id,
      user: authenticatedUser._id,
      passenger: authenticatedUser._id,
      amount: booking.totalPrice,
      currency: 'ETB',
      paymentMethod: 'Chapa',
      method: 'Chapa',
      txRef,
      chapaTxRef: txRef,
      transactionId: txRef,
      chapaReference: 'DEV_TEST_VERIFIED',
      status: PAYMENT_STATUS.PAID,
      paidAt: new Date(),
      verifiedAt: new Date(),
      mode: 'TEST',
    });
  }

  const tickets = await activateTicketsForBooking(booking._id);
  const updatedBooking = await Booking.findById(booking._id)
    .populate('companyId')
    .populate({ path: 'schedule', populate: ['bus', 'route'] });

  return { verified: true, isDevMock: true, payment, booking: updatedBooking, tickets };
};

const getPaymentHistory = async (userId) => {
  return Payment.find({ $or: [{ user: userId }, { passenger: userId }] })
    .populate('companyId', 'companyName logo')
    .populate('company', 'companyName logo')
    .populate({ path: 'booking', populate: { path: 'schedule', populate: ['bus', 'route'] } })
    .sort({ createdAt: -1 });
};

const getCompanyPayments = async (companyId) => {
  return Payment.find({ $or: [{ companyId }, { company: companyId }] })
    .populate('companyId', 'companyName logo')
    .populate('company', 'companyName logo')
    .populate('user', 'name email phone')
    .populate('passenger', 'name email phone')
    .populate({ path: 'booking', populate: { path: 'schedule', populate: ['bus', 'route'] } })
    .sort({ createdAt: -1 });
};

const getAllPaymentsSuperAdmin = async (queryParams = {}) => {
  const filter = {};
  if (queryParams.companyId) {
    filter.$or = [{ companyId: queryParams.companyId }, { company: queryParams.companyId }];
  }
  return Payment.find(filter)
    .populate('companyId', 'companyName logo')
    .populate('company', 'companyName logo')
    .populate('user', 'name email phone')
    .populate('passenger', 'name email phone')
    .populate({ path: 'booking', populate: { path: 'schedule', populate: ['bus', 'route'] } })
    .sort({ createdAt: -1 });
};


const submitManualPaymentReceipt = async (bookingId, payload, authenticatedUser) => {
  const { receiptImage, paymentMethod, transactionReference, submittedAmount, receiptNote } = payload;

  if (!receiptImage) {
    const err = new Error('Receipt image is required for manual payment verification');
    err.statusCode = 400;
    throw err;
  }

  const booking = await Booking.findById(bookingId).populate('companyId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const actorCompanyId =
    authenticatedUser.companyId?._id?.toString() || authenticatedUser.companyId?.toString() || null;
  const bookingCompanyId =
    booking.companyId?._id?.toString() || booking.companyId?.toString() || null;

  if (authenticatedUser.role === 'passenger') {
    if (!booking.user || booking.user.toString() !== authenticatedUser._id.toString()) {
      const err = new Error('Unauthorized to submit receipt for this booking');
      err.statusCode = 403;
      throw err;
    }
  } else if (authenticatedUser.role !== 'super_admin') {
    if (!actorCompanyId || !bookingCompanyId || actorCompanyId !== bookingCompanyId) {
      const err = new Error('Unauthorized to submit receipt for this booking');
      err.statusCode = 403;
      throw err;
    }
  }

  const normalizedMethod = (paymentMethod || 'telebirr').toLowerCase().includes('cbe')
    ? 'CBE Birr'
    : 'Telebirr';

  const cleanRef = (transactionReference || '').trim();

  if (cleanRef) {
    const duplicate = await Payment.findOne({
      transactionReference: cleanRef,
      status: PAYMENT_STATUS.PAID,
      booking: { $ne: booking._id },
    });
    if (duplicate) {
      const err = new Error('This transaction reference has already been approved for another booking. Duplicate submissions are not permitted.');
      err.statusCode = 400;
      throw err;
    }
  }

  const expectedAmount = Number(booking.totalPrice) || 0;
  const numSubmittedAmount = Number(submittedAmount) || expectedAmount;

  let payment = await Payment.findOne({ booking: booking._id });
  const previousStatus = payment ? payment.status : PAYMENT_STATUS.INITIATED;

  if (!payment) {
    payment = new Payment({
      booking: booking._id,
      companyId: booking.companyId?._id || booking.companyId,
      company: booking.companyId?._id || booking.companyId,
      user: authenticatedUser._id,
      passenger: authenticatedUser._id,
      amount: expectedAmount,
      currency: 'ETB',
    });
  }

  payment.paymentMethod = normalizedMethod;
  payment.method = normalizedMethod;
  payment.receiptImage = receiptImage;
  payment.receiptNote = receiptNote || '';
  payment.transactionReference = cleanRef || `REF-${Date.now()}`;
  payment.expectedAmount = expectedAmount;
  payment.submittedAmount = numSubmittedAmount;
  payment.status = PAYMENT_STATUS.PENDING_VERIFICATION;
  payment.rejectionReason = '';

  payment.history.push({
    action: 'RECEIPT_SUBMITTED',
    fromStatus: previousStatus,
    toStatus: PAYMENT_STATUS.PENDING_VERIFICATION,
    actor: authenticatedUser._id,
    actorRole: authenticatedUser.role,
    note: `Submitted via ${normalizedMethod}. Ref: ${payment.transactionReference}. Amount: ${numSubmittedAmount} ETB`,
    timestamp: new Date(),
  });

  await payment.save();

  booking.receiptImage = receiptImage;
  booking.paymentMethod = normalizedMethod;
  booking.receiptNote = receiptNote || '';
  booking.receiptStatus = 'PENDING';
  booking.status = BOOKING_STATUS.PENDING_VERIFICATION;
  booking.paymentStatus = PAYMENT_STATUS.PENDING_VERIFICATION;
  booking.receiptUploadedAt = new Date();
  booking.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await booking.save();

  await Notification.create({
    companyId: booking.companyId?._id || booking.companyId,
    type: 'payment',
    title: 'New Manual Payment Awaiting Review',
    message: `Passenger ${booking.passenger?.name || 'Customer'} uploaded a ${normalizedMethod} receipt for Booking #${booking.ticketNumber} (${expectedAmount} ETB). Reference: ${payment.transactionReference}.`,
  }).catch(() => {});

  await AuditLog.create({
    user: authenticatedUser._id,
    userEmail: authenticatedUser.email,
    userRole: authenticatedUser.role,
    companyId: booking.companyId?._id || booking.companyId,
    action: 'MANUAL_PAYMENT_SUBMITTED',
    entityType: 'Payment',
    entityId: payment._id.toString(),
    details: {
      bookingNumber: booking.ticketNumber,
      paymentMethod: normalizedMethod,
      transactionReference: payment.transactionReference,
      expectedAmount,
      submittedAmount: numSubmittedAmount,
    },
  }).catch(() => {});

  return { success: true, payment, booking };
};


const reviewManualPaymentReceipt = async (paymentOrBookingId, decision, reviewData, staffUser) => {
  let payment = await Payment.findById(paymentOrBookingId).populate('booking');
  if (!payment) {
    payment = await Payment.findOne({ booking: paymentOrBookingId }).populate('booking');
  }

  if (!payment) {
    const err = new Error('Payment record not found');
    err.statusCode = 404;
    throw err;
  }

  const booking = await Booking.findById(payment.booking?._id || payment.booking).populate('companyId');
  if (!booking) {
    const err = new Error('Associated booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (staffUser.role !== 'super_admin') {
    const staffCompany = staffUser.companyId?._id?.toString() || staffUser.companyId?.toString();
    const paymentCompany = payment.companyId?.toString() || payment.company?.toString() || booking.companyId?._id?.toString() || booking.companyId?.toString();
    if (!staffCompany || staffCompany !== paymentCompany) {
      const err = new Error('Access denied: You can only review payments belonging to your assigned transport company');
      err.statusCode = 403;
      throw err;
    }
  }

  const prevStatus = payment.status;
  const isApproved = String(decision).toUpperCase() === 'APPROVE' || String(decision).toUpperCase() === 'APPROVED';

  if (isApproved) {
    if (payment.transactionReference) {
      const existingPaid = await Payment.findOne({
        transactionReference: payment.transactionReference,
        status: PAYMENT_STATUS.PAID,
        _id: { $ne: payment._id },
      });
      if (existingPaid) {
        const err = new Error(`Transaction reference "${payment.transactionReference}" has already been approved for another booking. Approval denied.`);
        err.statusCode = 400;
        throw err;
      }
    }

    payment.status = PAYMENT_STATUS.PAID;
    payment.verifiedBy = staffUser._id;
    payment.verifiedAt = new Date();
    payment.paidAt = new Date();
    payment.rejectionReason = '';

    payment.history.push({
      action: 'MANUAL_PAYMENT_APPROVED',
      fromStatus: prevStatus,
      toStatus: PAYMENT_STATUS.PAID,
      actor: staffUser._id,
      actorRole: staffUser.role,
      note: reviewData?.note || 'Approved by Company Staff',
      timestamp: new Date(),
    });

    await payment.save();

    booking.status = BOOKING_STATUS.CONFIRMED;
    booking.paymentStatus = PAYMENT_STATUS.PAID;
    booking.receiptStatus = 'APPROVED';
    booking.approvedBy = staffUser._id;
    booking.approvedAt = new Date();
    booking.receiptNote = reviewData?.note || 'Payment verified and approved';
    booking.expiresAt = null;
    await booking.save();

    const tickets = await activateTicketsForBooking(booking._id);

    if (booking.user) {
      await Notification.create({
        user: booking.user,
        companyId: booking.companyId?._id || booking.companyId,
        type: 'booking',
        title: 'Payment Receipt Approved! 🎉',
        message: `Your ${payment.paymentMethod} payment for Ticket #${booking.ticketNumber} has been verified and approved. Your digital e-ticket is now active for boarding!`,
      }).catch(() => {});
    }

    await AuditLog.create({
      user: staffUser._id,
      userEmail: staffUser.email,
      userRole: staffUser.role,
      companyId: booking.companyId?._id || booking.companyId,
      action: 'MANUAL_PAYMENT_APPROVED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      details: {
        bookingId: booking._id.toString(),
        ticketNumber: booking.ticketNumber,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        amount: payment.amount,
        staffId: staffUser._id.toString(),
      },
    }).catch(() => {});

    return {
      success: true,
      message: 'Payment approved successfully. Active ticket issued.',
      payment,
      booking,
      tickets,
    };
  } else {
    const rejectionReason = (reviewData?.rejectionReason || reviewData?.reason || reviewData?.note || '').trim();
    if (!rejectionReason) {
      const err = new Error('A detailed rejection reason is required when rejecting a payment receipt');
      err.statusCode = 400;
      throw err;
    }

    payment.status = PAYMENT_STATUS.REJECTED;
    payment.rejectionReason = rejectionReason;
    payment.verifiedBy = staffUser._id;
    payment.verifiedAt = new Date();

    payment.history.push({
      action: 'MANUAL_PAYMENT_REJECTED',
      fromStatus: prevStatus,
      toStatus: PAYMENT_STATUS.REJECTED,
      actor: staffUser._id,
      actorRole: staffUser.role,
      note: rejectionReason,
      timestamp: new Date(),
    });

    await payment.save();

    booking.status = BOOKING_STATUS.PENDING_PAYMENT;
    booking.paymentStatus = PAYMENT_STATUS.REJECTED;
    booking.receiptStatus = 'REJECTED';
    booking.receiptNote = rejectionReason;
    booking.expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await booking.save();

    if (booking.user) {
      await Notification.create({
        user: booking.user,
        companyId: booking.companyId?._id || booking.companyId,
        type: 'payment',
        title: 'Payment Receipt Rejected',
        message: `Your payment receipt for Booking #${booking.ticketNumber} was rejected: "${rejectionReason}". Please upload a clear and valid receipt to confirm your seats.`,
      }).catch(() => {});
    }

    await AuditLog.create({
      user: staffUser._id,
      userEmail: staffUser.email,
      userRole: staffUser.role,
      companyId: booking.companyId?._id || booking.companyId,
      action: 'MANUAL_PAYMENT_REJECTED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      details: {
        bookingId: booking._id.toString(),
        ticketNumber: booking.ticketNumber,
        paymentMethod: payment.paymentMethod,
        rejectionReason,
        staffId: staffUser._id.toString(),
      },
    }).catch(() => {});

    return {
      success: true,
      message: 'Payment receipt rejected. Passenger notified.',
      payment,
      booking,
    };
  }
};


const getPendingManualPayments = async (staffUser, queryParams = {}) => {
  const filter = {
    $or: [
      { status: PAYMENT_STATUS.PENDING_VERIFICATION },
      { status: 'PENDING_VERIFICATION' },
    ],
  };

  if (staffUser.role !== 'super_admin') {
    const companyId = staffUser.companyId?._id || staffUser.companyId;
    if (!companyId) return [];
    filter.companyId = companyId;
  } else if (queryParams.companyId) {
    filter.companyId = queryParams.companyId;
  }

  return Payment.find(filter)
    .populate('companyId', 'companyName logo phone email')
    .populate('user', 'name email phone')
    .populate('passenger', 'name email phone')
    .populate({
      path: 'booking',
      populate: [
        { path: 'schedule', populate: ['bus', 'route'] },
        { path: 'outboundLeg.schedule', populate: ['bus', 'route'] },
        { path: 'returnLeg.schedule', populate: ['bus', 'route'] },
      ],
    })
    .sort({ updatedAt: -1 });
};

module.exports = {
  initializePayment,
  verifyPayment,
  handleWebhook,
  executeDevMockPayment,
  getPaymentHistory,
  getCompanyPayments,
  getAllPaymentsSuperAdmin,
  submitManualPaymentReceipt,
  reviewManualPaymentReceipt,
  getPendingManualPayments,
};
