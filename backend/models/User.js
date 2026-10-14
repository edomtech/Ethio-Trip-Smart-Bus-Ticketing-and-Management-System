const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: '' },
  nationalId:{ type: String, default: '' },
  googleId:  { type: String, default: null },
  avatar:    { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  otpHash:   { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },
  resetPasswordOtpHash: { type: String, default: null },
  resetPasswordOtpExpiresAt: { type: Date, default: null },
  resetPasswordOtpAttempts: { type: Number, default: 0 },
  password:  { type: String, required: true, minlength: 8 },
  role: { 
    type: String, 
    enum: [
      'super_admin',
      'company_admin',
      'company_staff',
      'conductor',
      'passenger',
    ], 
    default: 'passenger' 
  },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  city:      { type: String, default: '' },
  preferredLanguage: { type: String, enum: ['en', 'am', 'om'], default: 'en' },
  isActive:  { type: Boolean, default: true },
  suspendedByPlatform: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('validate', function (next) {
  if (this.role === 'admin') {
    this.role = this.companyId ? 'company_admin' : 'super_admin';
  } else if (this.role === 'agent') {
    this.role = 'company_staff';
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!/^\$2[aby]\$/.test(this.password)) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
