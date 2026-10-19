const nodemailer = require('nodemailer');
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const path = require('path');
const dotenv = require('dotenv');
const { PLATFORM } = require('../constants/branding');


const normalizeAddress = (value) => {
  if (!value || typeof value !== 'string') return null;
  const angleMatch = value.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
};


const buildFromAddress = (smtpUser) => {
  const configured = normalizeAddress(process.env.EMAIL_FROM);
  const sender = configured || smtpUser || PLATFORM.FALLBACK_SENDER;
  return `${PLATFORM.EMAIL_DISPLAY_NAME} <${sender}>`;
};


const normalizeRecipient = (value) => {
  const addr = normalizeAddress(value);
  if (!addr) return null;
  return addr.toLowerCase();
};


const createTransporter = () => {
  dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = normalizeAddress(process.env.SMTP_USER);
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    return null;
  }

  if (host === 'smtp.gmail.com' || (user && user.endsWith('@gmail.com'))) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4,
      lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    family: 4,
    lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};


const sendOtpEmail = async (to, otp, recipientName = 'Passenger') => {
  const recipient = normalizeRecipient(to);

  if (!recipient) {
    console.error('[EmailService] ❌ Refusing to send OTP: invalid recipient address.', { to });
    return {
      sent: false,
      reason: 'INVALID_RECIPIENT',
      message: 'The email address provided is not a valid address. Please re-check it and try again.',
    };
  }

  const transporter = (module.exports.createTransporter || createTransporter)();
  const smtpUser = normalizeAddress(process.env.SMTP_USER);
  const fromAddress = buildFromAddress(smtpUser);
  const safeName = String(recipientName || 'Passenger').trim();

  if (!transporter) {
    console.warn(`[EmailService] ⚠️ SMTP credentials not fully configured in environment. Delivery to ${recipient} cancelled.`);
    return {
      sent: false,
      reason: 'SMTP_NOT_CONFIGURED',
      message: 'SMTP credentials missing in environment (.env). Configure SMTP_USER and SMTP_PASS.',
    };
  }

  const senderEmail = normalizeAddress(process.env.EMAIL_FROM) || smtpUser || PLATFORM.FALLBACK_SENDER;

  const plainText = `Hello ${safeName},\n\nThank you for registering with ${PLATFORM.NAME} — ${PLATFORM.TAGLINE}.\n\nYour email verification code is:\n\n${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not request this verification code, you can ignore this email.\n\nThank you,\n${PLATFORM.NAME}`;

  const htmlContent = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; color: #1e293b;">
      <div style="font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px; margin-bottom: 16px;">
        ${PLATFORM.NAME.toUpperCase()} — ${PLATFORM.TAGLINE}
      </div>
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
        Verify Your Email Address
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Hello <strong>${safeName}</strong>,<br>
        Thank you for registering with ${PLATFORM.NAME}. This code was sent to
        <strong>${recipient}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Your email verification code is:
      </p>
      <div style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace, Courier, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #047857;">
          ${otp}
        </span>
        <div style="font-size: 12px; color: #059669; margin-top: 6px; font-weight: 600;">
          This code expires in 10 minutes. Do not share it with anyone.
        </div>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 14px;">
        Thank you,<br>
        <strong>${PLATFORM.NAME}</strong>
      </p>
    </div>
  `;

  console.log(`[EmailService] 📤 Sending "${PLATFORM.NAME}" verification code to passenger: ${recipient}`);
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: smtpUser || fromAddress,
      to: recipient,
      subject: `${PLATFORM.NAME} — Email Verification Code`,
      text: plainText,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });
    console.log(`[EmailService] ✅ Mail server accepted the message for ${recipient}. MessageId: ${info.messageId} (acceptance is not a delivery guarantee — the mailbox must exist)`);
    return {
      sent: true,
      recipient,
      messageId: info.messageId,
    };
  } catch (sendErr) {
    console.error(`[EmailService] ❌ Failed to send verification code to ${recipient}:`, sendErr.message);
    return {
      sent: false,
      recipient,
      reason: sendErr.code || 'SEND_FAILED',
      message: sendErr.message,
    };
  }
};
const escapeHtml = (value) =>
  String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripControlChars = (value) =>
  String(value === undefined || value === null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim();

const formatDateTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    timeZone: 'Africa/Addis_Ababa',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const sendRawEmail = async (to, subject, text, html, logLabel) => {
  const recipient = normalizeRecipient(to);

  if (!recipient) {
    console.error(`[EMAIL] ${logLabel} skipped - invalid recipient address.`);
    return { sent: false, reason: 'INVALID_RECIPIENT' };
  }

  const safeSubject = stripControlChars(subject).slice(0, 180) || PLATFORM.NAME;
  const transporter = (module.exports.createTransporter || createTransporter)();

  if (!transporter) {
    console.error(`[EMAIL] ${logLabel} failed - SMTP is not configured in the backend .env (SMTP_USER / SMTP_PASS missing).`);
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const smtpUser = normalizeAddress(process.env.SMTP_USER);
  const senderEmail = normalizeAddress(process.env.EMAIL_FROM) || smtpUser || PLATFORM.FALLBACK_SENDER;
  const fromAddress = buildFromAddress(smtpUser);
  console.log(`[EmailService] Sender: ${senderEmail}`);
  console.log(`[EmailService] Recipient: ${recipient}`);

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: smtpUser || fromAddress,
      to: recipient,
      subject: safeSubject,
      text,
      html,
    });
    console.log(`[EMAIL] ${logLabel} sent to ${recipient} (messageId: ${info.messageId})`);
    return { sent: true, recipient, messageId: info.messageId };
  } catch (sendErr) {
    console.error(`[EMAIL] ${logLabel} failed for ${recipient}: ${sendErr.message}`);
    return { sent: false, recipient, reason: sendErr.code || 'SEND_FAILED' };
  }
};

const emailShell = (title, greeting, bodyHtml, footerNote = '') => `
  <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; color: #1e293b;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 22px 28px;">
      <div style="font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff;">${escapeHtml(PLATFORM.NAME.toUpperCase())}</div>
      <div style="font-size: 12px; color: #d1fae5; margin-top: 2px;">${escapeHtml(PLATFORM.TAGLINE || '')}</div>
    </div>
    <div style="padding: 28px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">${escapeHtml(title)}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">${greeting}</p>
      ${bodyHtml}
      ${footerNote ? `<p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">${footerNote}</p>` : ''}
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
      <div style="font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} ${escapeHtml(PLATFORM.NAME)}. Addis Ababa, Ethiopia.</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">This is an automated message. Please do not reply.</div>
    </div>
  </div>
`;

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 9px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">${escapeHtml(label)}</td>
    <td style="padding: 9px 12px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9; text-align: right;">${escapeHtml(value)}</td>
  </tr>
`;

const bookingContext = (booking = {}) => ({
  passengerName: booking.passengerName || (booking.passenger && booking.passenger.name) || (booking.user && booking.user.name) || 'Passenger',
  reference: booking.bookingReference || booking.bookingRef || booking.ticketNumber || (booking._id ? String(booking._id) : ''),
  company: booking.companyName || (booking.company && (booking.company.companyName || booking.company.name)) || (booking.companyId && booking.companyId.companyName) || '',
  origin: booking.origin || booking.from || (booking.route && (booking.route.origin || booking.route.from)) || '',
  destination: booking.destination || booking.to || (booking.route && (booking.route.destination || booking.route.to)) || '',
  departureDate: booking.departureDate || booking.travelDate || booking.date || '',
  departureTime: booking.departureTime || booking.time || '',
  bus: booking.busPlate || (booking.bus && (booking.bus.plateNumber || booking.bus.busName)) || booking.busNumber || '',
  seats: Array.isArray(booking.seats)
    ? booking.seats.map((seat) => (seat && seat.number ? seat.number : seat)).filter(Boolean).join(', ')
    : (booking.seatNumber || booking.seats || ''),
  passengerCount: booking.numberOfPassengers || (Array.isArray(booking.seats) && booking.seats.length) || 1,
  totalAmount: booking.totalAmount !== undefined ? booking.totalAmount : booking.amount,
  paymentStatus: booking.paymentStatus || booking.payment?.status || '',
  ticketStatus: booking.ticketStatus || booking.status || '',
});

const sendBookingConfirmation = async (to, booking = {}) => {
  const ctx = bookingContext(booking);
  const rows = [
    detailRow('Booking Reference', ctx.reference),
    ctx.company && detailRow('Company', ctx.company),
    detailRow('Route', `${ctx.origin} → ${ctx.destination}`),
    detailRow('Departure', formatDateTime(ctx.departureDate) || ctx.departureTime),
    ctx.bus && detailRow('Bus', ctx.bus),
    ctx.seats && detailRow('Seat(s)', ctx.seats),
    detailRow('Passengers', ctx.passengerCount),
    detailRow('Total Amount', `ETB ${formatAmount(ctx.totalAmount)}`),
    ctx.paymentStatus && detailRow('Payment Status', ctx.paymentStatus),
    ctx.ticketStatus && detailRow('Ticket Status', ctx.ticketStatus),
  ].join('');

  const text = [
    'Booking Confirmed',
    '',
    `Hello ${ctx.passengerName},`,
    '',
    'Your booking has been confirmed successfully.',
    '',
    `Booking Reference: ${ctx.reference}`,
    ctx.company ? `Company: ${ctx.company}` : null,
    `${ctx.origin} -> ${ctx.destination}`,
    `Departure: ${formatDateTime(ctx.departureDate) || ctx.departureTime}`,
    ctx.bus ? `Bus: ${ctx.bus}` : null,
    ctx.seats ? `Seat(s): ${ctx.seats}` : null,
    `Passengers: ${ctx.passengerCount}`,
    `Total: ETB ${formatAmount(ctx.totalAmount)}`,
    ctx.paymentStatus ? `Payment: ${ctx.paymentStatus}` : null,
    ctx.ticketStatus ? `Ticket: ${ctx.ticketStatus}` : null,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].filter((line) => line !== null).join('\n');

  const html = emailShell(
    'Booking Confirmed',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, your booking has been confirmed successfully.`,
    `<table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">${rows}</table>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Booking Confirmed (${ctx.reference})`, text, html, 'Booking confirmation');
};

const sendPaymentConfirmation = async (to, booking = {}, payment = {}) => {
  const ctx = bookingContext(booking);
  const amount = payment.amount !== undefined ? payment.amount : ctx.totalAmount;
  const reference = payment.chapaReference || payment.txRef || payment.transactionId || ctx.reference;
  const paidAt = formatDateTime(payment.paidAt || payment.verifiedAt || new Date());

  const rows = [
    detailRow('Booking Reference', ctx.reference),
    detailRow('Transaction Reference', reference),
    ctx.origin && ctx.destination ? detailRow('Route', `${ctx.origin} → ${ctx.destination}`) : '',
    detailRow('Amount Paid', `ETB ${formatAmount(amount)}`),
    detailRow('Payment Status', payment.status || 'PAID'),
    paidAt ? detailRow('Paid At', paidAt) : '',
  ].join('');

  const text = [
    'Payment Confirmed',
    '',
    `Hello ${ctx.passengerName},`,
    '',
    'We have received your payment successfully.',
    '',
    `Booking Reference: ${ctx.reference}`,
    `Transaction Reference: ${reference}`,
    `Amount Paid: ETB ${formatAmount(amount)}`,
    paidAt ? `Paid At: ${paidAt}` : null,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].filter((line) => line !== null).join('\n');

  const html = emailShell(
    'Payment Successful',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, we have confirmed your payment.`,
    `<table style="width: 100%; border-collapse: collapse; background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 10px; overflow: hidden;">${rows}</table>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Payment Confirmed`, text, html, 'Payment confirmation');
};

const sendTicketEmail = async (to, ticket = {}, booking = {}) => {
  const ctx = bookingContext(booking);
  const ticketNumber = ticket.ticketNumber || ticket.ticketId || ctx.reference;

  const rows = [
    detailRow('Passenger', ctx.passengerName),
    detailRow('From', ctx.origin),
    detailRow('To', ctx.destination),
    detailRow('Date', formatDateTime(ctx.departureDate)),
    detailRow('Time', ctx.departureTime),
    ctx.bus && detailRow('Bus', ctx.bus),
    ctx.seats && detailRow('Seat', ctx.seats),
    detailRow('Booking Reference', ctx.reference),
    ticketNumber && ticketNumber !== ctx.reference ? detailRow('Ticket Number', ticketNumber) : '',
  ].join('');

  const text = [
    'Your Bus Ticket',
    '',
    `Passenger: ${ctx.passengerName}`,
    `From: ${ctx.origin}`,
    `To: ${ctx.destination}`,
    `Date: ${formatDateTime(ctx.departureDate)}`,
    `Time: ${ctx.departureTime}`,
    ctx.seats ? `Seat: ${ctx.seats}` : null,
    `Booking Reference: ${ctx.reference}`,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].filter((line) => line !== null).join('\n');

  const html = emailShell(
    'Your Bus Ticket',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, your ticket details are below. Please show this at boarding.`,
    `<table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">${rows}</table>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Your Bus Ticket (${ctx.reference})`, text, html, 'Ticket email');
};

const sendCancellationEmail = async (to, booking = {}, refundStatus) => {
  const ctx = bookingContext(booking);
  const status = refundStatus || booking.refundStatus || '';

  const rows = [
    detailRow('Booking Reference', ctx.reference),
    ctx.origin && ctx.destination ? detailRow('Route', `${ctx.origin} → ${ctx.destination}`) : '',
    detailRow('Departure', formatDateTime(ctx.departureDate)),
    detailRow('Cancellation Status', 'CANCELLED'),
    detailRow('Refund Status', status || 'Not Applicable'),
  ].join('');

  const text = [
    'Booking Cancelled',
    '',
    `Hello ${ctx.passengerName},`,
    '',
    `Your booking ${ctx.reference} has been cancelled successfully.`,
    `Refund Status: ${status || 'Not Applicable'}`,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    'Booking Cancelled',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, your booking has been cancelled successfully.`,
    `<table style="width: 100%; border-collapse: collapse; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; overflow: hidden;">${rows}</table>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Booking Cancelled (${ctx.reference})`, text, html, 'Cancellation email');
};

const sendRefundEmail = async (to, booking = {}, refund = {}) => {
  const ctx = bookingContext(booking);
  const status = refund.status || 'PENDING';
  const amount = refund.amount !== undefined ? refund.amount : ctx.totalAmount;

  const rows = [
    detailRow('Booking Reference', ctx.reference),
    detailRow('Refund Amount', `ETB ${formatAmount(amount)}`),
    detailRow('Refund Status', status),
    refund.processedAt || refund.updatedAt ? detailRow('Updated At', formatDateTime(refund.processedAt || refund.updatedAt)) : '',
  ].join('');

  const text = [
    'Refund Update',
    '',
    `Hello ${ctx.passengerName},`,
    '',
    `Booking Reference: ${ctx.reference}`,
    `Refund Amount: ETB ${formatAmount(amount)}`,
    `Refund Status: ${status}`,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    'Refund Update',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, here is the latest status of your refund.`,
    `<table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">${rows}</table>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Refund Update (${ctx.reference})`, text, html, 'Refund email');
};

const sendStaffMessage = async (to, payload = {}) => {
  const subject = stripControlChars(payload.subject).slice(0, 180);
  const body = String(payload.message || '').slice(0, 4000);
  const senderName = stripControlChars(payload.senderName || 'Your Bus Company').slice(0, 120);
  const bookingRef = stripControlChars(payload.bookingReference || '').slice(0, 64);

  const text = [
    `From: ${senderName}`,
    '',
    body,
    '',
    bookingRef ? `Booking Reference: ${bookingRef}` : null,
    `Sent via ${PLATFORM.NAME}`,
  ].filter((line) => line !== null).join('\n');

  const html = emailShell(
    subject || 'Message from your bus company',
    `You have received a new message from <strong>${escapeHtml(senderName)}</strong>.`,
    `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHtml(body)}</div>
     ${bookingRef ? `<div style="margin-top: 14px; font-size: 12px; color: #64748b;">Booking Reference: <strong>${escapeHtml(bookingRef)}</strong></div>` : ''}`
  );

  return sendRawEmail(to, subject || `Message from ${senderName}`, text, html, 'Staff message');
};

const sendTripNotification = async (to, booking = {}, updateMessage) => {
  const ctx = bookingContext(booking);
  const body = String(updateMessage || '').slice(0, 4000);

  const rows = [
    detailRow('Booking Reference', ctx.reference),
    ctx.origin && ctx.destination ? detailRow('Route', `${ctx.origin} → ${ctx.destination}`) : '',
    detailRow('Previous Departure', formatDateTime(ctx.departureDate) || ctx.departureTime),
    ctx.bus && detailRow('Bus', ctx.bus),
  ].join('');

  const text = [
    'Important Trip Update',
    '',
    `Hello ${ctx.passengerName},`,
    '',
    `Booking Reference: ${ctx.reference}`,
    `Previous Departure: ${formatDateTime(ctx.departureDate) || ctx.departureTime}`,
    '',
    body,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    'Important Trip Update',
    `Hello <strong>${escapeHtml(ctx.passengerName)}</strong>, there has been a change to your upcoming trip.`,
    `<table style="width: 100%; border-collapse: collapse; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; overflow: hidden;">${rows}</table>
     <div style="margin-top: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-wrap; overflow-wrap: anywhere;">${escapeHtml(body)}</div>`
  );

  return sendRawEmail(to, `${PLATFORM.NAME} - Trip Update (${ctx.reference})`, text, html, 'Trip notification');
};

const verifySmtpConnection = async () => {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn('[EMAIL] Email service connection failed - SMTP_HOST / SMTP_USER / SMTP_PASS are not fully configured in backend/.env.');
    return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    await transporter.verify();
    console.log('[EMAIL] Email service connected successfully.');
    return { ok: true };
  } catch (verifyErr) {
    console.error(`[EMAIL] Email service connection failed: ${verifyErr.message}`);
    return { ok: false, reason: verifyErr.code || 'VERIFY_FAILED' };
  }
};

const sendCompanyApprovedEmail = async (to, companyName) => {
  const recipient = normalizeRecipient(to);
  if (!recipient) return { sent: false, reason: 'INVALID_RECIPIENT' };

  const safeName = escapeHtml(String(companyName || 'Your Company'));

  const text = [
    `Congratulations! Your bus company "${companyName}" has been approved.`,
    '',
    'You can now log in to the Ethio Trip platform and start managing your buses, routes, and schedules.',
    '',
    `Login at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    '🎉 Company Approved!',
    `Congratulations! Your bus company <strong>${safeName}</strong> has been approved by the platform administrator.`,
    `<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:20px;text-align:center;margin:16px 0;">
       <div style="font-size:40px;margin-bottom:10px;">✅</div>
       <div style="font-size:16px;font-weight:800;color:#065f46;">${safeName}</div>
       <div style="font-size:13px;color:#059669;margin-top:4px;">Status: APPROVED & ACTIVE</div>
     </div>
     <p style="font-size:14px;color:#334155;line-height:1.7;">
       You can now <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color:#059669;font-weight:700;">log in to your Company Admin Dashboard</a>
       and begin setting up your routes, buses, schedules, and staff.
     </p>`,
    'If you did not register on our platform, please contact us immediately.'
  );

  return sendRawEmail(recipient, `${PLATFORM.NAME} - Company Registration Approved!`, text, html, 'Company approval email');
};

const sendCompanyRejectedEmail = async (to, companyName, reason = '') => {
  const recipient = normalizeRecipient(to);
  if (!recipient) return { sent: false, reason: 'INVALID_RECIPIENT' };

  const safeName = escapeHtml(String(companyName || 'Your Company'));
  const safeReason = escapeHtml(String(reason || 'Please contact support for details.'));

  const text = [
    `We regret to inform you that your bus company registration "${companyName}" has been rejected.`,
    '',
    reason ? `Reason: ${reason}` : 'Please contact support for more details.',
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    'Company Registration Update',
    `We have reviewed the registration for <strong>${safeName}</strong>.`,
    `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin:16px 0;">
       <div style="font-size:14px;font-weight:700;color:#b91c1c;margin-bottom:8px;">Registration Not Approved</div>
       ${reason ? `<p style="font-size:13px;color:#7f1d1d;margin:0;"><strong>Reason:</strong> ${safeReason}</p>` : '<p style="font-size:13px;color:#7f1d1d;margin:0;">Please contact our support team for more information.</p>'}
     </div>
     <p style="font-size:13px;color:#64748b;">If you believe this is an error, please reach out to our support team.</p>`,
    ''
  );

  return sendRawEmail(recipient, `${PLATFORM.NAME} - Company Registration Update`, text, html, 'Company rejection email');
};

const sendRefundPaymentMethodQuery = async (to, passengerName, refundAmount, companyName, bookingRef) => {
  const recipient = normalizeRecipient(to);
  if (!recipient) return { sent: false, reason: 'INVALID_RECIPIENT' };

  const safeName = escapeHtml(String(passengerName || 'Passenger'));
  const safeCompany = escapeHtml(String(companyName || PLATFORM.NAME));
  const safeRef = escapeHtml(String(bookingRef || ''));
  const amount = Number(refundAmount) || 0;

  const text = [
    `Hello ${passengerName},`,
    '',
    `Great news! Your refund request for booking ${bookingRef} has been APPROVED.`,
    `Refund Amount: ETB ${amount.toFixed(2)}`,
    '',
    'To process your refund, please reply to this email or contact us and let us know your preferred payment method:',
    '  1. Telebirr (provide your Telebirr number)',
    '  2. CBE Bank Transfer (provide your account number)',
    '  3. Other Bank Transfer (provide bank name and account number)',
    '',
    `Company: ${companyName}`,
    '',
    `Thank you, ${PLATFORM.NAME}`,
  ].join('\n');

  const html = emailShell(
    '✅ Refund Approved — Payment Method Required',
    `Hello <strong>${safeName}</strong>, your refund has been approved!`,
    `<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:12px 0;">
       <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
         <span style="font-size:13px;color:#64748b;">Booking Reference:</span>
         <strong style="font-size:13px;color:#0f172a;">${safeRef}</strong>
       </div>
       <div style="display:flex;justify-content:space-between;">
         <span style="font-size:13px;color:#64748b;">Refund Amount:</span>
         <strong style="font-size:15px;color:#059669;">ETB ${amount.toFixed(2)}</strong>
       </div>
     </div>
     <p style="font-size:14px;color:#334155;line-height:1.7;">
       To complete your refund, please <strong>reply to this email</strong> with your preferred payment method:
     </p>
     <ul style="font-size:13px;color:#334155;line-height:2;">
       <li>📱 <strong>Telebirr</strong> — provide your Telebirr phone number</li>
       <li>🏦 <strong>CBE Bank Transfer</strong> — provide your account number</li>
       <li>🏦 <strong>Other Bank Transfer</strong> — provide bank name &amp; account number</li>
     </ul>
     <p style="font-size:12px;color:#64748b;">Processed by: <strong>${safeCompany}</strong></p>`,
    'Please respond within 5 business days to claim your refund.'
  );

  return sendRawEmail(recipient, `${PLATFORM.NAME} - Refund Approved (${safeRef}) — Payment Method Required`, text, html, 'Refund payment method query');
};

module.exports = {
  createTransporter,
  sendOtpEmail,
  verifySmtpConnection,
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendTicketEmail,
  sendCancellationEmail,
  sendRefundEmail,
  sendStaffMessage,
  sendTripNotification,
  sendCompanyApprovedEmail,
  sendCompanyRejectedEmail,
  sendRefundPaymentMethodQuery,
  normalizeAddress,
  normalizeRecipient,
  buildFromAddress,
  escapeHtml,
};
