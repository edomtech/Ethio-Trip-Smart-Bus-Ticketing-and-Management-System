const mongoose = require('mongoose');

const conductorReportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null,
    },
    tripId: {
      type: String,
      default: '',
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    passengerName: {
      type: String,
      default: '',
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
    },
    ticketNumber: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: [
        'Passenger problem',
        'Ticket problem',
        'Payment problem',
        'Seat mismatch',
        'Passenger information mismatch',
        'Invalid ticket',
        'Duplicate boarding',
        'Wrong trip',
        'Other issue',
      ],
      required: true,
      default: 'Passenger problem',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

conductorReportSchema.index({ companyId: 1, status: 1 });
conductorReportSchema.index({ conductorId: 1 });
conductorReportSchema.index({ scheduleId: 1 });

module.exports = mongoose.model('ConductorReport', conductorReportSchema);
