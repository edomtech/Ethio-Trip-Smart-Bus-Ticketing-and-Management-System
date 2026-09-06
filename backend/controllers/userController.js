const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const isSuper = (user) => user && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId));
const getCompId = (user) => user?.companyId?._id ? user.companyId._id.toString() : user?.companyId ? user.companyId.toString() : null;

// @desc    Get all users (Super Admin: all users; Company Admin: company staff)
// @route   GET /api/users
// @access  Private (Super Admin, Company Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const query = {};
    const { role } = req.query;

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      if (!userCompanyId) return res.status(403).json({ message: 'Not authorized' });
      query.companyId = userCompanyId;
    } else if (req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('companyId', 'companyName logo')
      .sort('-createdAt');

    res.json(users);
  } catch (err) {
    next(err);
  }
};

// @desc    Get company staff (Company Staff / Ticket Agents / Conductors)
// @route   GET /api/users/staff
// @access  Private (Company Admin, Super Admin)
const getStaff = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    } else {
      query.role = { $in: ['company_staff', 'agent', 'conductor'] };
    }

    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      query.companyId = userCompanyId;
    }

    const staff = await User.find(query)
      .select('-password')
      .populate('companyId', 'companyName logo')
      .sort('-createdAt');

    res.json(staff);
  } catch (err) {
    next(err);
  }
};

// @desc    Get conductors for company
// @route   GET /api/users/conductors
// @access  Private (Company Admin, Super Admin)
const getConductors = async (req, res, next) => {
  try {
    const query = { role: 'conductor' };
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      query.companyId = userCompanyId;
    }
    const conductors = await User.find(query).select('-password').populate('companyId', 'companyName logo').sort('name');
    res.json(conductors);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new company staff / ticket agent / conductor
// @route   POST /api/users/staff
// @access  Private (Company Admin, Super Admin)
const createStaff = async (req, res, next) => {
  try {
    const { name, email, phone, city, password, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    let companyId;
    if (req.user.role === 'super_admin' || (req.user.role === 'admin' && !req.user.companyId)) {
      companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ message: 'Company ID is required when creating staff as Super Admin' });
    } else {
      companyId = req.user.companyId?._id || req.user.companyId;
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'User account with this email already exists' });

    const assignedRole = role || 'agent';

    const staffUser = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      city: city || '',
      password: password || 'password123',
      role: assignedRole,
      companyId,
      isEmailVerified: true,
    });

    await AuditLog.create({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      companyId,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: staffUser._id.toString(),
      details: { staffName: name, email: staffUser.email, role: assignedRole },
    });

    res.status(201).json(staffUser.toJSON());
  } catch (err) {
    next(err);
  }
};

// Legacy agent alias
const getAgents = getStaff;
const createAgent = createStaff;

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('companyId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status / profile
// @route   PUT /api/users/:id
// @access  Private (Super Admin, Company Admin)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Multi-tenant authorization check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const targetCompanyId = user.companyId ? user.companyId.toString() : null;
      if (userCompanyId && targetCompanyId && userCompanyId !== targetCompanyId) {
        return res.status(403).json({ message: 'Access denied. You can only manage staff in your company.' });
      }
    }

    Object.assign(user, req.body);
    await user.save();

    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Super Admin, Company Admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Multi-tenant check
    if (!isSuper(req.user)) {
      const userCompanyId = getCompId(req.user);
      const targetCompanyId = user.companyId ? user.companyId.toString() : null;
      if (userCompanyId && targetCompanyId && userCompanyId !== targetCompanyId) {
        return res.status(403).json({ message: 'Access denied. You can only delete staff in your company.' });
      }
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getStaff,
  getConductors,
  createStaff,
  getAgents,
  createAgent,
  getUserById,
  updateUser,
  deleteUser,
};
