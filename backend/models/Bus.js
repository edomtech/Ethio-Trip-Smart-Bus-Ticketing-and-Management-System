const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  busNumber:   { type: String, required: true },
  plateNumber: { type: String, default: '' },
  type:        { type: String, enum: ['Standard', 'Luxury', 'VIP'], default: 'Standard' },
  capacity:    { type: Number, required: true, min: 1 },
  amenities:   [{ type: String }],
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  status:      { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
}, { timestamps: true });

busSchema.index({ companyId: 1 });

module.exports = mongoose.model('Bus', busSchema);
