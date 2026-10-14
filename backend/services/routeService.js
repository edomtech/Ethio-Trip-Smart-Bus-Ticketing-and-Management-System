const Route = require('../models/Route');
const AuditLog = require('../models/AuditLog');
const {
  isSuperAdmin: isSuper,
  getCompanyId: getCompId,
  assertSameCompany,
} = require('./tenantScope');

const getRoutes = async (user, queryParams = {}) => {
  const query = {};

  if (user && !isSuper(user) && user.role !== 'passenger') {
    query.companyId = getCompId(user);
    if (!query.companyId) {
      const err = new Error('Access denied: your account is not assigned to a transport company');
      err.statusCode = 403;
      throw err;
    }
  } else if (user && isSuper(user)) {
    if (queryParams.companyId) query.companyId = queryParams.companyId;
  }

  return Route.find(query).populate('companyId', 'companyName logo').sort('-createdAt');
};

const getRouteById = async (routeId, user = null) => {
  const route = await Route.findById(routeId).populate('companyId', 'companyName logo');
  if (!route) {
    const err = new Error('Route not found');
    err.statusCode = 404;
    throw err;
  }
  if (user && !isSuper(user)) {
    assertSameCompany(user, route.companyId, 'route');
  }
  return route;
};

const createRoute = async (routeData, user) => {
  let companyId;
  if (isSuper(user)) {
    companyId = routeData.companyId;
  } else {
    companyId = getCompId(user);
  }

  if (!companyId) {
    const err = new Error('A valid company ID is required to create a route');
    err.statusCode = 400;
    throw err;
  }

  const { from, to, distance, duration, stops, status } = routeData;
  if (!from || !to) {
    const err = new Error('Origin (from) and Destination (to) are required');
    err.statusCode = 400;
    throw err;
  }

  const stopsArr = Array.isArray(stops)
    ? stops
    : stops
    ? String(stops).split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const route = await Route.create({
    companyId,
    from: from.trim(),
    to: to.trim(),
    distance: Number(distance) || 0,
    duration: duration || '4 hrs',
    stops: stopsArr,
    status: status || 'active',
  });

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId,
    action: 'ROUTE_CREATED',
    entityType: 'Route',
    entityId: route._id.toString(),
    details: { from: route.from, to: route.to },
  }).catch(() => {});

  return Route.findById(route._id).populate('companyId', 'companyName logo');
};

const updateRoute = async (routeId, updateData, user) => {
  const route = await getRouteById(routeId, user);

  delete updateData.companyId;

  if (updateData.stops && typeof updateData.stops === 'string') {
    updateData.stops = updateData.stops.split(',').map((s) => s.trim()).filter(Boolean);
  }

  Object.assign(route, updateData);
  await route.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: route.companyId?._id || route.companyId,
    action: 'ROUTE_UPDATED',
    entityType: 'Route',
    entityId: route._id.toString(),
    details: updateData,
  }).catch(() => {});

  return Route.findById(route._id).populate('companyId', 'companyName logo');
};

const deleteRoute = async (routeId, user) => {
  const route = await getRouteById(routeId, user);

  await Route.findByIdAndDelete(route._id);

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: route.companyId?._id || route.companyId,
    action: 'ROUTE_DELETED',
    entityType: 'Route',
    entityId: route._id.toString(),
    details: { from: route.from, to: route.to },
  }).catch(() => {});

  return { success: true, message: 'Route deleted successfully' };
};

module.exports = {
  getRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
};
