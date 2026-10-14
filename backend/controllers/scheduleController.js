const scheduleService = require('../services/scheduleService');

const getSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.getSchedules(req.user, req.query);
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

const getMyAssignedSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.getMyAssignedSchedules(req.user);
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

const searchSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.searchSchedules(req.query);
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id, req.user);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
};

const createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body, req.user);
    res.status(201).json({ success: true, schedule });
  } catch (err) {
    next(err);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body, req.user);
    res.json({ success: true, schedule });
  } catch (err) {
    next(err);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.deleteSchedule(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSeatMap = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id, req.user);
    const capacity = schedule.bus?.capacity || 45;
    res.json({
      scheduleId: schedule._id,
      capacity,
      bookedSeats: schedule.bookedSeats || [],
      availableSeats: schedule.availableSeats ?? capacity - (schedule.bookedSeats?.length || 0),
    });
  } catch (err) {
    next(err);
  }
};

const assignConductor = async (req, res, next) => {
  try {
    const { conductorId } = req.body;
    const schedule = await scheduleService.updateSchedule(req.params.id, { assignedConductor: conductorId }, req.user);
    res.json({ success: true, message: 'Conductor assigned successfully', schedule });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSchedules,
  getMyAssignedSchedules,
  searchSchedules,
  getScheduleById,
  getSeatMap,
  createSchedule,
  updateSchedule,
  assignConductor,
  deleteSchedule,
};
