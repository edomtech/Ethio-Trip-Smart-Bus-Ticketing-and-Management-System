const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    companyName:        { type: String, required: true, trim: true, unique: true },
    licenseNumber:      { type: String, required: true, unique: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    tinNumber:          { type: String, required: true, trim: true },
    phone:              { type: String, required: true, trim: true },
    email:              { type: String, required: true, trim: true, lowercase: true },
    address:            { type: String, required: true },
    city:               { type: String, required: true, default: 'Addis Ababa' },
    logo:               { type: String, default: '' },
    description:        { type: String, default: '' },
    status:             {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending',
    },
    cancellationPolicy: {
      allowed:          { type: Boolean, default: true },
      deadlineHours:    { type: Number, default: 24 },
      refundPercentage: { type: Number, default: 80 },
    },
    rating:             { type: Number, default: 4.8, min: 1, max: 5 },
    totalReviews:       { type: Number, default: 0 },
    // Reserved for future Live Mode Chapa subaccount
    chapaSubaccountId:  { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
