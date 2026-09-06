const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderName: {
      type: String,
      required: true,
      default: 'User',
    },
    senderRole: {
      type: String,
      enum: ['passenger', 'agent', 'company_staff', 'company_admin', 'super_admin', 'admin', 'conductor', 'system'],
      default: 'passenger',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    passengerName: {
      type: String,
      required: true,
    },
    passengerEmail: {
      type: String,
      default: '',
    },
    passengerPhone: {
      type: String,
      default: '',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    ticketNumber: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      required: true,
      default: 'General Support Request',
    },
    category: {
      type: String,
      enum: [
        'Booking Assistance',
        'Ticket Query',
        'Chapa Payment',
        'Cancellation & Refund',
        'Schedule / Route Query',
        'Luggage / Lost Item',
        'General Inquiry',
      ],
      default: 'General Inquiry',
    },
    issueType: {
      type: String,
      default: 'General Inquiry',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED', 'open', 'in-progress', 'resolved', 'closed'],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    agentNotes: {
      type: String,
      default: '',
    },
    feedbackResponse: {
      type: String,
      default: '',
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

supportSchema.index({ companyId: 1, status: 1 });
supportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportSchema);
