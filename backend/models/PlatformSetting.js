const mongoose = require('mongoose');
const { shortName } = require('../constants/branding');

const platformSettingSchema = new mongoose.Schema(
  {
    systemName: {
      type: String,
      default: shortName(),
      trim: true,
    },
    supportEmail: {
      type: String,
      default: 'support@ethiotrip.et',
      trim: true,
      lowercase: true,
    },
    supportPhone: {
      type: String,
      default: '+251 911 002 233',
      trim: true,
    },
    systemAddress: {
      type: String,
      default: 'Addis Ababa, Ethiopia',
      trim: true,
    },
    commissionRate: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 60,
    },
    cities: {
      type: [String],
      default: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga', 'Arba Minch', 'Shashamane', 'Harar'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
