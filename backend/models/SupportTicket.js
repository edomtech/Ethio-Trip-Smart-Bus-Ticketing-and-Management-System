const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  passengerName:  { type: String, required: true },
  passengerPhone: { type: String, default: '' },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issueType:      { type: String, required: true },
  description:    { type: String, required: true },
  status:         { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  priority:       { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  agentNotes:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportSchema);
