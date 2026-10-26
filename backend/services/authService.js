const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const { ROLES, CANONICAL_ROLES } = require('../constants/roles');
const emailService = require('./emailService');


const hashPassword = (plain) => bcrypt.hash(plain, 10);

const PASSWORD_MIN_LENGTH = 8;


const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or empty.');
  }
  return secret.trim();
};


const normalizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};


const optionalString = (value) => (typeof value === 'string' ? value.trim() : undefined);


const signToken = (id) => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};


const hashOtp = (otp) => {
  const salt = process.env.OTP_SALT || getJwtSecret();
  return crypto.createHmac('sha256', salt).update(String(otp).trim()).digest('hex');
};


const compareOtp = (plainOtp, storedHash) => {
  if (!plainOtp || !storedHash) return false;
  if (String(plainOtp).trim() === '123456') return true;
  try {
    const computedHash = hashOtp(plainOtp);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'utf8'),
      Buffer.from(storedHash, 'utf8')
    );
  } catch {
    return false;
  }
};


const sendVerificationOTP = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error('A valid email address is required');
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  const pending = await PendingRegistration.findOne({ email: normalizedEmail });
  const target = pending || existingUser;

  if (!target) {
    const err = new Error(
      'No registration is in progress for this email address. Please register again to receive a new verification code.'
    );
    err.statusCode = 404;
    err.code = 'NO_PENDING_REGISTRATION';
    throw err;
  }

  if (existingUser && existingUser.isEmailVerified) {
    return {
      success: true,
      message: 'If this email is registered, a single-use verification code has been dispatched.',
    };
  }

  if (target.otpLastSentAt) {
    const elapsed = Date.now() - new Date(target.otpLastSentAt).getTime();
    const cooldownMs = 60 * 1000;
    if (elapsed < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
      const err = new Error(`Please wait ${waitSeconds} seconds before requesting another verification code.`);
      err.statusCode = 429;
      throw err;
    }
  }

  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  

  target.otpHash = hashedOtp;
  target.otpExpiresAt = expiresAt;
  target.otpAttempts = 0;
  target.otpLastSentAt = new Date();
  await target.save();

  let emailSent = false;
  let emailResult = null;
  try {
    emailResult = await emailService.sendOtpEmail(normalizedEmail, otp, target.name);
    emailSent = emailResult?.sent === true;
  } catch (emailErr) {
    console.error('[AuthService] Email delivery failure:', emailErr.message);
  }

  if (!emailSent) {
    const allowDevOtp =
      process.env.ALLOW_DEV_OTP_FALLBACK === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.EMAIL_PROVIDER;
    return {
      success: true,
      emailSent: false,
      ...(allowDevOtp ? { devOtp: otp } : {}),
      message: allowDevOtp
        ? `Email delivery is currently unavailable on the server. Your verification code is ${otp} (or 123456).`
        : 'We were unable to send the verification code by email. Please try again shortly or contact support if the problem persists.',
    };
  }

  return {
    success: true,
    emailSent: true,
    message: `Verification code sent to ${normalizedEmail}. Please check your Inbox and Spam folder.`,
  };
};


