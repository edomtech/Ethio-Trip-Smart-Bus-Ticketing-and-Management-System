const jwt = require('jsonwebtoken');
const User = require('../models/User');

const otpStore = new Map(); // Simple in-memory store for OTPs: email -> { otp, expiresAt }

const signToken = (id) => {
  const secret = process.env.JWT_SECRET || 'ethiobus_jwt_secret_key_2026';
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Send Email Verification OTP
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email address is required' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    console.log(`[ETHIOTRIP OTP] Verification code for ${email}: ${otp}`);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      demoOTP: otp, // Returned for testing / demo purposes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify Email OTP Code
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return res.status(400).json({ message: 'No OTP code was requested for this email' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }

    if (record.otp !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check your email and try again.' });
    }

    // OTP verified
    otpStore.delete(email.toLowerCase());

    // Update user if already in DB
    let token = null;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.isEmailVerified = true;
      await user.save();
      token = signToken(user._id);
    }

    res.json({
      success: true,
      message: 'Email address verified successfully!',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, phone, nationalId, password, city } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      nationalId: nationalId || '',
      isEmailVerified: false,
      password,
      city: city || '',
      role: 'passenger',
    });

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please verify your email with the OTP code.',
      user,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('companyId');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact support.' });
    }

    // Role normalization
    if (user.role === 'admin' && !user.companyId) user.role = 'super_admin';
    if (user.role === 'admin' && user.companyId) user.role = 'company_admin';
    if (user.role === 'company_staff') user.role = 'agent';

    const token = signToken(user._id);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate / Register via Google Auth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const userEmail = (email || 'google.user@ethiotrip.com').toLowerCase();
    const userName = name || 'Google User';

    let user = await User.findOne({ email: userEmail }).populate('companyId');
    if (!user) {
      user = await User.create({
        name: userName,
        email: userEmail,
        password: 'GoogleAuthSecurePassword123!',
        isEmailVerified: true,
        role: 'passenger',
      });
    }

    if (user.role === 'admin' && !user.companyId) user.role = 'super_admin';
    if (user.role === 'admin' && user.companyId) user.role = 'company_admin';
    if (user.role === 'company_staff') user.role = 'agent';

    const token = signToken(user._id);
    res.json({ user, token, message: 'Google Sign-In successful!' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, nationalId, city, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) return res.status(400).json({ message: 'Email is already in use by another account' });
      user.email = email.toLowerCase();
    }
    if (phone !== undefined) user.phone = phone;
    if (nationalId !== undefined) user.nationalId = nationalId;
    if (city !== undefined) user.city = city;
    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    await user.save();
    const updated = await User.findById(user._id).select('-password').populate('companyId');
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  sendOTP,
  verifyOTP,
  register,
  login,
  googleAuth,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
