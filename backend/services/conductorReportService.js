const ConductorReport = require('../models/ConductorReport');
const Schedule = require('../models/Schedule');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  isSuperAdmin: isSuper,
  getCompanyId: getCompId,
  assertSameCompany,
  buildCompanyFilter,
} = require('./tenantScope');

const createReport = async (reportData, user) => {
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
  } = reportData;

  if (!category || !description) {
    const err = new Error('Category and description are required for the report');
    err.statusCode = 400;
    throw err;
  }

  let companyId = getCompId(user);
  let resolvedTripId = tripId || '';
  let resolvedBusId = busId || null;

  if (scheduleId) {
    const schedule = await Schedule.findById(scheduleId);
    if (schedule) {
      if (companyId && companyId !== schedule.companyId?.toString()) {
        const err = new Error('Access denied: this trip belongs to another company');
        err.statusCode = 403;
        throw err;
      }
      if (!companyId) companyId = schedule.companyId?.toString();
      if (!resolvedTripId) resolvedTripId = schedule.tripId || '';
      if (!resolvedBusId) resolvedBusId = schedule.bus || null;
    }
  }

  if (!companyId) {
    const err = new Error('A valid company association is required to submit a report');
    err.statusCode = 400;
    throw err;
  }

  const report = await ConductorReport.create({
    companyId,
    conductorId: user._id,
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

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId,
    action: 'CONDUCTOR_REPORT_SUBMITTED',
    entityType: 'ConductorReport',
    entityId: report._id.toString(),
    details: { category, tripId: resolvedTripId, ticketNumber },
  }).catch(() => {});

  return ConductorReport.findById(report._id)
    .populate('conductorId', 'name email phone')
    .populate('scheduleId')
    .populate('busId')
    .populate('companyId', 'companyName');
};

const getReports = async (user, queryParams = {}) => {
  const query = buildCompanyFilter(
    user,
    queryParams,
    'Access denied: your account is not assigned to a transport company'
  );

  if (user.role === 'conductor') {
    query.conductorId = user._id;
  }

  if (queryParams.status) query.status = queryParams.status;
  if (queryParams.category) query.category = queryParams.category;

  return ConductorReport.find(query)
    .populate('conductorId', 'name email phone')
    .populate({ path: 'scheduleId', populate: ['route', 'bus'] })
    .populate('busId', 'busNumber plateNumber')
    .populate('companyId', 'companyName')
    .populate('resolvedBy', 'name email')
    .sort({ createdAt: -1 });
};

const resolveReport = async (reportId, resolutionNotes, user) => {
  const report = await ConductorReport.findById(reportId);
  if (!report) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }

  assertSameCompany(user, report.companyId, 'report');

  report.status = 'RESOLVED';
  report.resolutionNotes = resolutionNotes || '';
  report.resolvedBy = user._id;
  report.resolvedAt = new Date();
  await report.save();

  return report;
};

const getReportById = async (reportId, user) => {
  const report = await ConductorReport.findById(reportId)
    .populate('conductorId', 'name email phone')
    .populate({ path: 'scheduleId', populate: ['route', 'bus'] })
    .populate('busId', 'busNumber plateNumber')
    .populate('companyId', 'companyName')
    .populate('resolvedBy', 'name email');

  if (!report) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }

  assertSameCompany(user, report.companyId, 'report');

  return report;
};

module.exports = {
  createReport,
  getReports,
  getReportById,
  resolveReport,
};
