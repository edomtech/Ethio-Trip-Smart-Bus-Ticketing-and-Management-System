const router = require('express').Router();
const {
  sendOTP,
  verifyOTP,
  register,
  login,
  googleAuth,
  getMe,
  updateProfile,
  changePassword,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', logout);

module.exports = router;
