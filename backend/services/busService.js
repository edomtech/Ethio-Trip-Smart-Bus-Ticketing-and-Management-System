const Bus = require('../models/Bus');
const Company = require('../models/Company');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && user.role === 'super_admin';
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

const getBuses = async (user, queryParams = {}) => {
  const query = {};
  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (!userCompanyId) {
      const err = new Error('User is not assigned to a company');
      err.statusCode = 403;
      throw err;
    }
    query.companyId = userCompanyId;
  } else if (queryParams.companyId) {
    query.companyId = queryParams.companyId;
  }

  return Bus.find(query).populate('companyId', 'companyName logo').sort('-createdAt');
};

const getBusById = async (busId, user) => {
  const bus = await Bus.findById(busId).populate('companyId', 'companyName logo');
  if (!bus) {
    const err = new Error('Bus not found');
    err.statusCode = 404;
    throw err;
  }

  if (user && !isSuper(user)) {
    const userCompanyId = getCompId(user);
    const busCompanyId = bus.companyId?._id ? bus.companyId._id.toString() : bus.companyId.toString();
    if (userCompanyId !== busCompanyId) {
      const err = new Error('Access denied. Bus belongs to another company.');
      err.statusCode = 403;
      throw err;
    }
  }

  return bus;
};

const createBus = async (busData, user) => {
  let targetCompanyId = busData.companyId;

  if (!isSuper(user)) {
    targetCompanyId = getCompId(user);
    if (!targetCompanyId) {
      const err = new Error('Company Admin/Staff must belong to a registered company');
      err.statusCode = 403;
      throw err;
    }
  }

  if (!targetCompanyId) {
    const err = new Error('Company ID is required to register a bus');
    err.statusCode = 400;
    throw err;
  }

  const existingPlate = await Bus.findOne({ plateNumber: busData.plateNumber?.trim() });
  if (existingPlate) {
    const err = new Error('A bus with this plate number already exists');
    err.statusCode = 400;
    throw err;
  }

  const bus = await Bus.create({
    ...busData,
    companyId: targetCompanyId,
  });

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: targetCompanyId,
    action: 'BUS_CREATED',
    entityType: 'Bus',
    entityId: bus._id.toString(),
    details: { plateNumber: bus.plateNumber, busNumber: bus.busNumber },
  }).catch(() => {});

  return Bus.findById(bus._id).populate('companyId', 'companyName logo');
};

const updateBus = async (busId, updateData, user) => {
  const bus = await getBusById(busId, user);

  delete updateData.companyId;

  Object.assign(bus, updateData);
  await bus.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: bus.companyId?._id || bus.companyId,
    action: 'BUS_UPDATED',
    entityType: 'Bus',
    entityId: bus._id.toString(),
    details: updateData,
  }).catch(() => {});

  return Bus.findById(bus._id).populate('companyId', 'companyName logo');
};

const deleteBus = async (busId, user) => {
  const bus = await getBusById(busId, user);
  await Bus.findByIdAndDelete(bus._id);

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: bus.companyId?._id || bus.companyId,
    action: 'BUS_DELETED',
    entityType: 'Bus',
    entityId: bus._id.toString(),
    details: { plateNumber: bus.plateNumber, busNumber: bus.busNumber },
  }).catch(() => {});

  return { success: true, message: 'Bus deleted successfully' };
};

const getPublicBuses = async () => {
  return Bus.find({ status: 'active' }).populate('companyId', 'companyName logo description rating').sort('-createdAt');
};

module.exports = {
  getBuses,
  getPublicBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
};
