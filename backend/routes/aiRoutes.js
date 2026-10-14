const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { askAssistant } = require('../controllers/aiController');
const { optionalProtect } = require('../middleware/auth');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many queries to Ethio Trip assistant. Please slow down.' },
});

router.post('/ask', optionalProtect, aiLimiter, askAssistant);

module.exports = router;
