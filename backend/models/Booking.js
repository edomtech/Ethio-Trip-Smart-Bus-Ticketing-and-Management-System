const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  companyId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  ticketNumber:       { type: String, unique: true, sparse: true, default: undefined },
  schedule:           { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }, // Primary / Outbound schedule
  passenger:          {
    name:  { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  selectedSeats:      [{ type: String }],
  totalPrice:         { type: Number, required: true },
  baseFare:           { type: Number, default: 0 },
  discountAmount:     { type: Number, default: 0 },
  discountCode:       { type: String, default: '' },
  tripType:           { type: String, enum: ['oneway', 'round'], default: 'oneway' },
  
  // Structured Journey Legs for One-Way & Round-Trip bookings
  outboundLeg: {
    schedule:      { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' },
    bus:           { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    route:         { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    date:          { type: String },
    departureTime: { type: String },
    seats:         [{ type: String }],
    price:         { type: Number, default: 0 },
    status:        { type: String, default: 'CONFIRMED' },
  },
  returnLeg: {
    schedule:      { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' },
    bus:           { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    route:         { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    date:          { type: String },
    departureTime: { type: String },
    seats:         [{ type: String }],
    price:         { type: Number, default: 0 },
    status:        { type: String, default: 'CONFIRMED' },
  },

  // 5-Hour Payment Expiration Timestamp
  expiresAt:          { type: Date },

  // Status Fields
  status:             { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], 
    default: 'PENDING_PAYMENT' 
  },
  paymentStatus:      { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'], 
    default: 'PENDING' 
  },

  // Cancellation & Refund Management
  cancellationReason: { type: String, default: '' },
  cancelledAt:        { type: Date },
  refundAmount:       { type: Number, default: 0 },
  refundStatus:       { 
    type: String, 
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'], 
    default: 'NONE' 
  },
  refundReason:       { type: String, default: '' },
  refundProcessedAt:  { type: Date },

  bookingDate:        { type: Date, default: Date.now },
}, { timestamps: true });

bookingSchema.index({ companyId: 1, status: 1 });
bookingSchema.index({ user: 1, bookingDate: -1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

bookingSchema.pre('save', function (next) {
  const isPaidOrConfirmed =
    this.status === 'confirmed' ||
    this.status === 'CONFIRMED' ||
    this.status === 'completed' ||
    this.status === 'COMPLETED' ||
    this.paymentStatus === 'paid' ||
    this.paymentStatus === 'PAID';

  if (isPaidOrConfirmed && !this.ticketNumber) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    this.ticketNumber = `ETH-${ts}-${rand}`;
  }
  // Auto calculate 5 hours expiration if not set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
