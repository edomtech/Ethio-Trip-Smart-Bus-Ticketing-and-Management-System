const conductorReportService = require('../services/conductorReportService');

const createReport = async (req, res, next) => {
  try {
    const report = await conductorReportService.createReport(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Conductor report filed successfully.',
      report,
    });
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await conductorReportService.getReports(req.user, req.query);
    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    next(err);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const report = await conductorReportService.resolveReport(req.params.id, resolutionNotes, req.user);
    res.json({ success: true, message: 'Report resolved successfully', report });
  } catch (err) {
    next(err);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const report = await conductorReportService.getReportById(req.params.id, req.user);
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

const updateReportStatus = async (req, res, next) => {
  try {
    const { resolutionNotes, status } = req.body;
    const report = await conductorReportService.resolveReport(req.params.id, resolutionNotes || status, req.user);
    res.json({ success: true, message: 'Report status updated', report });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  resolveReport,
  updateReportStatus,
};
