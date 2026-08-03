const Route = require('../models/Route');

// @desc    Get all routes
// @route   GET /api/routes
// @access  Private
const getRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find().sort('-createdAt');
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
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new route
// @route   POST /api/routes
// @access  Private/Admin
const createRoute = async (req, res, next) => {
  try {
    const { from, to, distance, duration, stops, status } = req.body;
    const stopsArr = Array.isArray(stops)
      ? stops
      : stops
      ? stops.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const route = await Route.create({
      from,
      to,
      distance: Number(distance),
      duration,
      stops: stopsArr,
      status: status || 'active',
    });
    res.status(201).json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private/Admin
const updateRoute = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.stops && typeof updateData.stops === 'string') {
      updateData.stops = updateData.stops
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const route = await Route.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private/Admin
const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
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
