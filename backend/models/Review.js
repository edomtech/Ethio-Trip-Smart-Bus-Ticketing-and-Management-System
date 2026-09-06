const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    booking:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    categories: {
      overall:     { type: Number, default: 5 },
      comfort:     { type: Number, default: 5 },
      cleanliness: { type: Number, default: 5 },
      punctuality: { type: Number, default: 5 },
      staff:       { type: Number, default: 5 },
    },
    comment:   { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ companyId: 1 });
reviewSchema.index({ user: 1, booking: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
