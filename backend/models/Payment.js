const mongoose = require('mongoose');
const { PAYMENT_STATUS_LIST, PAYMENT_STATUS } = require('../constants/statuses');

const paymentSchema = new mongoose.Schema({
  companyId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  company:          { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  booking:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  passenger:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount:           { type: Number, required: true },
  platformCommission: { type: Number, default: 0 },
  companyAmount:    { type: Number, default: 0 },
  splitType:        { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
  splitValue:       { type: Number, default: 90 },
  currency:         { type: String, default: 'ETB' },
  paymentMethod:    { type: String, default: 'Chapa' },
  method:           { type: String, default: 'Chapa' },
  txRef:            { type: String, sparse: true, index: true },
  chapaTxRef:       { type: String, sparse: true, index: true },
  chapaSubaccountId:{ type: String, default: null },
  transactionId:    { type: String, sparse: true },
  chapaReference:   { type: String, default: '' },
  transactionReference: { type: String, sparse: true, index: true },
  receiptImage:     { type: String, default: '' },
  receiptNote:      { type: String, default: '' },
  expectedAmount:   { type: Number, default: 0 },
  submittedAmount:  { type: Number, default: 0 },
  verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason:  { type: String, default: '' },
  history: [
    {
      action: { type: String },
      fromStatus: { type: String },
      toStatus: { type: String },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      actorRole: { type: String },
      note: { type: String },
      timestamp: { type: Date, default: Date.now },
    }
  ],
  status:           {
    type: String,
    enum: PAYMENT_STATUS_LIST,
    default: PAYMENT_STATUS.PENDING,
  },
  mode:             { type: String, enum: ['TEST', 'LIVE'], default: 'TEST' },
  paidAt:           { type: Date, default: null },
  verifiedAt:       { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ companyId: 1, status: 1 });
paymentSchema.index({ company: 1, status: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ passenger: 1, createdAt: -1 });


paymentSchema.pre('validate', function (next) {
  if (this.status) {
    const s = String(this.status).toUpperCase();
    if (s === 'COMPLETED') this.status = PAYMENT_STATUS.PAID;
    else if (PAYMENT_STATUS_LIST.includes(s)) this.status = s;
  }
  if (!this.method && this.paymentMethod) this.method = this.paymentMethod;
  if (!this.paymentMethod && this.method) this.paymentMethod = this.method;

  if (this.company && !this.companyId) this.companyId = this.company;
  if (this.companyId && !this.company) this.company = this.companyId;

  if (this.passenger && !this.user) this.user = this.passenger;
  if (this.user && !this.passenger) this.passenger = this.user;

  if (this.chapaTxRef && !this.txRef) this.txRef = this.chapaTxRef;
  if (this.txRef && !this.chapaTxRef) this.chapaTxRef = this.txRef;

  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
