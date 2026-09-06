const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    code:          { type: String, required: true, uppercase: true, trim: true },
    name:          { type: String, required: true, trim: true },
    discountType:  { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, required: true, min: 0 },
    tripType:      { type: String, enum: ['all', 'round', 'oneway'], default: 'round' },
    route:         { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    minAmount:     { type: Number, default: 0 },
    startDate:     { type: Date, default: Date.now },
    endDate:       { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

discountSchema.index({ companyId: 1, code: 1 }, { unique: true });
discountSchema.index({ companyId: 1, isActive: 1, tripType: 1 });

module.exports = mongoose.model('Discount', discountSchema);
