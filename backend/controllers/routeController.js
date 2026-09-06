const Route = require('../models/Route');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// @desc    Get all routes (Scoped by company unless Super Admin or public query)
// @route   GET /api/routes
// @access  Private / Public
const getRoutes = async (req, res, next) => {
  try {
    const query = {};
    if (req.user && !isSuper(req.user) && req.user.role !== 'passenger') {
      const userCompanyId = getCompId(req.user);
      if (userCompanyId) query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    const routes = await Route.find(query).populate('companyId', 'companyName logo').sort('-createdAt');
    res.json(routes);
  } catch (err) {
    next(err);
  }
};

// @desc    Get route by ID
// @route   GET /api/routes/:id
// @access  Private
const getRouteById = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id).populate('companyId', 'companyName logo');
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Private (Company Admin, Super Admin)
const createRoute = async (req, res, next) => {
  try {
    let companyId;
    if (isSuper(req.user)) {
      companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ message: 'Company ID is required for Super Admin' });
    } else {
      companyId = getCompId(req.user);
    }

    if (!companyId) return res.status(400).json({ message: 'Valid company ID is required to create a route' });

    const { from, to, distance, duration, stops, status } = req.body;
    const stopsArr = Array.isArray(stops)
      ? stops
      : stops
      ? stops.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Prevent duplicate active route for same company
    const existingRoute = await Route.findOne({ companyId, from, to, status: 'active' });
    if (existingRoute) {
      return res.status(400).json({ message: `An active route from ${from} to ${to} already exists for your company.` });
    }

    const route = await Route.create({
      companyId,
      from,
      to,
      distance: Number(distance),
      duration,
      stops: stopsArr,
      status: status || 'active',
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'ROUTE_CREATED',
      entityType: 'Route',
      entityId: route._id.toString(),
      details: { from, to, distance, duration },
    });

    res.status(201).json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private (Company Admin, Super Admin)
const updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const routeCompanyId = route.companyId.toString();
      if (userCompanyId !== routeCompanyId) {
        return res.status(403).json({ message: 'Access denied. You cannot modify another company route.' });
      }
    }

    const updateData = { ...req.body };
    if (updateData.stops && typeof updateData.stops === 'string') {
      updateData.stops = updateData.stops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    Object.assign(route, updateData);
    await route.save();

    res.json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private (Company Admin, Super Admin)
const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const routeCompanyId = route.companyId.toString();
      if (userCompanyId !== routeCompanyId) {
        return res.status(403).json({ message: 'Access denied. You cannot delete another company route.' });
      }
    }

    await route.deleteOne();
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
};
