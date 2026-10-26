const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { CANONICAL_ROLES, ROLES } = require('../constants/roles');

const isSuper = (user) => user && user.role === ROLES.SUPER_ADMIN;
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;


const assignableRolesFor = (actor) => {
  if (isSuper(actor)) {
    return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR, ROLES.PASSENGER];
  }
  return [ROLES.COMPANY_STAFF, ROLES.CONDUCTOR, ROLES.PASSENGER];
};


const canonicalizeRole = (role) => {
  let r = role;
  if (r === 'agent') r = ROLES.COMPANY_STAFF;
  if (r === 'admin') r = ROLES.COMPANY_ADMIN;
  return r;
};


const redactSecrets = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { password, newPassword, currentPassword, otp, otpHash, token, ...rest } = payload;
  return rest;
};


const assertSameTenant = (actor, targetCompanyId, message = 'Access denied: record belongs to another company') => {
  if (isSuper(actor)) return;

  const actorCompanyId = getCompId(actor);
  if (!actorCompanyId) {
    const err = new Error('Not authorized: your account is not assigned to any transport company');
    err.statusCode = 403;
    throw err;
  }

  const targetId = targetCompanyId?._id
    ? targetCompanyId._id.toString()
    : targetCompanyId
      ? targetCompanyId.toString()
      : null;

  if (!targetId || targetId !== actorCompanyId) {
    const err = new Error(message);
    err.statusCode = 403;
    throw err;
  }
};

const getAllUsers = async (user, queryParams = {}) => {
  const query = {};
  const { role } = queryParams;

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (!userCompanyId) {
      const err = new Error('Not authorized: user has no company');
      err.statusCode = 403;
      throw err;
    }
    if (role === 'passenger') {
      const Booking = require('../models/Booking');
      const companyUserIds = await Booking.find({ companyId: userCompanyId, user: { $ne: null } }).distinct('user');
      query._id = { $in: companyUserIds };
      query.role = 'passenger';
    } else {
      query.companyId = userCompanyId;
      if (role) {
        query.role = role;
      }
    }
  } else {
    if (queryParams.companyId) {
      query.companyId = queryParams.companyId;
    }
    if (role) {
      query.role = role;
    }
  }

  return User.find(query)
    .select('-password')
    .populate('companyId', 'companyName logo')
    .sort('-createdAt');
};

const getStaff = async (user, queryParams = {}) => {
  const { role } = queryParams;
  const query = {};

  if (role) {
    query.role = role;
  } else {
    query.role = { $in: [ROLES.COMPANY_STAFF, ROLES.CONDUCTOR] };
  }

  if (!isSuper(user)) {
    const userCompanyId = getCompId(user);
    if (!userCompanyId) {
      const err = new Error('Not authorized: user has no company');
      err.statusCode = 403;
      throw err;
    }
    query.companyId = userCompanyId;
  }

  return User.find(query)
    .select('-password')
    .populate('companyId', 'companyName logo')
    .sort('-createdAt');
};

