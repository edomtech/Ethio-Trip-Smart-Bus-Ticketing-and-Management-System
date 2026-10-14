const Discount = require('../models/Discount');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && user.role === 'super_admin';
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

const getDiscounts = async (user, queryParams = {}) => {
  const query = {};
  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (!userCompanyId) {
      const err = new Error('Company ID required');
      err.statusCode = 403;
      throw err;
    }
    query.companyId = userCompanyId;
  } else if (queryParams.companyId) {
    query.companyId = queryParams.companyId;
  }

  return Discount.find(query).populate('route').sort('-createdAt');
};

const createDiscount = async (discountData, user) => {
  let companyId = isSuper(user) ? (discountData.companyId || getCompId(user)) : getCompId(user);
  if (!companyId) {
    const err = new Error('Company ID is required to create a discount');
    err.statusCode = 400;
    throw err;
  }

  const { code, name, discountType, discountValue, tripType, route, minAmount, startDate, endDate, holidayTag, showOnHomePage } = discountData;
  if (!code || !name || discountValue === undefined) {
    const err = new Error('Code, Name, and Discount Value are required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await Discount.findOne({ companyId, code: code.toUpperCase().trim() });
  if (existing) {
    const err = new Error('A discount with this code already exists for your company');
    err.statusCode = 400;
    throw err;
  }

  let validatedRoute = null;
  if (route) {
    const Route = require('../models/Route');
    validatedRoute = await Route.findOne({ _id: route, companyId }).select('_id');
    if (!validatedRoute) {
      const err = new Error('The selected route does not belong to your company');
      err.statusCode = 400;
      throw err;
    }
  }

  const discount = await Discount.create({
    companyId,
    code: code.toUpperCase().trim(),
    name,
    discountType: discountType || 'percentage',
    discountValue: Number(discountValue),
    tripType: tripType || 'round',
    route: validatedRoute ? validatedRoute._id : null,
    minAmount: Number(minAmount || 0),
    startDate: startDate || new Date(),
    endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    holidayTag: holidayTag || 'None',
    showOnHomePage: Boolean(showOnHomePage),
  });

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId,
    action: 'DISCOUNT_CREATED',
    entityType: 'Discount',
    entityId: discount._id.toString(),
    details: { code: discount.code, discountValue },
  }).catch(() => {});

  return discount;
};

const getPublicDiscounts = async () => {
  const now = new Date();
  return Discount.find({
    isActive: true,
    showOnHomePage: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate('companyId', 'companyName name logo')
    .populate('route')
    .sort('-createdAt');
};

const toggleDiscount = async (discountId, user) => {
  const discount = await Discount.findById(discountId);
  if (!discount) {
    const err = new Error('Discount not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (userCompanyId !== discount.companyId.toString()) {
      const err = new Error('Access denied to this discount');
      err.statusCode = 403;
      throw err;
    }
  }

  discount.isActive = !discount.isActive;
  await discount.save();

  return discount;
};

const updateDiscount = async (discountId, updateData, user) => {
  const discount = await Discount.findById(discountId);
  if (!discount) {
    const err = new Error('Discount not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (!userCompanyId || userCompanyId !== discount.companyId.toString()) {
      const err = new Error('Access denied to this discount');
      err.statusCode = 403;
      throw err;
    }
  }

  const editable = ['name', 'discountType', 'discountValue', 'tripType', 'minAmount', 'startDate', 'endDate', 'isActive', 'holidayTag', 'showOnHomePage'];
  for (const field of editable) {
    if (updateData[field] !== undefined) discount[field] = updateData[field];
  }

  if (updateData.code) discount.code = String(updateData.code).toUpperCase().trim();

  if (updateData.route !== undefined) {
    if (!updateData.route) {
      discount.route = null;
    } else {
      const Route = require('../models/Route');
      const validatedRoute = await Route.findOne({ _id: updateData.route, companyId: discount.companyId }).select('_id');
      if (!validatedRoute) {
        const err = new Error('The selected route does not belong to your company');
        err.statusCode = 400;
        throw err;
      }
      discount.route = validatedRoute._id;
    }
  }

  await discount.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: discount.companyId,
    action: 'DISCOUNT_UPDATED',
    entityType: 'Discount',
    entityId: discount._id.toString(),
    details: { code: discount.code },
  }).catch(() => {});

  return discount;
};

const deleteDiscount = async (discountId, user) => {
  const discount = await Discount.findById(discountId);
  if (!discount) {
    const err = new Error('Discount not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (userCompanyId !== discount.companyId.toString()) {
      const err = new Error('Access denied to this discount');
      err.statusCode = 403;
      throw err;
    }
  }

  await Discount.findByIdAndDelete(discount._id);

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: discount.companyId,
    action: 'DISCOUNT_DELETED',
    entityType: 'Discount',
    entityId: discount._id.toString(),
    details: { code: discount.code },
  }).catch(() => {});

  return { success: true, message: 'Discount deleted successfully' };
};

module.exports = {
  getDiscounts,
  getPublicDiscounts,
  createDiscount,
  updateDiscount,
  toggleDiscount,
  deleteDiscount,
};
