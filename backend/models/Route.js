const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  from:     { type: String, required: true },
  to:       { type: String, required: true },
  distance: { type: Number, required: true },
  duration: { type: String, required: true },
  stops:    [{ type: String }],
  status:   { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
