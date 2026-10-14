const express = require('express');
const { chapaWebhook } = require('../controllers/paymentController');

const router = express.Router();


router.post('/chapa/webhook', express.raw({ type: '*/*', limit: '1mb' }), (req, res, next) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  req.rawBody = raw;

  try {
    req.body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  } catch {
    return res.status(400).json({ success: false, message: 'Malformed webhook payload' });
  }

  next();
}, chapaWebhook);

module.exports = router;