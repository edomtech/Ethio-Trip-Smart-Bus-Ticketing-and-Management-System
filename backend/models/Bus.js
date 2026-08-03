const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber:   { type: String, required: true, unique: true },
  plateNumber: { type: String, required: true, unique: true },
  type:        { type: String, enum: ['Standard', 'Luxury', 'VIP'], default: 'Standard' },
  capacity:    { type: Number, required: true, min: 1 },
  status:      { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);
