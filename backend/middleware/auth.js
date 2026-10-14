const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES, CANONICAL_ROLES } = require('../constants/roles');


const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or empty. Please set JWT_SECRET in your backend environment.');
  }
  return secret.trim();
};


const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const token = auth.split(' ')[1];
    if (!token || !token.trim()) {
      return res.status(401).json({ success: false, message: 'Malformed authorization token' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    const user = await User.findById(decoded.id).select('-password').populate('companyId');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or account removed' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    if (!user.role || !CANONICAL_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Account has an unrecognized or invalid role' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
    }
    return res.status(401).json({ success: false, message: 'Token invalid or corrupted' });
  }
};


const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.role === ROLES.PASSENGER && !req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address with the 6-digit OTP code before proceeding.',
    });
  }

  next();
};


const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const userRole = req.user.role;
  if (!userRole || !CANONICAL_ROLES.includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Access denied. Account has an invalid role.' });
  }

  const canonicalAllowed = roles.flatMap((r) => {
    if (r === 'super_admin' || r === 'admin') return [ROLES.SUPER_ADMIN];
    if (r === 'company_admin') return [ROLES.COMPANY_ADMIN];
    if (r === 'company_staff' || r === 'agent') return [ROLES.COMPANY_STAFF];
    if (r === 'conductor') return [ROLES.CONDUCTOR];
    if (r === 'passenger') return [ROLES.PASSENGER];
    return [r];
  });

  if (!canonicalAllowed.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Authorized roles: ${roles.join(', ')}`,
    });
  }

  next();
};


const requireCompanyAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });

  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  if (!req.user.companyId) {
    return res.status(403).json({ success: false, message: 'Access denied. Account is not assigned to any transport company.' });
  }

  const company = req.user.companyId;
  const companyStatus = typeof company === 'object' ? company.status : null;

  if (companyStatus === 'suspended') {
    return res.status(403).json({ success: false, message: 'Your transport company is currently suspended. Please contact platform admin.' });
  }
  if (companyStatus === 'rejected') {
    return res.status(403).json({ success: false, message: 'Your company application was rejected.' });
  }

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
    if (!token) return next();

    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded?.id) {
      const user = await User.findById(decoded.id).select('-password').populate('companyId');
      if (user && user.isActive && CANONICAL_ROLES.includes(user.role)) {
        req.user = user;
      }
    }
  } catch (err) {
  }
  next();
};

module.exports = {
  getJwtSecret,
  protect,
  requireVerifiedEmail,
  optionalProtect,
  authorize,
  requireCompanyAccess,
};
