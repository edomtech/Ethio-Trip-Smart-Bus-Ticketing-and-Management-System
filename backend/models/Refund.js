const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  bookingId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  paymentId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  passengerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  txRef:              { type: String, required: true },
  amount:             { type: Number, required: true, min: 0 },
  reason:             { type: String, default: '' },
  leg:                { type: String, enum: ['all', 'outbound', 'return'], default: 'all' },
  status:             {
    type: String,
    enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'REFUNDED', 'REVERSED', 'REJECTED'],
    default: 'REQUESTED',
  },
  chapaRefundReference: { type: String, default: '' },
  adminNote:          { type: String, default: '' },
  requestedAt:        { type: Date, default: Date.now },
  processedAt:        { type: Date, default: null },
}, { timestamps: true });

refundSchema.index({ companyId: 1, status: 1 });
refundSchema.index({ bookingId: 1 });
refundSchema.index({ passengerId: 1 });

module.exports = mongoose.model('Refund', refundSchema);
