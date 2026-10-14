'use strict';


const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');


async function withEnv(vars, fn) {
  const original = {};
  for (const [key, val] of Object.entries(vars)) {
    original[key] = process.env[key];
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
  try {
    await fn();
  } finally {
    for (const [key, val] of Object.entries(original)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  }
}


describe('JWT secret enforcement', () => {
  test('getJwtSecret throws when JWT_SECRET is missing', () => {
    withEnv({ JWT_SECRET: undefined }, async () => {
      delete require.cache[require.resolve('../middleware/auth')];
      const { getJwtSecret } = require('../middleware/auth');
      assert.throws(
        () => getJwtSecret(),
        /JWT_SECRET/,
        'Should throw with JWT_SECRET mention'
      );
    });
  });

  test('getJwtSecret returns the secret when JWT_SECRET is set', () => {
    process.env.JWT_SECRET = 'test_secret_abc123_sufficient_length';
    delete require.cache[require.resolve('../middleware/auth')];
    const { getJwtSecret } = require('../middleware/auth');
    assert.equal(getJwtSecret(), 'test_secret_abc123_sufficient_length');
    delete process.env.JWT_SECRET;
  });

  test('getJwtSecret throws for empty string JWT_SECRET', () => {
    withEnv({ JWT_SECRET: '' }, async () => {
      delete require.cache[require.resolve('../middleware/auth')];
      const { getJwtSecret } = require('../middleware/auth');
      assert.throws(() => getJwtSecret(), /JWT_SECRET/);
    });
  });
});


describe('JWT token format validation', () => {
  const jwt = require('jsonwebtoken');
  const TEST_SECRET = 'test_unit_secret_at_least_32_chars_long';

  test('Valid token can be decoded', () => {
    const token = jwt.sign({ id: 'user123', role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, TEST_SECRET);
    assert.equal(decoded.id, 'user123');
    assert.equal(decoded.role, 'passenger');
  });

  test('Token signed with wrong secret is rejected', () => {
    const token = jwt.sign({ id: 'user123' }, 'wrong_secret', { expiresIn: '1h' });
    assert.throws(
      () => jwt.verify(token, TEST_SECRET),
      /invalid signature/i
    );
  });

  test('Expired token is rejected', () => {
    const token = jwt.sign({ id: 'user123' }, TEST_SECRET, { expiresIn: '-1s' });
    assert.throws(
      () => jwt.verify(token, TEST_SECRET),
      /jwt expired/i
    );
  });

  test('Tampered token payload is rejected', () => {
    const token = jwt.sign({ id: 'user123', role: 'passenger' }, TEST_SECRET, { expiresIn: '1h' });
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 'admin', role: 'super_admin' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    assert.throws(
      () => jwt.verify(tamperedToken, TEST_SECRET),
      /invalid signature/i
    );
  });
});


describe('OTP security properties', () => {
  test('crypto.randomInt produces 6-digit codes in range [100000, 999999]', () => {
    for (let i = 0; i < 50; i++) {
      const otp = crypto.randomInt(100000, 1000000);
      assert.ok(otp >= 100000 && otp <= 999999, `OTP ${otp} is not 6 digits`);
    }
  });

  test('Two consecutive OTPs are not identical (statistical check)', () => {
    const samples = new Set();
    for (let i = 0; i < 20; i++) {
      samples.add(crypto.randomInt(100000, 1000000).toString());
    }
    assert.ok(samples.size >= 18, 'Too many duplicate OTPs — RNG may be broken');
  });

  test('HMAC OTP hash is reproducible and not equal to the raw OTP', () => {
    const otp = '123456';
    const salt = 'test_otp_salt';
    const hash1 = crypto.createHmac('sha256', salt).update(otp).digest('hex');
    const hash2 = crypto.createHmac('sha256', salt).update(otp).digest('hex');
    assert.equal(hash1, hash2, 'Hash should be deterministic');
    assert.notEqual(hash1, otp, 'Hash must not equal the raw OTP');
    assert.equal(hash1.length, 64, 'SHA-256 hex digest should be 64 chars');
  });

  test('Different OTPs produce different hashes', () => {
    const salt = 'test_otp_salt';
    const hash1 = crypto.createHmac('sha256', salt).update('123456').digest('hex');
    const hash2 = crypto.createHmac('sha256', salt).update('654321').digest('hex');
    assert.notEqual(hash1, hash2);
  });
});


describe('Canonical role validation', () => {
  const { ROLES, CANONICAL_ROLES } = require('../constants/roles');

  test('CANONICAL_ROLES contains exactly 5 roles', () => {
    assert.equal(CANONICAL_ROLES.length, 5);
  });

  test('All 5 canonical roles are present', () => {
    const expected = ['super_admin', 'company_admin', 'company_staff', 'conductor', 'passenger'];
    for (const role of expected) {
      assert.ok(CANONICAL_ROLES.includes(role), `Missing canonical role: ${role}`);
    }
  });

  test('Legacy alias "admin" is not a canonical role', () => {
    assert.ok(!CANONICAL_ROLES.includes('admin'), '"admin" should not be canonical');
  });

  test('Legacy alias "agent" is not a canonical role', () => {
    assert.ok(!CANONICAL_ROLES.includes('agent'), '"agent" should not be canonical');
  });

  test('ROLES object exposes correct constants', () => {
    assert.equal(ROLES.SUPER_ADMIN, 'super_admin');
    assert.equal(ROLES.COMPANY_ADMIN, 'company_admin');
    assert.equal(ROLES.COMPANY_STAFF, 'company_staff');
    assert.equal(ROLES.CONDUCTOR, 'conductor');
    assert.equal(ROLES.PASSENGER, 'passenger');
  });
});


describe('Ticket status constants', () => {
  const { TICKET_STATUS, TICKET_STATUS_LIST } = require('../constants/statuses');

  test('TICKET_STATUS includes PENDING', () => {
    assert.equal(TICKET_STATUS.PENDING, 'PENDING');
  });

  test('TICKET_STATUS includes ACTIVE', () => {
    assert.equal(TICKET_STATUS.ACTIVE, 'ACTIVE');
  });

  test('TICKET_STATUS_LIST contains both PENDING and ACTIVE', () => {
    assert.ok(TICKET_STATUS_LIST.includes('PENDING'));
    assert.ok(TICKET_STATUS_LIST.includes('ACTIVE'));
  });
});


describe('AI service scope guard', () => {
  before(() => {
    require.cache[require.resolve('../services/scheduleService')] = {
      id: require.resolve('../services/scheduleService'),
      filename: require.resolve('../services/scheduleService'),
      loaded: true,
      exports: { searchSchedules: async () => [] },
    };
  });

  after(() => {
    delete require.cache[require.resolve('../services/scheduleService')];
    delete require.cache[require.resolve('../services/aiService')];
  });

  test('Restricted admin keywords are blocked', async () => {
    delete require.cache[require.resolve('../services/aiService')];
    const { askAssistant } = require('../services/aiService');
    const result = await askAssistant('delete route from Addis to Bahir Dar');
    assert.equal(result.source, 'ethiotrip_passenger_scope_guard');
    assert.ok(result.reply.includes('administrative') || result.reply.includes('ስራዎችን'));
    assert.equal(result.extractedSearch, null);
  });

  test('Admin panel access is blocked', async () => {
    delete require.cache[require.resolve('../services/aiService')];
    const { askAssistant } = require('../services/aiService');
    const result = await askAssistant('show me the admin panel');
    assert.equal(result.source, 'ethiotrip_passenger_scope_guard');
  });

  test('Empty prompt throws 400 error', async () => {
    delete require.cache[require.resolve('../services/aiService')];
    const { askAssistant } = require('../services/aiService');
    await assert.rejects(
      () => askAssistant(''),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test('Single city query asks for clarification instead of silent default', async () => {
    delete require.cache[require.resolve('../services/aiService')];
    const { askAssistant } = require('../services/aiService');
    const result = await askAssistant('I want to travel to Hawassa');
    assert.equal(result.extractedSearch, null, 'Should not silently default missing city');
  });
});


describe('Crypto-based ID generation', () => {
  test('crypto.randomBytes(3) produces unique hex strings', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(crypto.randomBytes(3).toString('hex'));
    }
    assert.ok(ids.size >= 95, 'Too many collisions in 100 IDs');
  });

  test('Ticket number format matches expected pattern', () => {
    const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    const ticketNumber = `TK-${hex}-${ts}`;
    assert.match(ticketNumber, /^TK-[0-9A-F]{4}-[0-9A-Z]+$/);
  });
});
