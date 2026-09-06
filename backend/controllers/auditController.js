const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs (Super Admin platform wide, Company Admin company scoped)
// @route   GET /api/audit-logs
// @access  Private (Super Admin, Company Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      const userCompanyId = req.user.companyId?._id || req.user.companyId;
      if (!userCompanyId) return res.status(403).json({ message: 'Access denied' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .populate('companyId', 'companyName logo')
      .sort('-createdAt')
      .limit(100);

    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs,
};
