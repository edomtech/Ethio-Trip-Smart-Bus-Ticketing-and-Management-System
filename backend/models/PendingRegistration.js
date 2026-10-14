const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  nationalId: { type: String, default: '' },
  password: { type: String, required: true },
  city: { type: String, default: 'Addis Ababa' },
  otpHash: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 3600 }  
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);
