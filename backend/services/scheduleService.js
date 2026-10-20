const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Company = require('../models/Company');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && user.role === 'super_admin';
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

const getSchedules = async (user, queryParams = {}) => {
  const query = {};
  if (user && !isSuper(user) && user.role !== 'passenger') {
    const userCompanyId = getCompId(user);
    if (!userCompanyId) {
      const err = new Error('Access denied: your account is not assigned to any transport company');
      err.statusCode = 403;
      throw err;
    }
    query.companyId = userCompanyId;
  } else if (queryParams.companyId) {
    query.companyId = queryParams.companyId;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (!user || user.role === 'passenger') {
    query.date = { $gte: todayStr };
    query.status = { $ne: 'cancelled' };
  }

  const from = queryParams.from ? String(queryParams.from).trim() : '';
  const to = queryParams.to ? String(queryParams.to).trim() : '';
  const exactDate = queryParams.date ? String(queryParams.date).trim() : '';

  if (exactDate) {
    query.date = exactDate;
  }

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filters = [];
  if (from) filters.push({ 'route.from': { $regex: escapeRegex(from), $options: 'i' } });
  if (to) filters.push({ 'route.to': { $regex: escapeRegex(to), $options: 'i' } });
  if (filters.length > 0) query.$and = filters;

  return Schedule.find(query)
    .populate('bus')
    .populate('route')
    .populate('companyId', 'companyName logo rating cancellationPolicy phone email status')
    .populate('assignedConductor', 'name email phone')
    .sort('date');
};

const getMyAssignedSchedules = async (userOrId) => {
  const userId = userOrId?._id ? userOrId._id.toString() : userOrId ? userOrId.toString() : null;
  const userCompanyId = getCompId(userOrId);
  let schedules = [];

  if (userId) {
    const assignedQuery = userCompanyId
      ? { assignedConductor: userId, companyId: userCompanyId }
      : { assignedConductor: userId, companyId: null };

    schedules = await Schedule.find(assignedQuery)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .populate('assignedConductor', 'name email phone')
      .sort('date');
  }

  if ((!schedules || schedules.length === 0) && userCompanyId) {
    const todayStr = new Date().toISOString().split('T')[0];
    schedules = await Schedule.find({ companyId: userCompanyId, date: { $gte: todayStr } })
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .populate('assignedConductor', 'name email phone')
      .sort('date');
  }

  return schedules;
};

const searchSchedules = async (queryParams) => {
  const { from, to, date, companyId, busType, minPrice, maxPrice, sortBy } = queryParams;

  const todayStr = new Date().toISOString().split('T')[0];

  const activeCompanies = await Company.find({ status: 'active' }).select('_id');
  const activeCompanyIds = activeCompanies.map((c) => c._id);

  const filter = {
    companyId: { $in: activeCompanyIds },
    status: 'scheduled',
  };

  if (companyId) filter.companyId = { $in: activeCompanyIds.filter((id) => id.toString() === companyId.toString()) };
  if (date) {
    if (date < todayStr) {
      return [];  
    }
    filter.date = date;
  } else {
    filter.date = { $gte: todayStr };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let schedules = await Schedule.find(filter)
    .populate('bus')
    .populate('route')
    .populate('companyId', 'companyName logo rating cancellationPolicy phone email');

  if (from || to) {
    schedules = schedules.filter((s) => {
      const matchFrom = !from || (s.route?.from && s.route.from.toLowerCase().includes(from.toLowerCase()));
      const matchTo = !to || (s.route?.to && s.route.to.toLowerCase().includes(to.toLowerCase()));
      return matchFrom && matchTo;
    });
  }

  if (busType) {
    schedules = schedules.filter(
      (s) => s.bus && s.bus.busType && s.bus.busType.toLowerCase() === busType.toLowerCase()
    );
  }

  if (sortBy === 'price_asc') schedules.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') schedules.sort((a, b) => b.price - a.price);
  else if (sortBy === 'rating') schedules.sort((a, b) => (b.companyId?.rating || 0) - (a.companyId?.rating || 0));
  else schedules.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));

  return schedules;
};

const getScheduleById = async (scheduleId, user = null) => {
  const schedule = await Schedule.findById(scheduleId)
    .populate('bus')
    .populate('route')
    .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
    .populate('assignedConductor', 'name email phone');

  if (!schedule) {
    const err = new Error('Schedule not found');
    err.statusCode = 404;
    throw err;
  }

  redactScheduleForViewer(schedule, user);
  return schedule;
};


const redactScheduleForViewer = (schedule, user) => {
  if (isSuper(user)) return;
  if (user && user.role !== 'passenger') return;

  schedule.assignedConductor = undefined;

  const todayStr = new Date().toISOString().split('T')[0];
  const stillBookable = schedule.status === 'scheduled' && (!schedule.date || schedule.date >= todayStr);

  if (!stillBookable) {
    schedule.bookedSeats = [];
    schedule.availableSeats = undefined;
  }
};

