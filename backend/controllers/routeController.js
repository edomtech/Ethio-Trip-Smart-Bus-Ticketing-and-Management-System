const routeService = require('../services/routeService');

const getRoutes = async (req, res, next) => {
  try {
    const routes = await routeService.getRoutes(req.user, req.query);
    res.json(routes);
  } catch (err) {
    next(err);
  }
};

const getRouteById = async (req, res, next) => {
  try {
    const route = await routeService.getRouteById(req.params.id, req.user);
    res.json(route);
  } catch (err) {
    next(err);
  }
};

const createRoute = async (req, res, next) => {
  try {
    const route = await routeService.createRoute(req.body, req.user);
    res.status(201).json({ success: true, route });
  } catch (err) {
    next(err);
  }
};

const updateRoute = async (req, res, next) => {
  try {
    const route = await routeService.updateRoute(req.params.id, req.body, req.user);
    res.json({ success: true, route });
  } catch (err) {
    next(err);
  }
};

const deleteRoute = async (req, res, next) => {
  try {
    const result = await routeService.deleteRoute(req.params.id, req.user);
    res.json(result);
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
