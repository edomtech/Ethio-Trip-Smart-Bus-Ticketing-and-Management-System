const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  tripId:         { type: String, unique: true },
  companyId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  bus:            { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  route:          { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  date:           { type: String, required: true },
  departureTime:  { type: String, required: true },
  arrivalTime:    { type: String, required: true },
  price:          { type: Number, required: true, min: 0 },
  availableSeats: { type: Number, required: true },
  bookedSeats:    [{ type: String }],
  assignedConductor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:         { type: String, enum: ['scheduled', 'departed', 'arrived', 'cancelled'], default: 'scheduled' },
}, { timestamps: true });

scheduleSchema.index({ companyId: 1, date: 1 });
scheduleSchema.index({ date: 1, status: 1 });
scheduleSchema.index({ assignedConductor: 1 });

scheduleSchema.pre('save', function (next) {
  if (!this.tripId) {
    const crypto = require('crypto');
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.tripId = `TRP-${ts}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Schedule', scheduleSchema);
