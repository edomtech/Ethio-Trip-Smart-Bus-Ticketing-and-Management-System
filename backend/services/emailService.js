const nodemailer = require('nodemailer');
const dns = require('dns');
const https = require('https');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const path = require('path');
const dotenv = require('dotenv');
const { PLATFORM } = require('../constants/branding');

// Render free web services block outbound traffic to SMTP ports 25/465/587
// (policy effective 2025-09-26), so SMTP can never work there. When an HTTP
// email API is configured we deliver over HTTPS instead, which is not
// affected by that restriction.
const HTTP_EMAIL_PROVIDERS = Object.freeze({
  resend: {
    url: 'https://api.resend.com/emails',
    buildAuth: (key) => `Bearer ${key}`,
    buildBody: (from, to, subject, text, html) => ({
      from,
      to: [to],
      subject,
      text,
      html: html || text,
    }),
  },
  brevo: {
    url: 'https://api.brevo.com/v3/smtp/email',
    buildAuth: (key) => `api-key ${key}`,
    buildBody: (from, to, subject, text, html) => ({
      sender: parseSender(from),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html || text,
    }),
  },
  sendgrid: {
    url: 'https://api.sendgrid.com/v3/mail/send',
    buildAuth: (key) => `Bearer ${key}`,
    buildBody: (from, to, subject, text, html) => ({
      personalizations: [{ to: [{ email: to }] }],
      from: parseSender(from),
      subject,
      content: [
        { type: 'text/plain', value: text || '' },
        { type: 'text/html', value: html || text || '' },
      ],
    }),
  },
});

function parseSender(value) {
  const str = String(value || '');
  const match = str.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || PLATFORM.EMAIL_DISPLAY_NAME, email: match[2] };
  return { name: PLATFORM.EMAIL_DISPLAY_NAME, email: str };
}

const readHttpEmailConfig = () => {
  dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

  const explicit = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (explicit && !HTTP_EMAIL_PROVIDERS[explicit]) {
    console.warn(`[EmailService] Unknown EMAIL_PROVIDER "${explicit}", falling back to auto-detection.`);
  }
  const candidates = explicit && HTTP_EMAIL_PROVIDERS[explicit] ? [explicit] : ['resend', 'brevo', 'sendgrid'];

  for (const name of candidates) {
    const provider = HTTP_EMAIL_PROVIDERS[name];
    if (!provider) continue;
    const keyEnv = `${name.toUpperCase()}_API_KEY`;
    const key = (process.env[keyEnv] || '').trim();
    if (key) {
      return { name, key, ...provider };
    }
  }

  return null;
};

