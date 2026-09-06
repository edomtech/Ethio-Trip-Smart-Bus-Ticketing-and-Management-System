/**
 * test-connections.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE: A diagnostic tool you run BEFORE starting the server to verify all
 *          external dependencies are reachable. Run it with:
 *
 *            node test-connections.js
 *
 * It checks:
 *   1. MongoDB   — can the app reach localhost:27017?
 *   2. Chapa API — is the secret key valid and is api.chapa.co reachable?
 *   3. .env file — are all required environment variables present?
 *   4. Port 5000 — is the backend already running (or is port free)?
 * ─────────────────────────────────────────────────────────────────────────────
 */

const https = require('https');
const http  = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('\n=== EthioBus Connection Diagnostics ===\n');

// ── 1. Test MongoDB ──────────────────────────────────────────────────────────
console.log('1. Testing MongoDB connection...');
console.log('   URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('   ✅ MongoDB CONNECTED successfully');
    mongoose.disconnect();
  })
  .catch(err => {
    console.log('   ❌ MongoDB FAILED:', err.message);
    console.log('   → Fix: Run as Administrator then type: net start MongoDB');
    console.log('   → Or start manually: mongod --dbpath C:/data/db');
  });

// ── 2. Test Chapa API Key Format ─────────────────────────────────────────────
console.log('\n2. Testing Chapa configuration...');
const key = process.env.CHAPA_SECRET_KEY || '';
if (!key || key.includes('•')) {
  console.log('   ⚠️  CHAPA_SECRET_KEY may contain masked characters (•••) in .env');
  console.log('   → Open backend/.env and paste your real Chapa key');
} else if (!key.startsWith('CHASECK_TEST-') && !key.startsWith('CHASECK-')) {
  console.log('   ❌ CHAPA_SECRET_KEY format looks wrong. Should start with CHASECK_TEST-');
  console.log('   Key starts with:', key.substring(0, 20) + '...');
} else {
  console.log('   ✅ CHAPA_SECRET_KEY format is correct');
  console.log('   Mode:', key.startsWith('CHASECK_TEST-') ? 'TEST MODE 🧪' : 'LIVE MODE 💳');

  // 3. Test Chapa live API call
  console.log('\n3. Testing Chapa API connection...');
  const opts = {
    hostname: 'api.chapa.co',
    path: '/v1/transaction/initialize',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  };

  const body = JSON.stringify({
    amount: '1',
    currency: 'ETB',
    email: 'test@ethiobus.com',
    first_name: 'Test',
    last_name: 'User',
    tx_ref: 'TEST-CONN-' + Date.now(),
    return_url: 'http://localhost:5173',
    callback_url: 'http://localhost:5000/api/payments/chapa/webhook',
  });

  const req = https.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200 && json.status === 'success') {
          console.log('   ✅ Chapa API CONNECTED — checkout URL received');
        } else if (res.statusCode === 401) {
          console.log('   ❌ Chapa API: Invalid secret key (401 Unauthorized)');
          console.log('   → Get your key from: https://dashboard.chapa.co/settings/api');
        } else {
          console.log('   ⚠️  Chapa API responded with status', res.statusCode);
          console.log('   Response:', JSON.stringify(json).substring(0, 120));
        }
      } catch {
        console.log('   ❌ Chapa API: Could not parse response');
      }
    });
  });
  req.on('error', err => {
    console.log('   ❌ Chapa API: Network error -', err.message);
    console.log('   → Check your internet connection');
  });
  req.write(body);
  req.end();
}

// ── 4. Environment Variables ─────────────────────────────────────────────────
console.log('\n4. Environment variables:');
const required = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'CHAPA_SECRET_KEY', 'FRONTEND_URL'];
required.forEach(k => {
  const val = process.env[k];
  if (!val) {
    console.log(`   ❌ ${k}: MISSING`);
  } else {
    const display = ['JWT_SECRET', 'CHAPA_SECRET_KEY'].includes(k)
      ? `✅ Set (${val.length} chars)`
      : `✅ ${val}`;
    console.log(`   ${display.padEnd(4)} ${k}: ${display.includes('✅') ? display.replace('✅ ', '') : ''}`.replace('  ✅', '   ✅'));
  }
});

// ── 5. Check Port 5000 ───────────────────────────────────────────────────────
console.log('\n5. Checking if backend is already running on port 5000...');
const req5000 = http.get('http://localhost:5000/', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(d);
      if (json.message && json.message.includes('running')) {
        console.log('   ✅ Backend server IS running on port 5000');
        console.log('   Version:', json.version);
      }
    } catch {
      console.log('   ⚠️  Port 5000 has a response but it is not our API');
    }
  });
});
req5000.on('error', () => {
  console.log('   ℹ️  Backend is NOT running on port 5000 (this is fine before starting)');
  console.log('   → Start it with: node server.js');
});
req5000.end();

console.log('');
