const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ethiobus_jwt_secret_key_2026');
    const user = await User.findById(decoded.id).select('-password').populate('companyId');
    if (!user) return res.status(401).json({ message: 'User not found or account deactivated' });
    if (!user.isActive) return res.status(403).json({ message: 'Account has been deactivated' });

    // Normalize legacy roles if needed
    if (user.role === 'admin' && !user.companyId) user.role = 'super_admin';
    if (user.role === 'admin' && user.companyId) user.role = 'company_admin';
    if (user.role === 'company_staff') user.role = 'agent';

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  // Mapping allowed roles to include canonical roles and legacy aliases
  const normalizedAllowed = roles.flatMap((r) => {
    if (r === 'super_admin') return ['super_admin', 'admin'];
    if (r === 'company_admin') return ['company_admin', 'admin'];
    if (r === 'agent' || r === 'company_staff') return ['agent', 'company_staff'];
    if (r === 'conductor') return ['conductor'];
    if (r === 'passenger') return ['passenger'];
    return [r];
  });

  if (!normalizedAllowed.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Authorized roles: ${roles.join(', ')}`,
    });
  }
  next();
};

// Strict company tenant verification middleware
const requireCompanyAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  // Super Admin can access all companies
  if (req.user.role === 'super_admin' || (req.user.role === 'admin' && !req.user.companyId)) {
    return next();
  }

  // Company Admin, Agents & Conductors MUST have a valid companyId
  if (!req.user.companyId) {
    return res.status(403).json({ message: 'Access denied. Account is not assigned to any company' });
  }

  const company = req.user.companyId;
  const companyStatus = typeof company === 'object' ? company.status : null;

  if (companyStatus && companyStatus === 'suspended') {
    return res.status(403).json({ message: 'Your transport company is currently suspended. Please contact platform admin.' });
  }
  if (companyStatus && companyStatus === 'rejected') {
    return res.status(403).json({ message: 'Your company application was rejected.' });
  }

  // Set user's company ID on request helper for clean queries
  req.companyId = typeof company === 'object' ? company._id : company;
  next();
};

const optionalProtect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ethiobus_jwt_secret_key_2026');
    const user = await User.findById(decoded.id).select('-password').populate('companyId');
    if (user && user.isActive) {
      if (user.role === 'admin' && !user.companyId) user.role = 'super_admin';
      if (user.role === 'admin' && user.companyId) user.role = 'company_admin';
      if (user.role === 'company_staff') user.role = 'agent';
      req.user = user;
    }
  } catch (err) {
    // Continue without req.user if token is invalid
  }
  next();
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  requireCompanyAccess,
};
