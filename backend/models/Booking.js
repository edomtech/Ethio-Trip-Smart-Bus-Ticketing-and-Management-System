const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  ticketNumber:  { type: String, unique: true },
  schedule:      { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  passenger:     {
    name:  { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  selectedSeats: [{ type: String }],
  totalPrice:    { type: Number, required: true },
  status:        { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  bookingDate:   { type: Date, default: Date.now },
}, { timestamps: true });

bookingSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    this.ticketNumber = `ETH-${ts}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
