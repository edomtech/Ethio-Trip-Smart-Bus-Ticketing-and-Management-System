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
    busImage:           { type: String, default: '' },
    description:        { type: String, default: '' },
    status:             {
      type: String,
      enum: ['active', 'suspended', 'pending', 'rejected'],
      default: 'active',
    },
    cancellationPolicy: {
      allowed:          { type: Boolean, default: true },
      deadlineHours:    { type: Number, default: 24 },
      refundPercentage: { type: Number, default: 80 },
    },
    rating:             { type: Number, default: 4.8, min: 1, max: 5 },
    totalReviews:       { type: Number, default: 0 },
    paymentMethods: {
      telebirr: {
        enabled:       { type: Boolean, default: true },
        accountNumber: { type: String, default: '' },
      },
      cbe: {
        enabled:       { type: Boolean, default: true },
        accountNumber: { type: String, default: '' },
      },
      chapa: {
        enabled:       { type: Boolean, default: true },
        accountNumber: { type: String, default: '' },
      },
    },
    chapaSubaccountId:  { type: String, default: null },
    payment: {
      provider:     { type: String, default: 'CHAPA' },
      subaccountId: { type: String, default: null },
      splitType:    { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
      splitValue:   { type: Number, default: 90 },
      enabled:      { type: Boolean, default: true },
      mode:         { type: String, enum: ['TEST', 'LIVE'], default: 'LIVE' },
    },
  },
  { timestamps: true }
);

companySchema.pre('save', function (next) {
  if (this.chapaSubaccountId && (!this.payment || !this.payment.subaccountId)) {
    if (!this.payment) this.payment = {};
    this.payment.subaccountId = this.chapaSubaccountId;
  } else if (this.payment?.subaccountId && !this.chapaSubaccountId) {
    this.chapaSubaccountId = this.payment.subaccountId;
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);