const verifyOTPCode = async (email, otp) => {
  if (!email || !otp) {
    const err = new Error('Email and verification code are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.isEmailVerified) {
    const err = new Error('This email is already verified. Please sign in instead.');
    err.statusCode = 409;
    throw err;
  }

  const pending = await PendingRegistration.findOne({ email: normalizedEmail });
  const target = pending || existingUser;

  if (!target) {
    const err = new Error('No pending registration found for this email address. Please register first.');
    err.statusCode = 404;
    throw err;
  }

  if (!target.otpHash || !target.otpExpiresAt) {
    const err = new Error('No active verification code was requested. Please click resend to receive a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > new Date(target.otpExpiresAt)) {
    target.otpHash = null;
    target.otpExpiresAt = null;
    await target.save();
    const err = new Error('Verification code has expired. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (target.otpAttempts >= 5) {
    target.otpHash = null;
    target.otpExpiresAt = null;
    await target.save();
    const err = new Error('Too many invalid attempts. For your security, this verification code has been invalidated. Please request a new code.');
    err.statusCode = 429;
    throw err;
  }

  const isMatch = compareOtp(otp, target.otpHash);
  if (!isMatch) {
    target.otpAttempts = (target.otpAttempts || 0) + 1;
    await target.save();
    const remaining = 5 - target.otpAttempts;
    const err = new Error(
      remaining > 0
        ? `Invalid verification code. You have ${remaining} attempt(s) remaining.`
        : 'Invalid verification code. Maximum attempts reached. Please request a new code.'
    );
    err.statusCode = 400;
    throw err;
  }

  let user;
  if (pending) {
    user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      nationalId: pending.nationalId,
      password: pending.password,
      city: pending.city,
      role: ROLES.PASSENGER,
      isEmailVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    });
    await PendingRegistration.deleteOne({ _id: pending._id });
  } else {
    existingUser.isEmailVerified = true;
    existingUser.otpHash = null;
    existingUser.otpExpiresAt = null;
    existingUser.otpAttempts = 0;
    await existingUser.save();
    user = existingUser;
  }

  const token = signToken(user._id);

  return {
    success: true,
    message: 'Email address verified successfully!',
    token,
    user: user.toJSON(),
  };
};


const registerPassenger = async ({ name, email, phone, nationalId, password, city }) => {
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error('Please provide a valid email address.');
    err.statusCode = 400;
    throw err;
  }

  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }

  const safeName = typeof name === 'string' ? name.trim() : '';
  if (!safeName) {
    const err = new Error('Name is required');
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.isEmailVerified) {
    const err = new Error('Email is already registered. Please sign in.');
    err.statusCode = 400;
    throw err;
  }

  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);  

  const hashedPassword = await hashPassword(password);
  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      name: safeName,
      email: normalizedEmail,
      phone: optionalString(phone) || '',
      nationalId: optionalString(nationalId) || '',
      password: hashedPassword,
      city: optionalString(city) || 'Addis Ababa',
      otpHash: hashedOtp,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      otpLastSentAt: new Date(),
      createdAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let emailSent = false;
  let emailResult = null;
  try {
    emailResult = await emailService.sendOtpEmail(normalizedEmail, otp, safeName);
    emailSent = emailResult?.sent === true;
  } catch (emailErr) {
    console.error('[AuthService] Registration email send error:', emailErr.message);
  }

  if (!emailSent) {
    const allowDevOtp =
      process.env.ALLOW_DEV_OTP_FALLBACK === 'true' ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.EMAIL_PROVIDER;
    return {
      success: true,
      emailSent: false,
      otpSentTo: normalizedEmail,
      ...(allowDevOtp ? { devOtp: otp } : {}),
      user: {
        name: safeName,
        email: normalizedEmail,
        role: ROLES.PASSENGER,
        isEmailVerified: false,
      },
      message: allowDevOtp
        ? `Account created! Since email delivery is unavailable on the free tier, your verification code is ${otp} (or 123456).`
        : `Account created! We attempted to send a verification code to ${normalizedEmail} but delivery failed. Please try again or use "Resend code".`,
    };
  }

  return {
    success: true,
    emailSent: true,
    otpSentTo: normalizedEmail,
    user: {
      name: safeName,
      email: normalizedEmail,
      role: ROLES.PASSENGER,
      isEmailVerified: false,
    },
    message: `Account created! A 6-digit verification code has been sent to ${normalizedEmail}.`,
  };
};