const postJson = (url, headers, body, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    let payload;
    try {
      payload = JSON.stringify(body);
    } catch (err) {
      reject(err);
      return;
    }

    const target = new URL(url);
    const req = https.request(
      {
        method: 'POST',
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
          } else {
            const err = new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`);
            err.code = `HTTP_${res.statusCode}`;
            reject(err);
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const err = new Error('HTTP email request timeout');
      err.code = 'ETIMEDOUT';
      reject(err);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

const sendViaHttpApi = async ({ from, to, subject, text, html }, cfg) => {
  const body = cfg.buildBody(from, to, subject, text, html);
  const res = await postJson(cfg.url, { Authorization: cfg.buildAuth(cfg.key) }, body);
  return { messageId: `${cfg.name}-http-${res.statusCode}`, provider: cfg.name };
};

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_SEED_IPV4S = ['142.250.110.108', '142.250.196.108'];
const gmailIpv4s = GMAIL_SEED_IPV4S.slice();
const GMAIL_CACHE_TTL_MS = 60 * 60 * 1000;
let gmailResolvedAt = 0;

const refreshGmailIpv4s = () => {
  const now = Date.now();
  if (now - gmailResolvedAt < GMAIL_CACHE_TTL_MS) return;
  gmailResolvedAt = now;
  try {
    dns.resolve4(GMAIL_HOST, (err, addrs) => {
      if (!err && Array.isArray(addrs) && addrs.length > 0) {
        gmailIpv4s.length = 0;
        addrs.forEach((addr) => {
          if (addr && !gmailIpv4s.includes(addr)) gmailIpv4s.push(addr);
        });
      }
    });
  } catch (e) {}
};
refreshGmailIpv4s();



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


const readSmtpConfig = () => {
  dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = normalizeAddress(process.env.SMTP_USER);
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const isGmail = host === GMAIL_HOST || (user && user.endsWith('@gmail.com'));

  return {
    host,
    port,
    user,
    pass,
    secure,
    isGmail: !!isGmail,
    configured: !!(user && pass),
  };
};

const buildGmailTransport = (cfg, target) =>
  nodemailer.createTransport({
    host: target || GMAIL_HOST,
    port: 587,
    secure: false,
    servername: GMAIL_HOST,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { servername: GMAIL_HOST, rejectUnauthorized: false },
  });

const buildDirectTransport = (cfg) =>
  nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    family: 4,
    lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });

const buildHostnameTransport = (cfg) =>
  nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });

const createTransporter = () => {
  const cfg = readSmtpConfig();

  if (!cfg.configured) {
    return null;
  }

  if (cfg.isGmail) {
    return buildGmailTransport(cfg, gmailIpv4s[0] || GMAIL_HOST);
  }

  if (!cfg.host) {
    return null;
  }

  return buildDirectTransport(cfg);
};

const FATAL_MAIL_CODES = ['EAUTH', 'EENVELOPE', 'EMISSINGAUTH', 'EINVALIDRECIPIENT'];

const createTransportCandidates = () => {
  const cfg = readSmtpConfig();
  if (!cfg.configured) return [];

  if (cfg.isGmail) {
    refreshGmailIpv4s();
    const targets = gmailIpv4s.slice(0, 4);
    if (!targets.includes(GMAIL_HOST)) targets.push(GMAIL_HOST);
    return targets.map((target) => buildGmailTransport(cfg, target));
  }

  if (!cfg.host) return [];
  return [buildDirectTransport(cfg), buildHostnameTransport(cfg)];
};

const sendMailResilient = async (mailOptions, logLabel) => {
  const httpCfg = readHttpEmailConfig();

  if (httpCfg) {
    const info = await sendViaHttpApi(
      {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      },
      httpCfg
    );
    return { configured: true, info, transport: 'http', provider: httpCfg.name, attempts: 1 };
  }

  const overridden =
    typeof module.exports.createTransporter === 'function' &&
    module.exports.createTransporter !== createTransporter;

  if (overridden) {
    const transporter = module.exports.createTransporter();
    if (!transporter) return { configured: false, reason: 'SMTP_NOT_CONFIGURED' };
    return { configured: true, info: await transporter.sendMail(mailOptions), attempts: 1 };
  }

  const candidates = createTransportCandidates();
  if (!candidates.length) return { configured: false, reason: 'SMTP_NOT_CONFIGURED' };

  let lastErr = null;
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const info = await candidates[i].sendMail(mailOptions);
      if (i > 0) console.warn(`[EMAIL] ${logLabel} delivered on fallback route #${i + 1}.`);
      return { configured: true, info, route: i, attempts: i + 1, transport: 'smtp' };
    } catch (err) {
      lastErr = err;
      if (i < candidates.length - 1) {
        console.warn(
          `[EMAIL] ${logLabel} route #${i + 1} failed (${err.code || err.message}). Retrying on next route.`
        );
      }
      if (FATAL_MAIL_CODES.includes(err.code)) {
        err.attempts = i + 1;
        throw err;
      }
    }
  }
  if (lastErr) lastErr.attempts = candidates.length;
  throw lastErr;
};

// Last send outcome, surfaced (without any secrets) via /health so SMTP
// problems can be diagnosed from the browser when platform logs are not
// available. Only the most recent attempt is kept.
let lastSend = null;

