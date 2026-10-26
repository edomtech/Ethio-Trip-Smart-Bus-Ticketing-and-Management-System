const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { getIsConnected } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { CANONICAL_ROLES } = require('./constants/roles');
const { PLATFORM, fullName } = require('./constants/branding');
const emailService = require('./services/emailService');
const { getConfiguredFrontendUrls } = require('./config/frontend');

dotenv.config();

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
  console.error('❌ FATAL: JWT_SECRET environment variable is missing or empty.');
  console.error('   Please define a strong JWT_SECRET in backend/.env before running the service.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust exactly 1 reverse proxy (e.g. Render, Heroku, Nginx).
// Using `true` is too permissive and triggers ERR_ERL_PERMISSIVE_TRUST_PROXY
// from express-rate-limit because it allows clients to spoof X-Forwarded-For.
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  ...getConfiguredFrontendUrls(),
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

const normalizeOrigin = (val) => String(val || '').trim().toLowerCase().replace(/\/+$/, '');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleaned = normalizeOrigin(origin);
    const isAllowed =
      allowedOrigins.some((ao) => normalizeOrigin(ao) === cleaned) ||
      cleaned.endsWith('.vercel.app') ||
      cleaned.endsWith('.onrender.com') ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Ensure active database connection across warm/cold serverless invocations
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (e) {
      console.warn('⚠️ Serverless DB connection check failed:', e.message);
    }
  }
  next();
});

app.use('/api/payments', require('./routes/chapaWebhook'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(mongoSanitize());


const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification code requests. Please try again later.' },
});
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/verify-email', otpLimiter);

const healthHandler = (req, res) => {
  const dbConnected = getIsConnected();
  let email;
  try {
    email = emailService.getSmtpStatus();
  } catch (e) {
    email = { configured: false, provider: null, host: null, port: null };
  }
  return res.status(200).json({
    status: dbConnected ? 'healthy' : 'degraded',
    service: fullName(),
    version: '2.0.0',
    ready: true,
    database: dbConnected ? 'connected' : 'disconnected',
    email,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    roles: CANONICAL_ROLES,
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/', (req, res) =>
  res.json({
    message: `${PLATFORM.NAME} API is running`,
    service: fullName(),
    version: '2.0.0',
    status: 'healthy',
    roles: CANONICAL_ROLES,
  })
);

app.use('/api/auth',              require('./routes/auth'));
app.use('/api/companies',         require('./routes/companies'));
app.use('/api/users',             require('./routes/users'));
app.use('/api/buses',             require('./routes/buses'));
app.use('/api/routes',            require('./routes/routes'));
app.use('/api/schedules',         require('./routes/schedules'));
app.use('/api/bookings',          require('./routes/bookings'));
app.use('/api/payments',          require('./routes/paymentRoutes'));
app.use('/api/tickets',           require('./routes/tickets'));
app.use('/api/reviews',           require('./routes/reviews'));
app.use('/api/notifications',     require('./routes/notifications'));
app.use('/api/audit-logs',        require('./routes/auditLogs'));
app.use('/api/support',           require('./routes/support'));
app.use('/api/conductor-reports', require('./routes/conductorReports'));
app.use('/api/reports',           require('./routes/reports'));
app.use('/api/discounts',         require('./routes/discounts'));
app.use('/api/upload',            require('./routes/upload'));
app.use('/api/ai',                require('./routes/aiRoutes'));
app.use('/api/platform-settings', require('./routes/platformSettings'));

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route not found - ${req.originalUrl}` })
);

app.use(errorHandler);

let server = null;

const startServer = async () => {
  try {
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn('⚠️ MongoDB not immediately reachable. Server starting; reconnecting in background:', dbErr.message);
    }

    // Diagnostic: print which email env vars are present (not their values)
    console.log('[EMAIL CONFIG] EMAIL_PROVIDER=' + (process.env.EMAIL_PROVIDER || '(not set)'));
    console.log('[EMAIL CONFIG] RESEND_API_KEY=' + (process.env.RESEND_API_KEY ? '(set)' : '(NOT SET)'));
    console.log('[EMAIL CONFIG] EMAIL_FROM=' + (process.env.EMAIL_FROM || '(not set)'));

    require('./services/emailService')
      .verifySmtpConnection()
      .catch(() => {});

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [Ready for traffic]`);
    });

    server.timeout = 30000;
    server.keepAliveTimeout = 65000;

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`   Please close the other terminal or process using port ${PORT} before starting.`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('🔒 HTTP server closed.');
      try {
        await mongoose.connection.close(false);
        console.log('🔒 MongoDB connection closed.');
      } catch (dbErr) {
        console.error('Error closing MongoDB connection:', dbErr.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.once('SIGUSR2', () => {
  if (server) {
    server.close(() => process.kill(process.pid, 'SIGUSR2'));
  }
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err.message);
  shutdown('UNCAUGHT_EXCEPTION');
});

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
