const https = require('https');
const crypto = require('crypto');
const chapaConfig = require('../config/chapa');


const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    if (!chapaConfig.secretKey) {
      const err = new Error('CHAPA_SECRET_KEY is not configured in backend/.env');
      err.statusCode = 500;
      return reject(err);
    }

    const url = new URL(chapaConfig.baseUrl + path);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${chapaConfig.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch {
          reject(new Error(`Non-JSON response received from Chapa API: ${rawData.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Chapa connection error: ${err.message}`)));
    if (postData) req.write(postData);
    req.end();
  });
};


const initializeTransaction = async ({
  amount,
  currency = 'ETB',
  email,
  firstName,
  lastName,
  txRef,
  callbackUrl,
  returnUrl,
  subaccountId = null,
  customization = {},
  meta = {},
}) => {
  const payload = {
    amount: String(amount),
    currency: currency.toUpperCase(),
    email,
    first_name: firstName || 'Passenger',
    last_name: lastName || 'User',
    tx_ref: txRef,
    callback_url: callbackUrl,
    return_url: returnUrl,
    customization: {
      title: customization.title || 'Ethio Trip',
      description: customization.description || 'Bus Ticket Booking',
    },
    meta,
  };

  if (subaccountId && String(subaccountId).trim()) {
    payload.subaccount = String(subaccountId).trim();
    payload.subaccounts = [
      {
        id: String(subaccountId).trim(),
      },
    ];
  }

  const res = await request('POST', '/transaction/initialize', payload);
  if (res.statusCode !== 200 || !res.body?.data?.checkout_url) {
    const errorMsg = res.body?.message || 'Chapa payment gateway rejected initialization';
    const err = new Error(errorMsg);
    err.statusCode = res.statusCode === 401 ? 401 : 400;
    err.chapaResponse = res.body;
    throw err;
  }

  return {
    checkoutUrl: res.body.data.checkout_url,
    txRef,
    rawResponse: res.body,
  };
};


const verifyTransaction = async (txRef) => {
  if (!txRef) {
    const err = new Error('Transaction reference is required');
    err.statusCode = 400;
    throw err;
  }

  const res = await request('GET', `/transaction/verify/${encodeURIComponent(txRef)}`);
  return {
    statusCode: res.statusCode,
    body: res.body,
    isSuccess: res.body?.status === 'success' && res.body?.data?.status === 'success',
    data: res.body?.data || null,
  };
};


const validateWebhookSignature = (rawPayload, signatureHeader) => {
  if (!chapaConfig.webhookSecret) {
    console.error('[Chapa] CHAPA_WEBHOOK_SECRET is not configured — webhook signature cannot be verified.');
    return false;
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') return false;

  try {
    const expected = crypto
      .createHmac('sha256', chapaConfig.webhookSecret)
      .update(Buffer.isBuffer(rawPayload) ? rawPayload : String(rawPayload))
      .digest('hex');

    const provided = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (provided.length !== expectedBuf.length) return false;

    return crypto.timingSafeEqual(provided, expectedBuf);
  } catch {
    return false;
  }
};

module.exports = {
  request,
  initializeTransaction,
  verifyTransaction,
  validateWebhookSignature,
};
