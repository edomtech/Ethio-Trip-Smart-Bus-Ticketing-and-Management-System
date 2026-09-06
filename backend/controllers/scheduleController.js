const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Company = require('../models/Company');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// @desc    Get all schedules (Scoped by company unless Super Admin)
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
  try {
    const query = {};
    if (req.user && !isSuper(req.user) && req.user.role !== 'passenger') {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId) query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const schedules = await Schedule.find(query)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email status')
      .populate('assignedConductor', 'name email phone')
      .sort('date');
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

// @desc    Get schedules assigned to logged-in Conductor
// @route   GET /api/schedules/my-assigned
// @access  Private (Conductor)
const getMyAssignedSchedules = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ assignedConductor: req.user._id })
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .sort('date');
    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

// @desc    Multi-Company Passenger Schedule Search across all ACTIVE companies
// @route   GET /api/schedules/search
// @access  Public
const searchSchedules = async (req, res, next) => {
  try {
    const { from, to, date, companyId, busType, minPrice, maxPrice, sortBy } = req.query;

    // Multi-company search: allow all registered companies that are not suspended or rejected
    const activeCompanies = await Company.find({ status: { $nin: ['suspended', 'rejected'] } }).select('_id');
    const activeCompanyIds = activeCompanies.map((c) => c._id);

    if (activeCompanyIds.length === 0) {
      return res.json([]);
    }

    const routeFilter = { status: { $ne: 'inactive' } };
    if (from && from.trim()) routeFilter.from = new RegExp(from.trim(), 'i');
    if (to && to.trim()) routeFilter.to = new RegExp(to.trim(), 'i');

    const matchingRoutes = await Route.find(routeFilter);
    const routeIds = matchingRoutes.map((r) => r._id);

    const query = {
      route: { $in: routeIds },
      companyId: { $in: activeCompanyIds },
      status: { $in: ['scheduled', 'active'] },
    };

    if (companyId) {
      query.companyId = companyId;
    }

    if (date) {
      query.date = date.trim();
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = { date: 1, departureTime: 1 };
    if (sortBy === 'price_asc') sortOption = { price: 1 };
    if (sortBy === 'price_desc') sortOption = { price: -1 };

    let schedules = await Schedule.find(query)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email status')
      .populate('assignedConductor', 'name email phone')
      .sort(sortOption);

    if (busType) {
      schedules = schedules.filter((s) => s.bus && s.bus.type === busType);
    }

    res.json(schedules);
  } catch (err) {
    next(err);
  }
};

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Public / Private
const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email status')
      .populate('assignedConductor', 'name email phone');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (err) {
    next(err);
  }
};

// @desc    Create schedule
// @route   POST /api/schedules
// @access  Private (Company Admin, Super Admin)
const createSchedule = async (req, res, next) => {
  try {
    let companyId;
    if (isSuper(req.user)) {
      companyId = req.body.companyId || getCompId(req.user);
      if (!companyId) return res.status(400).json({ message: 'Company ID is required for Super Admin' });
    } else {
      companyId = getCompId(req.user);
    }

    if (!companyId) return res.status(400).json({ message: 'Valid company ID is required to create a schedule' });

    const busId = req.body.bus || req.body.busId;
    const routeId = req.body.route || req.body.routeId;
    const { date, departureTime, arrivalTime, price, assignedConductor, tripId } = req.body;

    if (!busId) return res.status(400).json({ message: 'Please select a bus from your fleet' });
    if (!routeId) return res.status(400).json({ message: 'Please select a route' });
    if (!date) return res.status(400).json({ message: 'Departure date is required' });
    if (!departureTime) return res.status(400).json({ message: 'Departure time is required' });
    if (!price || Number(price) <= 0) return res.status(400).json({ message: 'Valid ticket price is required' });

    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found in fleet' });

    if (bus.companyId && bus.companyId.toString() !== companyId.toString() && !isSuper(req.user)) {
      return res.status(403).json({ message: 'Selected bus belongs to another company' });
    }

    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    if (route.companyId && route.companyId.toString() !== companyId.toString() && !isSuper(req.user)) {
      return res.status(403).json({ message: 'Selected route belongs to another company' });
    }

    const generatedTripId = tripId || `TRP-${Math.floor(1000 + Math.random() * 9000)}`;

    const schedule = await Schedule.create({
      tripId: generatedTripId,
      companyId,
      bus: busId,
      route: routeId,
      date,
      departureTime,
      arrivalTime: arrivalTime || 'N/A',
      price: Number(price),
      availableSeats: bus.capacity || 45,
      assignedConductor: assignedConductor || null,
      status: 'scheduled',
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'SCHEDULE_CREATED',
      entityType: 'Schedule',
      entityId: schedule._id.toString(),
      details: { tripId: generatedTripId, date, departureTime, price: Number(price), busNumber: bus.busNumber },
    });

    const populated = await Schedule.findById(schedule._id)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .populate('assignedConductor', 'name email phone');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private (Company Admin, Super Admin)
const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== schedule.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied. You cannot modify another company schedule.' });
      }
    }

    const updates = { ...req.body };
    if (updates.busId) updates.bus = updates.busId;
    if (updates.routeId) updates.route = updates.routeId;
    if (updates.price) updates.price = Number(updates.price);
    if (updates.assignedConductor !== undefined) updates.assignedConductor = updates.assignedConductor;

    Object.assign(schedule, updates);
    await schedule.save();

    const populated = await Schedule.findById(schedule._id)
      .populate('bus')
      .populate('route')
      .populate('companyId', 'companyName logo rating cancellationPolicy phone email')
      .populate('assignedConductor', 'name email phone');

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

// @desc    Assign Conductor to specific Trip Schedule
// @route   PUT /api/schedules/:id/assign-conductor
// @access  Private (Company Admin, Super Admin)
const assignConductor = async (req, res, next) => {
  try {
    const { conductorId } = req.body;
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== schedule.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    if (conductorId) {
      const conductor = await User.findById(conductorId);
      if (!conductor || conductor.role !== 'conductor') {
        return res.status(400).json({ message: 'Selected user is not a valid conductor.' });
      }
    }

    schedule.assignedConductor = conductorId || null;
    await schedule.save();

    const populated = await Schedule.findById(schedule._id)
      .populate('bus')
      .populate('route')
      .populate('assignedConductor', 'name email phone');

    res.json({ success: true, message: 'Conductor assigned successfully', schedule: populated });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private (Company Admin, Super Admin)
const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId !== schedule.companyId.toString()) {
        return res.status(403).json({ message: 'Access denied. You cannot delete another company schedule.' });
      }
    }

    await schedule.deleteOne();
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get real-time seat map layout for a schedule
// @route   GET /api/schedules/:id/seats
// @access  Public
const getSeatMap = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate('bus');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    const totalSeats = schedule.bus ? schedule.bus.capacity : 45;
    const bookedSeatNumbers = schedule.bookedSeats || [];

    const seats = [];
    for (let i = 1; i <= totalSeats; i++) {
      const seatNo = `Seat ${i}`;
      seats.push({
        seatNumber: seatNo,
        isAvailable: !bookedSeatNumbers.includes(seatNo),
      });
    }

    res.json({
      scheduleId: schedule._id,
      tripId: schedule.tripId,
      totalSeats,
      availableCount: totalSeats - bookedSeatNumbers.length,
      bookedCount: bookedSeatNumbers.length,
      seats,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSchedules,
  getMyAssignedSchedules,
  searchSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  assignConductor,
  deleteSchedule,
  getSeatMap,
};
