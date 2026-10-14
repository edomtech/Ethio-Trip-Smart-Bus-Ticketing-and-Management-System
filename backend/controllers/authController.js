const authService = require('../services/authService');

const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendVerificationOTP(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOTPCode(email, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const result = await authService.registerPassenger(req.body);
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.authenticateUser(email, password);
    res.json(result);
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: err.message,
        email: err.email,
      });
    }
    if (err.code === 'VERIFICATION_PENDING') {
      return res.status(403).json({
        success: false,
        code: 'VERIFICATION_PENDING',
        message: err.message,
        email: err.email,
      });
    }
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user._id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateUserProfile(req.user._id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changeUserPassword(req.user._id, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

const googleLogin = async (req, res, next) => {
  try {
    const { idToken, credential, accessToken } = req.body;
    const result = await authService.googleOAuthLogin({ idToken, credential, accessToken });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendPasswordResetOTP(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyPasswordResetOTP(email, otp);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetUserPassword(email, otp, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendOTP,
  resendOTP: sendOTP,
  verifyOTP,
  verifyEmail: verifyOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
