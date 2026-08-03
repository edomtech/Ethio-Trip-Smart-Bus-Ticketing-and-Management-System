const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/buses',     require('./routes/buses'));
app.use('/api/routes',    require('./routes/routes'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/tickets',   require('./routes/tickets'));
app.use('/api/support',   require('./routes/support'));
app.use('/api/reports',   require('./routes/reports'));

app.get('/', (req, res) => res.json({ message: 'EthioBus API is running', version: '1.0.0' }));

// 404 Route handler
app.use((req, res) => res.status(404).json({ message: `Route not found - ${req.originalUrl}` }));

// Centralized error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 EthioBus server running on port ${PORT}`));
