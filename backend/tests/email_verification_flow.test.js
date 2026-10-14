'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const emailService = require('../services/emailService');
const authService = require('../services/authService');

describe('Email Verification Flow & Recipient Routing Tests', () => {
  let originalSendMail;
  let sentMails = [];

  before(() => {
    const transporter = emailService.createTransporter();
    if (transporter) {
      originalSendMail = transporter.sendMail;
    }
  });

  after(() => {
    sentMails = [];
  });

  test('TEST 1: Registration for passenger1@gmail.com routes OTP to passenger1@gmail.com', async () => {
    const targetRecipient = 'passenger1@gmail.com';
    const expectedSender = process.env.EMAIL_FROM || process.env.SMTP_USER;

    let capturedMailOptions = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedMailOptions = options;
        return { messageId: 'test-message-id-1' };
      }
    };

    const originalCreateTransporter = emailService.createTransporter;
    emailService.createTransporter = () => mockTransporter;

    try {
      const result = await emailService.sendOtpEmail(targetRecipient, '123456', 'Passenger 1');

      assert.equal(result.sent, true, 'OTP email sending should report success');
      assert.ok(capturedMailOptions !== null, 'sendMail should have been called');
      assert.equal(capturedMailOptions.to, targetRecipient, 'Recipient "to" must match passenger1@gmail.com');
      assert.ok(capturedMailOptions.from.includes(expectedSender), `Sender "from" must contain ${expectedSender}`);
    } finally {
      emailService.createTransporter = originalCreateTransporter;
    }
  });

  test('TEST 2: Registration for passenger2@gmail.com routes OTP to passenger2@gmail.com', async () => {
    const targetRecipient = 'passenger2@gmail.com';
    const expectedSender = process.env.EMAIL_FROM || process.env.SMTP_USER;

    let capturedMailOptions = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedMailOptions = options;
        return { messageId: 'test-message-id-2' };
      }
    };

    const originalCreateTransporter = emailService.createTransporter;
    emailService.createTransporter = () => mockTransporter;

    try {
      const result = await emailService.sendOtpEmail(targetRecipient, '654321', 'Passenger 2');

      assert.equal(result.sent, true, 'OTP email sending should report success');
      assert.ok(capturedMailOptions !== null, 'sendMail should have been called');
      assert.equal(capturedMailOptions.to, targetRecipient, 'Recipient "to" must match passenger2@gmail.com');
      assert.ok(capturedMailOptions.from.includes(expectedSender), `Sender "from" must contain ${expectedSender}`);
    } finally {
      emailService.createTransporter = originalCreateTransporter;
    }
  });

  test('TEST 3: Registration for edutaweke19@gmail.com (same as .env sender)', async () => {
    const targetRecipient = 'edutaweke19@gmail.com';
    const expectedSender = process.env.EMAIL_FROM || process.env.SMTP_USER;

    let capturedMailOptions = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedMailOptions = options;
        return { messageId: 'test-message-id-3' };
      }
    };

    const originalCreateTransporter = emailService.createTransporter;
    emailService.createTransporter = () => mockTransporter;

    try {
      const result = await emailService.sendOtpEmail(targetRecipient, '999888', 'Edu Taweke');

      assert.equal(result.sent, true, 'OTP email sending should report success');
      assert.ok(capturedMailOptions !== null, 'sendMail should have been called');
      assert.equal(capturedMailOptions.to, targetRecipient, 'Recipient "to" must match edutaweke19@gmail.com');
      assert.ok(capturedMailOptions.from.includes(expectedSender), `Sender "from" must contain ${expectedSender}`);
    } finally {
      emailService.createTransporter = originalCreateTransporter;
    }
  });

  test('TEST 4: Resend OTP for passenger1@gmail.com routes OTP to passenger1@gmail.com', async () => {
    const targetRecipient = 'passenger1@gmail.com';
    const expectedSender = process.env.EMAIL_FROM || process.env.SMTP_USER;

    let capturedMailOptions = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedMailOptions = options;
        return { messageId: 'test-message-id-4' };
      }
    };

    const originalCreateTransporter = emailService.createTransporter;
    emailService.createTransporter = () => mockTransporter;

    try {
      const result = await emailService.sendOtpEmail(targetRecipient, '112233', 'Passenger 1');

      assert.equal(result.sent, true, 'Resending OTP email should report success');
      assert.ok(capturedMailOptions !== null, 'sendMail should have been called');
      assert.equal(capturedMailOptions.to, targetRecipient, 'Resent OTP recipient "to" must match passenger1@gmail.com');
      assert.ok(capturedMailOptions.from.includes(expectedSender), `Sender "from" must contain ${expectedSender}`);
    } finally {
      emailService.createTransporter = originalCreateTransporter;
    }
  });
});
