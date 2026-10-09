const nodemailer = require('nodemailer');
const db = require('../config/db');
const { encrypt, decrypt } = require('../config/crypto');
const { logAudit } = require('./auditService');

/**
 * List all SMTP accounts (passwords sanitized/masked)
 */
async function listSmtpAccounts() {
  const [rows] = await db.query(`
    SELECT 
      id,
      display_name,
      sender_email,
      host,
      port,
      secure_type,
      username,
      daily_quota,
      sent_today,
      last_reset_date,
      is_active,
      is_healthy,
      consecutive_failures,
      last_tested_at,
      last_error_message,
      created_at
    FROM smtp_accounts
    ORDER BY id ASC
  `);
  return rows;
}

/**
 * Create a new SMTP account with encrypted password (supports simplified email + appPassword + dailyQuota)
 */
async function createSmtpAccount(data, userId) {
  const senderEmail = (data.senderEmail || data.email || '').trim();
  const password = (data.password || data.appPassword || '').trim();
  const username = (data.username || senderEmail).trim();
  const dailyQuota = parseInt(data.dailyQuota || 500, 10);
  const displayName = data.displayName || (senderEmail ? `LMS Mailer (${senderEmail.split('@')[0]})` : 'Exam Notification Service');

  let host = data.host;
  let port = data.port;
  let secureType = data.secureType;

  // Auto-detect SMTP settings from email domain if not manually given
  if (!host) {
    const domain = (senderEmail.split('@')[1] || '').toLowerCase();
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      host = 'smtp.gmail.com';
      port = 465;
      secureType = 'SSL';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
      host = 'smtp-mail.outlook.com';
      port = 587;
      secureType = 'STARTTLS';
    } else if (domain === 'yahoo.com') {
      host = 'smtp.mail.yahoo.com';
      port = 465;
      secureType = 'SSL';
    } else {
      host = 'smtp.gmail.com'; // Default to Gmail/Google Workspace standard
      port = 465;
      secureType = 'SSL';
    }
  }
  if (!port) port = 465;
  if (!secureType) secureType = port === 465 ? 'SSL' : 'STARTTLS';

  const { encrypted, iv, authTag } = encrypt(password);

  const [result] = await db.query(`
    INSERT INTO smtp_accounts 
      (display_name, sender_email, host, port, secure_type, username, encrypted_password, iv, auth_tag, daily_quota, sent_today, is_active, is_healthy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1)
  `, [displayName, senderEmail, host, port, secureType, username, encrypted, iv, authTag, dailyQuota]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'SMTP_ACCOUNT_CREATED',
    entityType: 'SMTP_ACCOUNT',
    entityId: result.insertId,
    payload: { senderEmail, host, dailyQuota }
  });

  return { id: result.insertId };
}

/**
 * Test SMTP account connection
 */
async function testSmtpConnection(accountId) {
  const [accounts] = await db.query(`SELECT * FROM smtp_accounts WHERE id = ?`, [accountId]);
  if (accounts.length === 0) throw new Error('SMTP account not found.');

  const acc = accounts[0];
  const plainPassword = decrypt(acc.encrypted_password, acc.iv, acc.auth_tag);

  const transporter = nodemailer.createTransport({
    host: acc.host,
    port: acc.port,
    secure: acc.secure_type === 'SSL' || acc.port === 465,
    auth: {
      user: acc.username,
      pass: plainPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000
  });

  try {
    await transporter.verify();
    await db.query(`
      UPDATE smtp_accounts 
      SET is_healthy = 1, consecutive_failures = 0, last_tested_at = NOW(), last_error_message = NULL
      WHERE id = ?
    `, [accountId]);
    return { success: true, message: 'SMTP connection verified successfully!' };
  } catch (err) {
    await db.query(`
      UPDATE smtp_accounts 
      SET is_healthy = 0, consecutive_failures = consecutive_failures + 1, last_tested_at = NOW(), last_error_message = ?
      WHERE id = ?
    `, [err.message, accountId]);
    return { success: false, message: `SMTP verification failed: ${err.message}` };
  }
}

/**
 * Toggle active state or update daily quota
 */
async function updateSmtpAccount(accountId, data, userId) {
  const { displayName, dailyQuota, isActive } = data;
  await db.query(`
    UPDATE smtp_accounts 
    SET display_name = COALESCE(?, display_name),
        daily_quota = COALESCE(?, daily_quota),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `, [displayName, dailyQuota, isActive, accountId]);

  return { success: true };
}

/**
 * Reset daily sent count if day has changed
 */
async function resetDailyQuotasIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  await db.query(`
    UPDATE smtp_accounts 
    SET sent_today = 0, last_reset_date = ?
    WHERE last_reset_date IS NULL OR last_reset_date < ?
  `, [today, today]);
}

/**
 * Pick next available healthy SMTP account with remaining quota
 */
async function getNextAvailableSmtpAccount() {
  await resetDailyQuotasIfNeeded();

  const [accounts] = await db.query(`
    SELECT * FROM smtp_accounts 
    WHERE is_active = 1 AND is_healthy = 1 AND sent_today < daily_quota
    ORDER BY (sent_today / daily_quota) ASC, id ASC
    LIMIT 1
  `);

  if (accounts.length === 0) return null;
  return accounts[0];
}

module.exports = {
  listSmtpAccounts,
  createSmtpAccount,
  testSmtpConnection,
  updateSmtpAccount,
  getNextAvailableSmtpAccount,
  resetDailyQuotasIfNeeded
};