// /health is public, so never let addresses or credentials ride along.
const sanitizeErrorText = (value) =>
  String(value || '')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '<redacted-email>')
    .replace(/(pass(word)?|api[_-]?key|token|secret)["']?\s*[:=]\s*\S+/gi, '$1=<redacted>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

const recordSend = (fields) => {
  lastSend = { at: new Date().toISOString(), ...fields };
};

const getSmtpStatus = () => {
  const cfg = readSmtpConfig();
  const httpCfg = readHttpEmailConfig();
  return {
    configured: !!(httpCfg || cfg.configured),
    transport: httpCfg ? 'http' : cfg.configured ? 'smtp' : null,
    provider: httpCfg ? httpCfg.name : cfg.isGmail ? 'gmail' : cfg.host || null,
    host: httpCfg ? new URL(httpCfg.url).hostname : cfg.host || (cfg.isGmail ? GMAIL_HOST : null),
    port: httpCfg ? 443 : cfg.port,
    smtpBlockedOnFreeTier: !httpCfg && cfg.configured,
    lastSend: lastSend
      ? {
          at: lastSend.at,
          ok: lastSend.ok === true,
          event: lastSend.event || null,
          ...(lastSend.code ? { code: lastSend.code } : {}),
          ...(lastSend.error ? { error: sanitizeErrorText(lastSend.error) } : {}),
          ...(lastSend.attempts ? { attempts: lastSend.attempts } : {}),
        }
      : null,
  };
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

  const smtpUser = normalizeAddress(process.env.SMTP_USER);
  const fromAddress = buildFromAddress(smtpUser);
  const safeName = String(recipientName || 'Passenger').trim();

  const senderEmail = normalizeAddress(process.env.EMAIL_FROM) || smtpUser || PLATFORM.FALLBACK_SENDER;

  const plainText = `Hello ${safeName},\n\nThank you for registering with ${PLATFORM.NAME}.\n\nYour email verification code is:\n\n${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not request this verification code, you can ignore this email.\n\nThank you,\n${PLATFORM.NAME}`;

  const htmlContent = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; color: #1e293b;">
      <div style="font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px; margin-bottom: 16px;">
        ${PLATFORM.NAME.toUpperCase()}
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
    const result = await sendMailResilient(
      {
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
      },
      'OTP email'
    );

    if (!result.configured) {
      console.warn(`[EmailService] ⚠️ SMTP credentials not fully configured in environment. Delivery to ${recipient} cancelled.`);
      recordSend({ event: 'otp', ok: false, recipient, code: 'SMTP_NOT_CONFIGURED' });
      return {
        sent: false,
        reason: 'SMTP_NOT_CONFIGURED',
        message: 'SMTP credentials missing in environment (.env). Configure SMTP_USER and SMTP_PASS.',
      };
    }

    const info = result.info;
    console.log(`[EmailService] ✅ Mail server accepted the message for ${recipient}. MessageId: ${info.messageId} (acceptance is not a delivery guarantee — the mailbox must exist)`);
    recordSend({ event: 'otp', ok: true, messageId: info.messageId, attempts: result.attempts });
    return {
      sent: true,
      recipient,
      messageId: info.messageId,
    };
  } catch (sendErr) {
    console.error(`[EmailService] ❌ Failed to send verification code to ${recipient}:`, sendErr.message);
    recordSend({
      event: 'otp',
      ok: false,
      recipient,
      code: sendErr.code || 'SEND_FAILED',
      error: sendErr.message,
      attempts: sendErr.attempts,
    });
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

  const smtpUser = normalizeAddress(process.env.SMTP_USER);
  const senderEmail = normalizeAddress(process.env.EMAIL_FROM) || smtpUser || PLATFORM.FALLBACK_SENDER;
  const fromAddress = buildFromAddress(smtpUser);
  console.log(`[EmailService] Sender: ${senderEmail}`);
  console.log(`[EmailService] Recipient: ${recipient}`);

  try {
    const result = await sendMailResilient(
      {
        from: fromAddress,
        replyTo: smtpUser || fromAddress,
        to: recipient,
        subject: safeSubject,
        text,
        html,
      },
      logLabel
    );

    if (!result.configured) {
      console.error(`[EMAIL] ${logLabel} failed - SMTP is not configured in the backend .env (SMTP_USER / SMTP_PASS missing).`);
      recordSend({ event: logLabel, ok: false, code: 'SMTP_NOT_CONFIGURED' });
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const info = result.info;
    console.log(`[EMAIL] ${logLabel} sent to ${recipient} (messageId: ${info.messageId})`);
    recordSend({ event: logLabel, ok: true, messageId: info.messageId, attempts: result.attempts });
    return { sent: true, recipient, messageId: info.messageId };
  } catch (sendErr) {
    console.error(`[EMAIL] ${logLabel} failed for ${recipient}: ${sendErr.message}`);
    recordSend({
      event: logLabel,
      ok: false,
      code: sendErr.code || 'SEND_FAILED',
      error: sendErr.message,
      attempts: sendErr.attempts,
    });
    return { sent: false, recipient, reason: sendErr.code || 'SEND_FAILED' };
  }
};

const emailShell = (title, greeting, bodyHtml, footerNote = '') => `
  <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; color: #1e293b;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 22px 28px;">
      <div style="font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff;">${escapeHtml(PLATFORM.NAME.toUpperCase())}</div>
      ${PLATFORM.TAGLINE ? `<div style="font-size: 12px; color: #d1fae5; margin-top: 2px;">${escapeHtml(PLATFORM.TAGLINE)}</div>` : ''}
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

const bookingContext = (booking = {}) => {
  const schedule = booking.schedule || booking.outboundLeg?.schedule || {};
  const route = schedule.route || booking.route || booking.outboundLeg?.route || {};
  const bus = schedule.bus || booking.bus || booking.outboundLeg?.bus || {};

  const passengerName =
    booking.passenger?.name ||
    booking.passengerName ||
    booking.passengerDetails?.name ||
    (booking.user && booking.user.name) ||
    'Passenger';

  const company =
    (booking.companyId && (booking.companyId.companyName || booking.companyId.name)) ||
    booking.companyName ||
    (booking.company && (booking.company.companyName || booking.company.name)) ||
    (schedule.companyId && (schedule.companyId.companyName || schedule.companyId.name)) ||
    'Ethio Trip Express';

  const origin =
    route.from ||
    route.origin ||
    booking.origin ||
    booking.from ||
    booking.outboundLeg?.route?.from ||
    'Origin';

  const destination =
    route.to ||
    route.destination ||
    booking.destination ||
    booking.to ||
    booking.outboundLeg?.route?.to ||
    'Destination';

  const departureDate =
    booking.outboundLeg?.date ||
    schedule.date ||
    booking.departureDate ||
    booking.travelDate ||
    booking.date ||
    '';

  const departureTime =
    booking.outboundLeg?.departureTime ||
    schedule.departureTime ||
    booking.departureTime ||
    booking.time ||
    '';

  const arrivalTime =
    schedule.arrivalTime ||
    booking.outboundLeg?.arrivalTime ||
    booking.arrivalTime ||
    '';

  const busNumber =
    bus.busNumber ||
    bus.plateNumber ||
    booking.busPlate ||
    booking.busNumber ||
    'B001';

  const busType =
    bus.type ||
    bus.busType ||
    booking.busType ||
    'Luxury Coach';

  const seats = Array.isArray(booking.selectedSeats) && booking.selectedSeats.length
    ? booking.selectedSeats.join(', ')
    : Array.isArray(booking.seats)
      ? booking.seats.map((seat) => (seat && seat.number ? seat.number : seat)).filter(Boolean).join(', ')
      : (booking.seatNumber || booking.seats || '1');

  const passengerCount =
    booking.numberOfPassengers ||
    (Array.isArray(booking.selectedSeats) && booking.selectedSeats.length) ||
    (Array.isArray(booking.seats) && booking.seats.length) ||
    1;

  const totalAmount =
    booking.totalPrice !== undefined
      ? booking.totalPrice
      : (booking.totalAmount !== undefined ? booking.totalAmount : booking.amount);

  return {
    passengerName,
    reference: booking.ticketNumber || booking.bookingReference || booking.bookingRef || (booking._id ? String(booking._id) : ''),
    company,
    origin,
    destination,
    departureDate,
    departureTime,
    arrivalTime,
    bus: busNumber,
    busType,
    seats,
    passengerCount,
    totalAmount,
    paymentStatus: booking.paymentStatus || booking.payment?.status || 'PAID',
    ticketStatus: booking.ticketStatus || booking.status || 'CONFIRMED',
    tripType: booking.tripType === 'round' ? 'Round Trip' : 'One-Way Trip',
  };
};

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
  const seatNumber = ticket.seatNumber || ctx.seats || '1';

  const formattedDate = ctx.departureDate ? formatDateTime(ctx.departureDate) || ctx.departureDate : 'Upcoming';

  const qrVerificationData = [
    `TICKET: ${ticketNumber}`,
    `LEG: ${ctx.tripType.toUpperCase()}`,
    `PASSENGER: ${ctx.passengerName}`,
    `OPERATOR: ${ctx.company}`,
    `ROUTE: ${ctx.origin} -> ${ctx.destination}`,
    `BUS: ${ctx.busType} (${ctx.bus})`,
    `SEAT: ${seatNumber}`,
    `DATE: ${formattedDate}`,
    `TIME: ${ctx.departureTime}`,
    `FARE: ${formatAmount(ctx.totalAmount)} ETB`,
    `STATUS: ${(ctx.paymentStatus || 'PAID').toUpperCase()}`,
    `VERIFY: https://ethiotrip.com/verify?ticket=${ticketNumber}`
  ].join('\n');

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrVerificationData)}`;

  const ticketRowsHtml = [
    detailRow('Ticket No', ticketNumber),
    detailRow('Journey Leg', ctx.tripType),
    detailRow('Passenger Name', ctx.passengerName),
    detailRow('Bus Company', ctx.company),
    ctx.busType && detailRow('Bus Type', ctx.busType),
    ctx.bus && detailRow('Bus Number', ctx.bus),
    detailRow('Route', `${ctx.origin} → ${ctx.destination}`),
    detailRow('Date', formattedDate),
    detailRow('Departure Time', ctx.departureTime),
    ctx.arrivalTime && detailRow('Arrival Time', ctx.arrivalTime),
    detailRow('Seat No', seatNumber),
    detailRow('Total Fare', `${formatAmount(ctx.totalAmount)} ETB`),
    detailRow('Payment Status', 'PAID'),
  ].filter(Boolean).join('');

  const html = `
  <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 460px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); color: #0f172a;">
    <!-- Top accent stripes matching official ticket design -->
    <div style="height: 6px; background: #dc2626; width: 100%;"></div>
    <div style="height: 4px; background: #f59e0b; width: 100%;"></div>

    <!-- Header Section -->
    <div style="padding: 22px 24px 10px 24px; text-align: center;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #059669; text-transform: uppercase; margin-bottom: 4px;">OFFICIAL E-TICKET & BOARDING PASS</div>
      <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.3px;">ETHIO TRIP E-TICKET</h1>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Thank you for choosing <strong>${escapeHtml(ctx.company)}</strong>!</p>
    </div>

    <!-- Ticket Table Details -->
    <div style="padding: 10px 22px 16px 22px;">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        ${ticketRowsHtml}
      </table>
    </div>

    <!-- QR Code Verification Section -->
    <div style="padding: 0 22px 20px 22px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; text-align: center;">
        <div style="background: #ffffff; display: inline-block; padding: 10px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <img src="${qrImageUrl}" alt="Scan to Verify Ticket" width="160" height="160" style="display: block; margin: 0 auto; border-radius: 6px;" />
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 10px; letter-spacing: 0.5px;">
          SCAN TO VERIFY TICKET
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
          Show this QR code to the conductor upon boarding.
        </div>
      </div>
    </div>

    <!-- Safe Journey Footer Bar -->
    <div style="background: #064e3b; padding: 12px 22px; display: table; width: 100%; box-sizing: border-box;">
      <div style="display: table-cell; vertical-align: middle; font-size: 13px; font-weight: 800; color: #ffffff;">
        Safe Journey!
      </div>
      <div style="display: table-cell; vertical-align: middle; text-align: right; font-size: 12px; color: #a7f3d0; font-weight: 600;">
        www.ethiotrip.com
      </div>
    </div>
  </div>
  `;

  const text = [
    'ETHIO TRIP E-TICKET',
    `Thank you for choosing ${ctx.company}!`,
    '',
    `Ticket No: ${ticketNumber}`,
    `Journey Leg: ${ctx.tripType}`,
    `Passenger: ${ctx.passengerName}`,
    `Bus Company: ${ctx.company}`,
    `Bus: ${ctx.busType} (${ctx.bus})`,
    `Route: ${ctx.origin} -> ${ctx.destination}`,
    `Date: ${formattedDate}`,
    `Departure Time: ${ctx.departureTime}`,
    `Seat No: ${seatNumber}`,
    `Total Fare: ${formatAmount(ctx.totalAmount)} ETB`,
    `Payment Status: PAID`,
    '',
    'Show your QR code or Ticket No upon boarding.',
    'Safe Journey! - Ethio Trip (www.ethiotrip.com)',
  ].join('\n');

  return sendRawEmail(to, `${PLATFORM.NAME} - Your Bus Ticket (${ticketNumber})`, text, html, 'Ticket email');
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
  // If an HTTP email API (Resend, Brevo, SendGrid) is configured, skip the
  // SMTP connection test entirely -- SMTP ports are blocked on Render free tier
  // and the HTTP path works fine without any SMTP verification.
  const httpCfg = readHttpEmailConfig();
  if (httpCfg) {
    console.log(`[EMAIL] Email service ready -- using HTTP API provider: ` + httpCfg.name);
    return { ok: true, transport: 'http-api', provider: httpCfg.name };
  }

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
  getSmtpStatus,
  sendRawEmail,
  emailShell,
  detailRow,
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
