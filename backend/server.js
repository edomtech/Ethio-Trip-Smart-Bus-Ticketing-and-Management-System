const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(mongoSanitize());

// Global rate limiter: 1000 req/15 min
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', globalLimiter);

// Auth rate limiter: max 100 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/companies',         require('./routes/companies'));
app.use('/api/users',             require('./routes/users'));
app.use('/api/buses',             require('./routes/buses'));
app.use('/api/routes',            require('./routes/routes'));
app.use('/api/schedules',         require('./routes/schedules'));
app.use('/api/bookings',          require('./routes/bookings'));
app.use('/api/payments',          require('./routes/payments'));
app.use('/api/tickets',           require('./routes/tickets'));
app.use('/api/reviews',           require('./routes/reviews'));
app.use('/api/notifications',     require('./routes/notifications'));
app.use('/api/audit-logs',        require('./routes/auditLogs'));
app.use('/api/support',           require('./routes/support'));
app.use('/api/conductor-reports', require('./routes/conductorReports'));
app.use('/api/reports',           require('./routes/reports'));
app.use('/api/discounts',         require('./routes/discounts'));
app.use('/api/upload',            require('./routes/upload'));

// Health check endpoint
app.get('/', (req, res) =>
  res.json({
    message: 'Smart Bus Ticketing and Management API is running',
    version: '2.0.0',
    companies: 5,
    roles: ['super_admin', 'company_admin', 'agent', 'conductor', 'passenger'],
  })
);

// 404 handler
app.use((req, res) =>
  res.status(404).json({ message: `Route not found - ${req.originalUrl}` })
);

// Centralized error handler
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Disable timeout to prevent premature request drops (permanent uncrashable connections)
server.timeout = 0;
server.keepAliveTimeout = 0;

// Connect to MongoDB
connectDB().catch((err) =>
  console.error('❌ MongoDB initial connection error:', err?.message || err)
);

// ── Error & Lifecycle Handling ───────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
    console.error(`   Please close the other terminal or process using port ${PORT} before starting.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

// Nodemon restart signal handler (prevents EADDRINUSE during hot reloads)
process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err.message);
});
