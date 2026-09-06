const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail:  { type: String, default: '' },
    userRole:   { type: String, default: '' },
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName:{ type: String, default: '' },
    action:     { type: String, required: true },
    entityType: { type: String, required: true },
    entityId:   { type: String, default: '' },
    details:    { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress:  { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ companyId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
