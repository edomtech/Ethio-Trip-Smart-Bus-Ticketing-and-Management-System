const dotenv = require('dotenv');
dotenv.config();

const cleanKey = (val) => {
  if (!val) return '';
  return String(val).trim().replace(/['"]/g, '').replace(/[^\x20-\x7E]/g, '');
};

module.exports = {
  secretKey: cleanKey(process.env.CHAPA_SECRET_KEY),
  webhookSecret: cleanKey(process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY),
  baseUrl: process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1',
  mode: (process.env.CHAPA_SECRET_KEY || '').includes('TEST') ? 'TEST' : 'LIVE',
  seatHoldMinutes: parseInt(process.env.SEAT_HOLD_MINUTES || '60', 10),
};
