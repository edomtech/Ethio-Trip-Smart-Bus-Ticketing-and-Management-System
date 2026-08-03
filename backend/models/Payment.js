const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking:       { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount:        { type: Number, required: true },
  method:        { type: String, enum: ['Telebirr', 'CBE Birr', 'Chapa', 'Cash'], default: 'Telebirr' },
  status:        { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String, unique: true, sparse: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
