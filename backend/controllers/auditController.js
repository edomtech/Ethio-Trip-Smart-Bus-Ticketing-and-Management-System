const auditService = require('../services/auditService');

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditService.getAuditLogs(req.user, req.query);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs,
};
