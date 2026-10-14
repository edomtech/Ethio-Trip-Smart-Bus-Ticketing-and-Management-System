const reportService = require('../services/reportService');

const getOverviewReport = async (req, res, next) => {
  try {
    const metrics = await reportService.getOverviewMetrics(req.user);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
};

const getPublicReport = async (req, res, next) => {
  try {
    const stats = await reportService.getPublicStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverviewReport,
  getPublicReport,
};
