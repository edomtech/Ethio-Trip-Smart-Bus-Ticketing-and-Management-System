const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
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

    // Ticket Lifecycle Status
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'valid', 'used', 'cancelled'],
      default: 'ACTIVE',
    },

    // Agent Verification Status (Handled formally by Ticket Agent)
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

    // Boarding Status (Handled by Conductor during passenger boarding)
    boardingStatus: {
      type: String,
      enum: ['NOT_BOARDED', 'BOARDED'],
      default: 'NOT_BOARDED',
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
ticketSchema.index({ schedule: 1, verificationStatus: 1 });
ticketSchema.index({ schedule: 1, boardingStatus: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
