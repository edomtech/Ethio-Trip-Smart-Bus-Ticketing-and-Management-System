const ConductorReport = require('../models/ConductorReport');
const Schedule = require('../models/Schedule');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => (user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null);

// @desc    Conductor creates a new passenger/ticket problem report
// @route   POST /api/conductor-reports
// @access  Private (Conductor, Company Staff, Company Admin, Super Admin)
const createReport = async (req, res, next) => {
  try {
    const {
      scheduleId,
      tripId,
      busId,
      passengerId,
      passengerName,
      ticketId,
      ticketNumber,
      category,
      description,
    } = req.body;

    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required for the report.' });
    }

    let companyId = getCompId(req.user);
    let resolvedTripId = tripId || '';
    let resolvedBusId = busId || null;

    if (scheduleId) {
      const schedule = await Schedule.findById(scheduleId);
      if (schedule) {
        if (!companyId) companyId = schedule.companyId?.toString();
        if (!resolvedTripId) resolvedTripId = schedule.tripId || '';
        if (!resolvedBusId) resolvedBusId = schedule.bus || null;
      }
    }

    if (!companyId) {
      return res.status(400).json({ message: 'A valid company association is required to submit a report.' });
    }

    const report = await ConductorReport.create({
      companyId,
      conductorId: req.user._id,
      scheduleId: scheduleId || null,
      tripId: resolvedTripId,
      busId: resolvedBusId,
      passengerId: passengerId || null,
      passengerName: passengerName || '',
      ticketId: ticketId || null,
      ticketNumber: ticketNumber || '',
      category,
      description,
      status: 'OPEN',
    });

    // Notify Company Admins
    try {
      const companyAdmins = await User.find({
        companyId,
        role: { $in: ['company_admin', 'admin'] },
      });

      for (const admin of companyAdmins) {
        await Notification.create({
          user: admin._id,
          companyId,
          type: 'system',
          title: `New Conductor Report (${category})`,
          message: `Conductor ${req.user.name} reported an issue: "${description.slice(0, 80)}..."`,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch admin notifications:', notifErr.message);
    }

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'CONDUCTOR_REPORT_FILED',
      entityType: 'ConductorReport',
      entityId: report._id.toString(),
      details: { category, tripId: resolvedTripId, ticketNumber },
    });

    const populated = await ConductorReport.findById(report._id)
      .populate('conductorId', 'name email phone')
      .populate('companyId', 'companyName logo')
      .populate('scheduleId')
      .populate('busId', 'busNumber type');

    res.status(201).json({
      success: true,
      message: 'Problem report submitted to Company Admin successfully.',
      report: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get conductor reports (Scoped by company)
// @route   GET /api/conductor-reports
// @access  Private (Company Admin, Conductor, Super Admin)
const getReports = async (req, res, next) => {
  try {
    const query = {};

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'User is not assigned to a company.' });
      query.companyId = userCompanyId;

      // If user is a Conductor, show their own reports
      if (req.user.role === 'conductor') {
        query.conductorId = req.user._id;
      }
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }
    if (req.query.tripId) {
      query.tripId = req.query.tripId;
    }

    const reports = await ConductorReport.find(query)
      .populate('conductorId', 'name email phone')
      .populate('companyId', 'companyName logo')
      .populate('scheduleId')
      .populate('busId', 'busNumber type')
      .populate('resolvedBy', 'name email')
      .sort('-createdAt');

    res.json(reports);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single report by ID
// @route   GET /api/conductor-reports/:id
// @access  Private
const getReportById = async (req, res, next) => {
  try {
    const report = await ConductorReport.findById(req.params.id)
      .populate('conductorId', 'name email phone')
      .populate('companyId', 'companyName logo')
      .populate('scheduleId')
      .populate('busId', 'busNumber type')
      .populate('resolvedBy', 'name email');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const reportCompanyId = report.companyId?._id?.toString() || report.companyId?.toString();
      if (userCompanyId && reportCompanyId && userCompanyId !== reportCompanyId) {
        return res.status(403).json({ message: 'Access denied: Report belongs to another company.' });
      }
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
};

// @desc    Update conductor report status / resolution notes (Company Admin)
// @route   PUT /api/conductor-reports/:id/status
// @access  Private (Company Admin, Super Admin)
const updateReportStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body; // status: 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'
    const report = await ConductorReport.findById(req.params.id);

    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const reportCompanyId = report.companyId?.toString();
      if (userCompanyId && reportCompanyId && userCompanyId !== reportCompanyId) {
        return res.status(403).json({ message: 'Access denied to this company report.' });
      }
    }

    if (status) report.status = status.toUpperCase();
    if (resolutionNotes !== undefined) report.resolutionNotes = resolutionNotes;

    if (report.status === 'RESOLVED' || report.status === 'CLOSED') {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    }

    await report.save();

    // Notify Conductor of resolution
    if (report.conductorId) {
      await Notification.create({
        user: report.conductorId,
        companyId: report.companyId,
        type: 'system',
        title: `Report Status: ${report.status}`,
        message: `Your report for Trip ${report.tripId || 'Trip'} has been marked as ${report.status}. ${resolutionNotes ? `Notes: ${resolutionNotes}` : ''}`,
      });
    }

    const updated = await ConductorReport.findById(report._id)
      .populate('conductorId', 'name email phone')
      .populate('companyId', 'companyName logo')
      .populate('scheduleId')
      .populate('busId', 'busNumber type')
      .populate('resolvedBy', 'name email');

    res.json({
      success: true,
      message: `Report status updated to ${report.status}`,
      report: updated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
};
