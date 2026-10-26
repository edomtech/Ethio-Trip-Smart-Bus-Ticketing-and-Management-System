const mongoose = require('mongoose');
const { BOOKING_STATUS_LIST, PAYMENT_STATUS_LIST, BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/statuses');

const bookingSchema = new mongoose.Schema({
  companyId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  ticketNumber:       { type: String, unique: true, sparse: true, default: undefined },
  schedule:           { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' },  
  passenger:          {
    name:   { type: String, required: true },
    phone:  { type: String, required: true },
    email:  { type: String, required: true },
    gender: { type: String, default: 'Male' },
    age:    { type: String, default: '' },
  },
  user:               { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  selectedSeats:      [{ type: String }],
  totalPrice:         { type: Number, required: true },
  baseFare:           { type: Number, default: 0 },
  discountAmount:     { type: Number, default: 0 },
  discountCode:       { type: String, default: '' },
  tripType:           { type: String, enum: ['oneway', 'round'], default: 'oneway' },

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

  expiresAt:          { type: Date },

  status:             { 
    type: String, 
    enum: BOOKING_STATUS_LIST, 
    default: BOOKING_STATUS.PENDING_PAYMENT,
  },
  paymentStatus:      { 
    type: String, 
    enum: PAYMENT_STATUS_LIST, 
    default: PAYMENT_STATUS.PENDING,
  },

  paymentMethod:      { type: String, default: 'chapa' },
  receiptImage:       { type: String, default: '' },
  receiptUploadedAt:  { type: Date },
  receiptStatus:      { 
    type: String, 
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], 
    default: 'NONE',
  },
  receiptNote:        { type: String, default: '' },
  approvedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:         { type: Date },

  cancellationReason: { type: String, default: '' },
  cancelledAt:        { type: Date },
  refundAmount:       { type: Number, default: 0 },
  refundStatus:       { 
    type: String, 
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'REFUNDED'], 
    default: 'NONE',
  },
  refundReason:       { type: String, default: '' },
  refundDecision:     { 
    type: String, 
    enum: ['APPROVED', 'REJECTED'], 
    default: undefined,
  },
  refundDecidedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundDecidedAt:    { type: Date },
  refundProcessedAt:  { type: Date },

  bookingDate:        { type: Date, default: Date.now },
}, { timestamps: true });

bookingSchema.index({ companyId: 1, status: 1 });
bookingSchema.index({ user: 1, bookingDate: -1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

bookingSchema.pre('validate', function (next) {
  if (this.status) {
    const s = String(this.status).toUpperCase();
    if (s === 'PENDING') this.status = BOOKING_STATUS.PENDING_PAYMENT;
    else if (BOOKING_STATUS_LIST.includes(s)) this.status = s;
  }
  if (this.paymentStatus) {
    const ps = String(this.paymentStatus).toUpperCase();
    if (ps === 'COMPLETED') this.paymentStatus = PAYMENT_STATUS.PAID;
    else if (ps === 'UNPAID') this.paymentStatus = PAYMENT_STATUS.PENDING;
    else if (PAYMENT_STATUS_LIST.includes(ps)) this.paymentStatus = ps;
  }
  next();
});

bookingSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const crypto = require('crypto');
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.ticketNumber = `ETH-${ts}-${rand}`;
  }
  if (!this.expiresAt && this.status === BOOKING_STATUS.PENDING_PAYMENT) {
    const holdMinutes = parseInt(process.env.SEAT_HOLD_MINUTES || '60', 10);
    this.expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
