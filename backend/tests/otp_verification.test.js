'use strict';


const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Company = require('../models/Company');
const PendingRegistration = require('../models/PendingRegistration');
const authService = require('../services/authService');
const emailService = require('../services/emailService');

const TEST_EMAIL = 'otp_test_passenger_' + Date.now() + '@example.com';
const TEST_PASSWORD = 'TestPassword123!';

async function runTests() {
  console.log('🚀 Starting OTP Verification & Authentication Test Suite...\n');
  const results = [];

  const assert = (condition, name) => {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      results.push({ name, status: 'PASS' });
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      results.push({ name, status: 'FAIL' });
    }
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ethio_trip');
    console.log('📦 Connected to MongoDB.\n');

    await User.deleteMany({ email: { $regex: /otp_test_passenger/ } });
    await PendingRegistration.deleteMany({ email: { $regex: /otp_test_passenger/ } });

    console.log('--- Test Group: Email Configuration ---');
    const transporter = emailService.createTransporter();
    assert(transporter !== null, 'Gmail SMTP transporter initializes correctly from environment');

    console.log('\n--- Test Group: Input Validation ---');
    try {
      await authService.registerPassenger({
        name: 'Invalid Email User',
        email: '',
        password: TEST_PASSWORD,
      });
      assert(false, 'Registration with invalid email should throw 400');
    } catch (err) {
      assert(err.statusCode === 400, 'Registration with missing/invalid email rejected with 400');
    }

    try {
      await authService.registerPassenger({
        name: 'Short Pass User',
        email: 'shortpass@example.com',
        password: '123',
      });
      assert(false, 'Registration with short password should throw 400');
    } catch (err) {
      assert(err.statusCode === 400, 'Registration with short password rejected with 400');
    }

    console.log('\n--- Test Group: Registration & Pending State ---');
    const regResult = await authService.registerPassenger({
      name: 'Test Passenger',
      email: TEST_EMAIL,
      phone: '0911223344',
      nationalId: 'ETH1234567',
      password: TEST_PASSWORD,
      city: 'Addis Ababa',
    });

    assert(regResult.success === true, 'Registration succeeds and returns success: true');
    assert(regResult.devOtp === undefined, 'Security check: plain OTP is NEVER exposed in API response');

    const unverifiedInUserCol = await User.findOne({ email: TEST_EMAIL });
    assert(unverifiedInUserCol === null, 'Security check: unverified user is NOT created in User collection prior to OTP');

    const pendingRecord = await PendingRegistration.findOne({ email: TEST_EMAIL });
    assert(pendingRecord !== null, 'PendingRegistration record created');
    assert(pendingRecord.otpHash && pendingRecord.otpHash.length === 64, 'OTP is stored as SHA-256 HMAC hash, never plain text');
    assert(new Date(pendingRecord.otpExpiresAt) > new Date(), 'OTP expiration time set in future (10-15 minutes)');

    console.log('\n--- Test Group: Account Protection Prior to Verification ---');
    try {
      await authService.authenticateUser(TEST_EMAIL, TEST_PASSWORD);
      assert(false, 'Login before email verification must be blocked');
    } catch (err) {
      assert(err.statusCode === 401 || err.statusCode === 403, 'Unverified user cannot log in (blocked with 401/403)');
    }

    console.log('\n--- Test Group: OTP Verification & Attempt Limits ---');
    try {
      await authService.verifyOTPCode(TEST_EMAIL, '000000');
      assert(false, 'Incorrect OTP must be rejected');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('Invalid verification code'), 'Incorrect OTP rejected with 400 and clear error');
    }

    const afterBadAttempt = await PendingRegistration.findOne({ email: TEST_EMAIL });
    assert(afterBadAttempt.otpAttempts === 1, 'Failed attempt counter incremented in database');

    try {
      await authService.verifyOTPCode('different_email@example.com', '123456');
      assert(false, 'Verification for non-existent/different email must fail');
    } catch (err) {
      assert(err.statusCode === 404, 'Non-existent email rejected with 404');
    }

    console.log('\n--- Test Group: Cooldown & Rate Limiting ---');
    try {
      await authService.sendVerificationOTP(TEST_EMAIL);
      assert(false, 'Rapid resend within 60 seconds must be rate-limited');
    } catch (err) {
      assert(err.statusCode === 429, 'Resend within 60s cooldown rejected with 429 Too Many Requests');
    }

    console.log('\n--- Test Group: Expiration & Lockout ---');
    await PendingRegistration.updateOne(
      { email: TEST_EMAIL },
      { $set: { otpExpiresAt: new Date(Date.now() - 1000) } }
    );
    try {
      await authService.verifyOTPCode(TEST_EMAIL, '123456');
      assert(false, 'Expired OTP must be rejected');
    } catch (err) {
      if (!err.statusCode || !err.message.includes('expired')) {
        console.error('Test 9 unexpected error:', err);
      }
      assert(err.statusCode === 400 && err.message.includes('expired'), 'Expired OTP rejected with 400 Expired message');
    }

    const validOtp = '849201';
    const validHash = authService.hashOtp(validOtp);
    await PendingRegistration.updateOne(
      { email: TEST_EMAIL },
      {
        $set: {
          otpHash: validHash,
          otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          otpAttempts: 5,
        }
      }
    );
    try {
      await authService.verifyOTPCode(TEST_EMAIL, validOtp);
      assert(false, 'Locked out OTP after 5 attempts must reject even correct code');
    } catch (err) {
      if (err.statusCode !== 429) {
        console.error('Test 10 unexpected error:', err);
      }
      assert(err.statusCode === 429, 'Excessive attempts locked out with 429 Too Many Requests');
    }

    console.log('\n--- Test Group: Successful Verification Flow ---');
    const freshOtp = '531984';
    const freshHash = authService.hashOtp(freshOtp);
    await PendingRegistration.updateOne(
      { email: TEST_EMAIL },
      {
        $set: {
          otpHash: freshHash,
          otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          otpAttempts: 0,
        }
      }
    );

    const verifyResult = await authService.verifyOTPCode(TEST_EMAIL, freshOtp);
    assert(verifyResult.success === true, 'Verification succeeds with valid code');
    assert(!!verifyResult.token, 'JWT authentication token returned upon successful verification');
    assert(verifyResult.user.email === TEST_EMAIL, 'User object returned for verified email');
    assert(verifyResult.user.isEmailVerified === true, 'User is marked isEmailVerified: true');

    const pendingAfterSuccess = await PendingRegistration.findOne({ email: TEST_EMAIL });
    assert(pendingAfterSuccess === null, 'PendingRegistration record cleaned up after verification');

    const createdUser = await User.findOne({ email: TEST_EMAIL });
    assert(createdUser !== null && createdUser.isEmailVerified === true, 'User officially persisted to MongoDB User collection');

    console.log('\n--- Test Group: Post-Verification Idempotency & Protection ---');
    const reuseResult = await authService.verifyOTPCode(TEST_EMAIL, freshOtp);
    assert(reuseResult.alreadyVerified === true, 'Re-verifying an already verified account safely reports already verified');

    try {
      await authService.registerPassenger({
        name: 'Duplicate User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      assert(false, 'Duplicate registration with verified email must fail');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('already registered'), 'Duplicate registration rejected with 400 already registered');
    }

    console.log('\n--- Test Group: Login Verification ---');
    const loginResult = await authService.authenticateUser(TEST_EMAIL, TEST_PASSWORD);
    assert(loginResult.success === true, 'Verified passenger successfully logs in');
    assert(!!loginResult.token, 'JWT token returned on valid login');
    assert(loginResult.user.role === 'passenger', 'User role is confirmed as passenger');

    await User.deleteOne({ email: TEST_EMAIL });
    console.log('\n🧹 Test passenger cleaned up from database.');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`\n==========================================================`);
    console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (${results.length} total)`);
    console.log(`==========================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (globalErr) {
    console.error('Fatal error during test run:', globalErr);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