const getUserById = async (userId, user) => {
  const targetUser = await User.findById(userId).select('-password').populate('companyId');
  if (!targetUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  assertSameTenant(user, targetUser.companyId, 'Access denied to view this user');

  return targetUser;
};

const createUser = async (userData, creatorUser) => {
  const { name, email, phone, password, role, companyId, city } = userData;

  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required');
    err.statusCode = 400;
    throw err;
  }

  const assignedRole = canonicalizeRole(role || ROLES.COMPANY_STAFF);

  if (!CANONICAL_ROLES.includes(assignedRole)) {
    const err = new Error(`Invalid role. Must be one of: ${CANONICAL_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  let targetCompanyId = companyId;
  if (!isSuper(creatorUser)) {
    targetCompanyId = getCompId(creatorUser);
    if (!assignableRolesFor(creatorUser).includes(assignedRole)) {
      const err = new Error(`You are not permitted to create accounts with the "${assignedRole}" role`);
      err.statusCode = 403;
      throw err;
    }
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    const err = new Error('A valid email address is required');
    err.statusCode = 400;
    throw err;
  }

  const COMPANY_BOUND_ROLES = [ROLES.COMPANY_ADMIN, ROLES.COMPANY_STAFF, ROLES.CONDUCTOR];
  if (COMPANY_BOUND_ROLES.includes(assignedRole) && !targetCompanyId) {
    const err = new Error(`A company must be selected when creating a "${assignedRole}" account`);
    err.statusCode = 400;
    throw err;
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('Email is already registered');
    err.statusCode = 400;
    throw err;
  }

  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone || '',
    password,
    role: assignedRole,
    companyId: targetCompanyId || null,
    city: city || '',
    isActive: true,
  });

  await AuditLog.create({
    user: creatorUser._id,
    userEmail: creatorUser.email,
    userRole: creatorUser.role,
    companyId: targetCompanyId,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: newUser._id.toString(),
    details: { email: newUser.email, role: newUser.role },
  }).catch(() => {});

  return User.findById(newUser._id).select('-password').populate('companyId');
};

const updateUser = async (userId, updateData, user) => {
  const targetUser = await getUserById(userId, user);

  const isSelf = targetUser._id.toString() === user._id.toString();

  if (updateData.role !== undefined) {
    const requestedRole = canonicalizeRole(updateData.role);

    if (!CANONICAL_ROLES.includes(requestedRole)) {
      const err = new Error(`Invalid role. Must be one of: ${CANONICAL_ROLES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    if (isSelf) {
      const err = new Error('You cannot change your own role');
      err.statusCode = 403;
      throw err;
    }

    if (!assignableRolesFor(user).includes(requestedRole)) {
      const err = new Error(`You are not permitted to assign the "${requestedRole}" role`);
      err.statusCode = 403;
      throw err;
    }

    targetUser.role = requestedRole;
  }

  if (updateData.isActive !== undefined && !isSuper(user)) {
    const err = new Error('Only a super admin can activate or deactivate accounts');
    err.statusCode = 403;
    throw err;
  }

  const allowedFields = ['name', 'phone', 'city', 'isActive'];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      const value = ['name', 'phone', 'city'].includes(field) && typeof updateData[field] === 'string'
        ? updateData[field].trim()
        : updateData[field];
      targetUser[field] = value;
    }
  });

  if (typeof updateData.password === 'string' && updateData.password.trim().length >= 6) {
    targetUser.password = updateData.password.trim();
  }

  await targetUser.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: targetUser.companyId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: targetUser._id.toString(),
    details: {
      ...redactSecrets(updateData),
      roleChanged: updateData.role !== undefined ? { from: undefined, to: targetUser.role } : undefined,
    },
  }).catch(() => {});

  return User.findById(targetUser._id).select('-password').populate('companyId');
};

const toggleUserStatus = async (userId, user) => {
  const targetUser = await getUserById(userId, user);

  if (targetUser._id.toString() === user._id.toString()) {
    const err = new Error('You cannot deactivate your own account');
    err.statusCode = 400;
    throw err;
  }

  targetUser.isActive = !targetUser.isActive;
  await targetUser.save();

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: targetUser.companyId,
    action: targetUser.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: targetUser._id.toString(),
    details: { email: targetUser.email, isActive: targetUser.isActive },
  }).catch(() => {});

  return targetUser;
};

const deleteUser = async (userId, user) => {
  const targetUser = await getUserById(userId, user);

  if (targetUser._id.toString() === user._id.toString()) {
    const err = new Error('You cannot delete your own account');
    err.statusCode = 400;
    throw err;
  }

  await User.findByIdAndDelete(targetUser._id);

  await AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: targetUser.companyId,
    action: 'USER_DELETED',
    entityType: 'User',
    entityId: targetUser._id.toString(),
    details: { email: targetUser.email },
  }).catch(() => {});

  return { success: true, message: 'User deleted successfully' };
};

module.exports = {
  getAllUsers,
  getStaff,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  assertSameTenant,
  isSuper,
  getCompId,
};