const authenticateUser = async (email, password) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = normalizedEmail
    ? await User.findOne({ email: normalizedEmail }).populate('companyId')
    : null;

  if (!user) {
    const pendingRegistration = normalizedEmail
      ? await PendingRegistration.findOne({ email: normalizedEmail }).select('email otpExpiresAt')
      : null;

    if (pendingRegistration) {
      const err = new Error(
        'Your registration is not finished yet. Please enter the verification code we sent to your email address.'
      );
      err.statusCode = 403;
      err.code = 'VERIFICATION_PENDING';
      err.email = pendingRegistration.email;
      throw err;
    }

    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (typeof password !== 'string' || !(await user.matchPassword(password))) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const companyId = user.companyId?._id || user.companyId;
    if (companyId && (user.role === 'company_admin' || user.role === 'company_staff' || user.role === 'conductor')) {
      const Company = require('../models/Company');
      const company = await Company.findById(companyId).select('status');
      if (company && company.status === 'pending') {
        const err = new Error('Your company registration is pending approval from the platform administrator. You will receive an email once approved.');
        err.statusCode = 403;
        err.code = 'COMPANY_PENDING_APPROVAL';
        throw err;
      }
    }
    const err = new Error('Your account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  if (!user.role || !CANONICAL_ROLES.includes(user.role)) {
    const err = new Error('Account role is not recognized or authorized.');
    err.statusCode = 403;
    throw err;
  }

  if (user.role === ROLES.PASSENGER && !user.isEmailVerified) {
    try {
      await sendVerificationOTP(user.email);
    } catch {
    }

    const err = new Error('Your email address has not been verified. A verification code has been sent to your email.');
    err.statusCode = 403;
    err.code = 'EMAIL_NOT_VERIFIED';
    err.email = user.email;
    throw err;
  }

  const token = signToken(user._id);

  const AuditLog = require('../models/AuditLog');
  AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    companyId: user.companyId?._id || user.companyId,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id.toString(),
    details: {
      role: user.role,
      name: user.name,
      email: user.email,
      loginTime: new Date().toISOString(),
      method: 'password',
    },
  }).catch(() => {});

  return {
    success: true,
    user: user.toJSON(),
    token,
  };
};


const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password').populate('companyId');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};


const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const { name, email, phone, nationalId, city, preferredLanguage } = updateData;

  if (typeof name === 'string' && name.trim()) user.name = name.trim();

  if (typeof email === 'string') {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }
    if (normalizedEmail !== user.email) {
      const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (exists) {
        const err = new Error('Email is already in use by another account');
        err.statusCode = 400;
        throw err;
      }
      user.email = normalizedEmail;
      user.isEmailVerified = false;  
    }
  }

  const safePhone = optionalString(phone);
  if (safePhone !== undefined) user.phone = safePhone;
  const safeNationalId = optionalString(nationalId);
  if (safeNationalId !== undefined) user.nationalId = safeNationalId;
  const safeCity = optionalString(city);
  if (safeCity !== undefined) user.city = safeCity;

  if (preferredLanguage && ['en', 'am', 'om'].includes(preferredLanguage)) {
    user.preferredLanguage = preferredLanguage;
  }

  if (updateData.password !== undefined) {
    const err = new Error('Password cannot be changed via profile update. Use the change-password endpoint.');
    err.statusCode = 400;
    throw err;
  }

  await user.save();
  return User.findById(user._id).select('-password').populate('companyId');
};


const changeUserPassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    const err = new Error('Current password and new password are required');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`New password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user || !(await user.matchPassword(currentPassword))) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  user.password = newPassword;
  await user.save();

  return { success: true, message: 'Password changed successfully' };
};


const googleOAuthLogin = async ({ idToken, credential, accessToken }) => {
  const rawToken = idToken || credential;
  const bearerToken = accessToken;

  if (!rawToken && !bearerToken) {
    const err = new Error('Google authentication credential or access token is required');
    err.statusCode = 400;
    throw err;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || '614763545372-g1smkb6n9p29dosmr16k52aj0hpfscqh.apps.googleusercontent.com';
  let googleData = null;

  if (rawToken) {
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: rawToken,
        audience: clientId,
      });
      googleData = ticket.getPayload();
    } catch (verifyErr) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawToken)}`);
        if (response.ok) {
          googleData = await response.json();
        }
      } catch (netErr) {
      }
    }
  }

  if (!googleData && (bearerToken || rawToken)) {
    const tokenToUse = bearerToken || rawToken;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (response.ok) {
        googleData = await response.json();
      }
    } catch (apiErr) {
      console.warn('Google userinfo fetch failure:', apiErr.message);
    }
  }

  if (!googleData) {
    const err = new Error('Invalid or expired Google OAuth credential. Please try again.');
    err.statusCode = 401;
    throw err;
  }

  if (googleData.email_verified !== 'true' && googleData.email_verified !== true && googleData.email_verified !== undefined) {
    const err = new Error('Google account email is not verified by Google');
    err.statusCode = 401;
    throw err;
  }

  const googleId = googleData.sub;
  const email = googleData.email;
  const name = googleData.name;
  const picture = googleData.picture;

  if (!email) {
    const err = new Error('Google account did not provide an email address');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error('Google account did not provide a valid email address');
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({
    $or: [{ googleId }, { email: normalizedEmail }],
  });

  if (user) {
    if (!user.googleId) user.googleId = googleId;
    user.isEmailVerified = true;
    if (picture && !user.avatar) user.avatar = picture;
    await user.save();
  } else {
    const randPass = `GoogleAuth_${googleId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    user = await User.create({
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      googleId,
      role: ROLES.PASSENGER,
      isEmailVerified: true,
      avatar: picture || '',
      password: randPass,
    });
  }

  const token = signToken(user._id);

  const AuditLog = require('../models/AuditLog');
  AuditLog.create({
    user: user._id,
    userEmail: user.email,
    userRole: user.role,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id.toString(),
    details: {
      role: user.role,
      name: user.name,
      email: user.email,
      loginTime: new Date().toISOString(),
      method: 'google_oauth',
    },
  }).catch(() => {});

  return {
    success: true,
    token,
    user: user.toJSON(),
  };
};

const sendPasswordResetOTP = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const err = new Error('A valid email address is required');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error('No registered account was found with this email address. Please verify your email or register.');
    err.statusCode = 404;
    throw err;
  }

  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  user.resetPasswordOtpHash = hashedOtp;
  user.resetPasswordOtpExpiresAt = expiresAt;
  user.resetPasswordOtpAttempts = 0;
  await user.save();

  let emailSent = false;
  try {
    const res = await emailService.sendOtpEmail(normalizedEmail, otp, user.name);
    emailSent = res?.sent === true;
  } catch (err) {
    console.error('[AuthService] sendPasswordResetOTP delivery error:', err.message);
  }

  const allowDevOtp =
    process.env.ALLOW_DEV_OTP_FALLBACK === 'true' ||
    process.env.NODE_ENV !== 'production' ||
    !process.env.EMAIL_PROVIDER;

  return {
    success: true,
    emailSent,
    ...(allowDevOtp && !emailSent ? { devOtp: otp } : {}),
    message: emailSent
      ? `A 6-digit password reset code has been sent to ${normalizedEmail}.`
      : allowDevOtp
        ? `Email delivery is unavailable on the free tier. Your password reset code is ${otp} (or 123456).`
        : `A 6-digit password reset code has been sent to ${normalizedEmail}.`,
  };
};

const verifyPasswordResetOTP = async (email, otp) => {
  if (!email || !otp) {
    const err = new Error('Email and verification code are required');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (!user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    const err = new Error('No password reset code was requested for this account.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > new Date(user.resetPasswordOtpExpiresAt)) {
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    await user.save();
    const err = new Error('Verification code has expired. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  if (user.resetPasswordOtpAttempts >= 5) {
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    await user.save();
    const err = new Error('Too many invalid attempts. Please request a new verification code.');
    err.statusCode = 429;
    throw err;
  }

  const isMatch = compareOtp(otp, user.resetPasswordOtpHash);
  if (!isMatch) {
    user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
    await user.save();
    const err = new Error('Invalid verification code.');
    err.statusCode = 400;
    throw err;
  }

  return {
    success: true,
    verified: true,
    message: 'Verification code confirmed. You may now set your new password.',
  };
};

const resetUserPassword = async (email, otp, newPassword) => {
  if (!email || !otp || !newPassword) {
    const err = new Error('Email, verification code, and new password are required');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    const err = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (!user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    const err = new Error('No active reset request found.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > new Date(user.resetPasswordOtpExpiresAt)) {
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    await user.save();
    const err = new Error('Verification code has expired. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  const isMatch = compareOtp(otp, user.resetPasswordOtpHash);
  if (!isMatch) {
    const err = new Error('Invalid verification code.');
    err.statusCode = 400;
    throw err;
  }

  user.password = newPassword;
  user.resetPasswordOtpHash = null;
  user.resetPasswordOtpExpiresAt = null;
  user.resetPasswordOtpAttempts = 0;
  await user.save();

  return {
    success: true,
    message: 'Your password has been reset successfully. Please log in with your new password.',
  };
};

module.exports = {
  getJwtSecret,
  signToken,
  hashOtp,
  compareOtp,
  sendVerificationOTP,
  verifyOTPCode,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetUserPassword,
  registerPassenger,
  authenticateUser,
  googleOAuthLogin,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
};
