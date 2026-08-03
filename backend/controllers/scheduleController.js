const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');
const Route = require('../models/Route');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
  try {
    const schedules = await Schedule.find()
      .populate('bus')
      .populate('route')
      .sort('date');
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

// @desc    Search schedules by query filters
// @route   GET /api/schedules/search
// @access  Private
const searchSchedules = async (req, res, next) => {
  try {
    const { from, to, date } = req.query;
    const routeFilter = { status: 'active' };
    if (from) routeFilter.from = new RegExp(from, 'i');
    if (to) routeFilter.to = new RegExp(to, 'i');

    const matchingRoutes = await Route.find(routeFilter);
    const routeIds = matchingRoutes.map((r) => r._id);

    const query = { route: { $in: routeIds }, status: 'scheduled' };
    if (date) query.date = date;

    const schedules = await Schedule.find(query).populate('bus').populate('route');
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Private
const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('bus')
      .populate('route');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (err) {
    next(err);
  }
};

// @desc    Get seat map status for schedule
// @route   GET /api/schedules/:id/seats
// @access  Private
const getSeatMap = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate('bus');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json({
      capacity: schedule.bus.capacity,
      bookedSeats: schedule.bookedSeats || [],
      availableSeats: schedule.availableSeats,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create schedule
// @route   POST /api/schedules
// @access  Private/Admin
const createSchedule = async (req, res, next) => {
  try {
    const { busId, routeId, date, departureTime, arrivalTime, price } = req.body;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });

    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const schedule = await Schedule.create({
      bus: busId,
      route: routeId,
      date,
      departureTime,
      arrivalTime,
      price: Number(price),
      availableSeats: bus.capacity,
      bookedSeats: [],
      status: 'scheduled',
    });

    const populated = await Schedule.findById(schedule._id)
      .populate('bus')
      .populate('route');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('bus')
      .populate('route');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSchedules,
  searchSchedules,
  getScheduleById,
  getSeatMap,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
