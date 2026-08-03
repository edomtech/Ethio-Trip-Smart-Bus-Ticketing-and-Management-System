const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  bus:            { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  route:          { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  date:           { type: String, required: true },
  departureTime:  { type: String, required: true },
  arrivalTime:    { type: String, required: true },
  price:          { type: Number, required: true, min: 0 },
  availableSeats: { type: Number, required: true },
  bookedSeats:    [{ type: String }],
  status:         { type: String, enum: ['scheduled', 'departed', 'arrived', 'cancelled'], default: 'scheduled' },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
