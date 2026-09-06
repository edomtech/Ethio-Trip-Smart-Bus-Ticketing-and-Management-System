const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  from:     { type: String, required: true },
  to:       { type: String, required: true },
  distance: { type: Number, required: true },
  duration: { type: String, required: true },
  stops:    [{ type: String }],
  status:   { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

routeSchema.index({ companyId: 1, from: 1, to: 1 });

module.exports = mongoose.model('Route', routeSchema);
