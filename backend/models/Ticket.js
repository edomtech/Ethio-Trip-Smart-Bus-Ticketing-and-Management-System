const mongoose = require('mongoose');
const { TICKET_STATUS_LIST, TICKET_STATUS, BOARDING_STATUS_LIST, BOARDING_STATUS } = require('../constants/statuses');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
    },
    tripId: {
      type: String,
      default: '',
    },
    legType: {
      type: String,
      enum: ['oneway', 'outbound', 'return'],
      default: 'oneway',
    },
    passengerName: {
      type: String,
      required: true,
    },
    passengerPhone: {
      type: String,
      default: '',
    },
    passengerEmail: {
      type: String,
      default: '',
    },
    seatNumber: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    busCompany: {
      type: String,
      default: '',
    },
    companyName: {
      type: String,
      default: '',
    },
    route: {
      type: String,
      default: '',
    },
    from: {
      type: String,
      default: '',
    },
    to: {
      type: String,
      default: '',
    },
    travelDate: {
      type: String,
      default: '',
    },
    departureTime: {
      type: String,
      default: '',
    },
    qrCode: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: TICKET_STATUS_LIST,
      default: TICKET_STATUS.ACTIVE,
    },

    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'INVALID', 'REJECTED'],
      default: 'PENDING',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },

    boardingStatus: {
      type: String,
      enum: BOARDING_STATUS_LIST,
      default: BOARDING_STATUS.NOT_BOARDED,
    },
    boardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    boardedAt: {
      type: Date,
      default: null,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ticketSchema.index({ companyId: 1, ticketNumber: 1 });
ticketSchema.index({ booking: 1 });
ticketSchema.index({ user: 1 });
ticketSchema.index({ schedule: 1, boardingStatus: 1 });

ticketSchema.pre('validate', function (next) {
  if (this.status) {
    const s = String(this.status).toUpperCase();
    if (s === 'VALID') this.status = TICKET_STATUS.ACTIVE;
    else if (TICKET_STATUS_LIST.includes(s)) this.status = s;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
