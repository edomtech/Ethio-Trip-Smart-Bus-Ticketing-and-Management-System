const mongoose = require('mongoose');

let isConnected = false;
let reconnectTimer = null;
let connectPromise = null;

const scheduleReconnect = (uri, options) => {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      return;
    }
    if (mongoose.connection.readyState === 2) {
      return; // Connection attempt already in flight
    }
    try {
      console.log('🔄 Attempting MongoDB reconnection...');
      const conn = await mongoose.connect(uri, options);
      isConnected = true;
      console.log(`✅ MongoDB Connected successfully: ${mongoose.connection.host || 'host'} / Database: ${mongoose.connection.name || 'db'}`);
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      runIndexHygiene();
    } catch (retryErr) {
      console.warn(`⏳ MongoDB reconnection attempt failed: ${retryErr.message}. Retrying in 5s...`);
    }
  }, 5000);
};

const runIndexHygiene = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const bookingsColl = db.collection('bookings');
    const nulls = await bookingsColl.find({
      $or: [{ ticketNumber: null }, { ticketNumber: '' }]
    }).toArray();
    for (const b of nulls) {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(1000 + Math.random() * 9000);
      try {
        await bookingsColl.updateOne({ _id: b._id, ticketNumber: { $in: [null, ''] } }, { $set: { ticketNumber: `ETH-${ts}-${rand}` } });
      } catch (e) {
        // ignore
      }
    }
    const indexes = await bookingsColl.indexes().catch(() => []);
    const tktIdx = indexes.find(i => i.name === 'ticketNumber_1');
    if (tktIdx && !tktIdx.sparse) {
      try {
        await bookingsColl.dropIndex('ticketNumber_1');
      } catch (e) {
        // ignore
      }
      try {
        await bookingsColl.createIndex({ ticketNumber: 1 }, { unique: true, sparse: true });
      } catch (e) {
        // ignore
      }
    }
  } catch (hygieneErr) {
    console.warn('Notice: Booking index check:', hygieneErr.message);
  }
};

const sanitizeUri = (raw) => {
  if (!raw) return raw;
  let value = String(raw).trim();
  if (/^MONGODB_URI\s*=/i.test(value)) {
    value = value.replace(/^MONGODB_URI\s*=/i, '').trim();
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const uri = sanitizeUri(process.env.MONGODB_URI) || 'mongodb://127.0.0.1:27017/ethio_trip';
  const isAtlas = uri.startsWith('mongodb+srv://');

  const options = {
    autoIndex: true,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT_MS, 10) || (isAtlas ? 10000 : 5000),
  };

  if (!isAtlas) {
    options.family = 4;
  }

  mongoose.connection.removeAllListeners('connected');
  mongoose.connection.removeAllListeners('disconnected');
  mongoose.connection.removeAllListeners('reconnected');
  mongoose.connection.removeAllListeners('error');

  mongoose.connection.on('connected', () => {
    isConnected = true;
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️ MongoDB disconnected. Attempting reconnection in background...');
    scheduleReconnect(uri, options);
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('✅ MongoDB reconnected successfully.');
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('❌ MongoDB connection error event:', err.message);
  });

  connectPromise = (async () => {
    try {
      const conn = await mongoose.connect(uri, options);
      isConnected = true;
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host || 'host'} / Database: ${mongoose.connection.name || 'db'}`);
      runIndexHygiene();
      return conn;
    } catch (err) {
      isConnected = false;
      console.error(`❌ MongoDB Connection Error: ${err.message}`);
      if (
        err.message.includes('SSL routines') ||
        err.message.includes('tlsv1 alert internal error') ||
        err.name === 'MongooseServerSelectionError'
      ) {
        console.error('👉 TIP: If connecting to MongoDB Atlas, ensure your current IP address (or 0.0.0.0/0) is added to the Atlas Network Access IP Access List.');
      }
      scheduleReconnect(uri, options);
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

const getIsConnected = () => isConnected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;
