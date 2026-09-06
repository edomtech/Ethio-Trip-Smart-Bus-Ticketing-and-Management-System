const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  companyId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  booking:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount:           { type: Number, required: true },
  currency:         { type: String, default: 'ETB' },
  paymentMethod:    { type: String, enum: ['Telebirr', 'CBE Birr', 'Chapa', 'Cash'], default: 'Chapa' },
  // Legacy field kept for backward compat
  method:           { type: String, enum: ['Telebirr', 'CBE Birr', 'Chapa', 'Cash'], default: 'Chapa' },
  txRef:            { type: String, sparse: true },
  transactionId:    { type: String, sparse: true },
  chapaReference:   { type: String, default: '' },
  status:           {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'pending', 'completed', 'failed', 'refunded'],
    default: 'PENDING',
  },
  paidAt:           { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ companyId: 1, status: 1 });
paymentSchema.index({ booking: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