const createSchedule = async (scheduleData, user) => {
  let companyId;
  if (isSuper(user)) {
    companyId = scheduleData.companyId;
  } else {
    companyId = getCompId(user);
  }

  if (!companyId) {
    const err = new Error('Company ID is required to create a schedule');
    err.statusCode = 400;
    throw err;
  }

  const {
    bus: busIdRaw,
    route: routeIdRaw,
    busId: busIdAlias,
    routeId: routeIdAlias,
    date,
    departureTime,
    arrivalTime,
    price,
    assignedConductor,
  } = scheduleData;

  const busId = busIdRaw || busIdAlias;
  const routeId = routeIdRaw || routeIdAlias;

  const todayStr = new Date().toISOString().split('T')[0];
  if (date && date < todayStr) {
    const err = new Error('Schedule travel date cannot be in the past');
    err.statusCode = 400;
    throw err;
  }

  const bus = busId ? await Bus.findOne({ _id: busId, companyId }) : null;
  if (!bus) {
    const err = new Error(busId ? 'Bus not found or does not belong to your company' : 'Please select a bus for this schedule');
    err.statusCode = busId ? 404 : 400;
    throw err;
  }

  const route = routeId ? await Route.findOne({ _id: routeId, companyId }) : null;
  if (!route) {
    const err = new Error(routeId ? 'Route not found or does not belong to your company' : 'Please select a route for this schedule');
    err.statusCode = routeId ? 404 : 400;
    throw err;
  }

  const rand = Math.floor(1000 + Math.random() * 9000);
  const tripId = `TRP-${rand}`;

  const schedule = await Schedule.create({
    tripId,
    companyId,
    bus: busId,
    route: routeId,
    date,
    departureTime,
    arrivalTime,
    price: Number(price),
    availableSeats: bus.capacity || 45,
    bookedSeats: [],
    assignedConductor: assignedConductor || null,
    status: 'scheduled',
  });

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId,
    action: 'SCHEDULE_CREATED',
    entityType: 'Schedule',
    entityId: schedule._id.toString(),
    details: { tripId, date, departureTime, price },
  }).catch(() => {});

  return getScheduleById(schedule._id);
};

const updateSchedule = async (scheduleId, updateData, user) => {
  const schedule = await getScheduleById(scheduleId);

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    const schCompanyId = schedule.companyId?._id ? schedule.companyId._id.toString() : schedule.companyId.toString();
    if (!userCompanyId || userCompanyId !== schCompanyId) {
      const err = new Error('Access denied: Schedule belongs to another company');
      err.statusCode = 403;
      throw err;
    }
  }

  delete updateData.companyId;
  delete updateData.bookedSeats;
  delete updateData.availableSeats;

  if (updateData.busId && !updateData.bus) updateData.bus = updateData.busId;
  if (updateData.routeId && !updateData.route) updateData.route = updateData.routeId;
  delete updateData.busId;
  delete updateData.routeId;
  delete updateData.tripId;

  const changingTripShape =
    (updateData.bus && updateData.bus.toString() !== String(schedule.bus?._id || schedule.bus)) ||
    (updateData.route && updateData.route.toString() !== String(schedule.route?._id || schedule.route));

  if (changingTripShape && (schedule.bookedSeats?.length || 0) > 0) {
    const err = new Error('Cannot change the bus or route of a trip that already has booked seats.');
    err.statusCode = 400;
    throw err;
  }

  const ownCompanyId = schedule.companyId?._id || schedule.companyId;
  for (const [field, Model] of [['bus', Bus], ['route', Route]]) {
    if (!updateData[field]) continue;
    const doc = await Model.findById(updateData[field]).select('companyId');
    if (!doc) {
      const err = new Error(`The selected ${field} does not exist`);
      err.statusCode = 404;
      throw err;
    }
    const docCompanyId = doc.companyId?._id || doc.companyId;
    if (ownCompanyId && String(docCompanyId) !== String(ownCompanyId)) {
      const err = new Error(`The selected ${field} does not belong to your company`);
      err.statusCode = 403;
      throw err;
    }
  }

  const sanitized = { ...updateData };
  if (typeof sanitized.price !== 'undefined') {
    const price = Number(sanitized.price);
    if (!Number.isFinite(price) || price < 0) {
      const err = new Error('Price must be a positive number');
      err.statusCode = 400;
      throw err;
    }
    sanitized.price = Math.round(price * 100) / 100;
  }

  Object.assign(schedule, sanitized);
  await schedule.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: schedule.companyId?._id || schedule.companyId,
    action: 'SCHEDULE_UPDATED',
    entityType: 'Schedule',
    entityId: schedule._id.toString(),
    details: sanitized,
  }).catch(() => {});

  return getScheduleById(schedule._id);
};

const deleteSchedule = async (scheduleId, user) => {
  const schedule = await getScheduleById(scheduleId);

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    const schCompanyId = schedule.companyId?._id ? schedule.companyId._id.toString() : schedule.companyId.toString();
    if (userCompanyId !== schCompanyId) {
      const err = new Error('Access denied: Schedule belongs to another company');
      err.statusCode = 403;
      throw err;
    }
  }

  if (schedule.bookedSeats && schedule.bookedSeats.length > 0) {
    const err = new Error('Cannot delete schedule with active booked passenger seats');
    err.statusCode = 400;
    throw err;
  }

  await Schedule.findByIdAndDelete(schedule._id);

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: schedule.companyId?._id || schedule.companyId,
    action: 'SCHEDULE_DELETED',
    entityType: 'Schedule',
    entityId: schedule._id.toString(),
    details: { tripId: schedule.tripId },
  }).catch(() => {});

  return { success: true, message: 'Schedule deleted successfully' };
};

module.exports = {
  getSchedules,
  getMyAssignedSchedules,
  searchSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
