const AuditLog = require('../models/AuditLog');
const { buildCompanyFilter } = require('./tenantScope');

const logAction = async ({ user, companyId, action, entityType, entityId, details, ipAddress }) => {
  return AuditLog.create({
    user: user?._id || user,
    userEmail: user?.email || '',
    userRole: user?.role || 'passenger',
    companyId: companyId || user?.companyId,
    action,
    entityType,
    entityId: entityId ? String(entityId) : '',
    details: details || {},
    ipAddress: ipAddress || '',
  }).catch((err) => {
    console.error('[AuditService] Failed to record audit log:', err.message);
  });
};

const getAuditLogs = async (user, queryParams = {}) => {
  const query = buildCompanyFilter(
    user,
    queryParams,
    'Access denied: your account is not assigned to a transport company'
  );

  if (queryParams.action) query.action = queryParams.action;
  if (queryParams.entityType) query.entityType = queryParams.entityType;

  const requestedLimit = Number(queryParams.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 100;

  return AuditLog.find(query)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = {
  logAction,
  getAuditLogs,
};
