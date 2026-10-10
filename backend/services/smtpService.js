const nodemailer = require('nodemailer');
const db = require('../config/db');
const { encrypt, decrypt } = require('../config/crypto');
const { logAudit } = require('./auditService');
const { isHttpEmailConfigured, testHttpConnection } = require('./httpEmailSender');

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
  // Strip whitespace from app password (e.g. Google's 4x4 format "xxxx xxxx xxxx xxxx")
  const password = (data.password || data.appPassword || '').replace(/\s+/g, '');
  const username = (data.username || senderEmail).trim();
  const dailyQuota = parseInt(data.dailyQuota || 500, 10);
  const displayName = data.displayName || (senderEmail ? `LMS Mailer (${senderEmail.split('@')[0]})` : 'Exam Notification Service');

  let host = data.host;
  let port = data.port ? parseInt(data.port, 10) : null;
  let secureType = data.secureType;

  // Auto-detect HTTPS email provider or standard SMTP settings
  if (password.startsWith('re_') || (data.host || '').includes('resend')) {
    host = 'api.resend.com';
    port = 443;
    secureType = 'HTTPS';
  } else if (password.startsWith('xkeysib-') || (data.host || '').includes('brevo')) {
    host = 'api.brevo.com';
    port = 443;
    secureType = 'HTTPS';
  } else if (!host) {
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
    payload: { senderEmail, host, dailyQuota, secureType }
  });

  return { id: result.insertId };
}

/**
 * Test SMTP account connection with generous timeout and automatic alternate port & HTTPS fallback
 */
async function testSmtpConnection(accountId) {
  const [accounts] = await db.query(`SELECT * FROM smtp_accounts WHERE id = ?`, [accountId]);
  if (accounts.length === 0) throw new Error('SMTP account not found.');

  const acc = accounts[0];
  const plainPassword = decrypt(acc.encrypted_password, acc.iv, acc.auth_tag).replace(/\s+/g, '');

  // 1. If configured as an HTTPS email service (Resend, Brevo, SendGrid), verify over HTTPS (port 443)
  if (acc.secure_type === 'HTTPS' || isHttpEmailConfigured({ ...acc, plainPassword })) {
    try {
      const httpResult = await testHttpConnection({ smtpAcc: acc, plainPassword });
      await db.query(`
        UPDATE smtp_accounts 
        SET is_healthy = 1, consecutive_failures = 0, last_tested_at = NOW(), last_error_message = NULL
        WHERE id = ?
      `, [accountId]);
      return { success: true, message: httpResult.message };
    } catch (httpErr) {
      await db.query(`
        UPDATE smtp_accounts 
        SET is_healthy = 0, consecutive_failures = consecutive_failures + 1, last_tested_at = NOW(), last_error_message = ?
        WHERE id = ?
      `, [httpErr.message, accountId]);
      return { success: false, message: `HTTPS Email Verification failed: ${httpErr.message}` };
    }
  }

  // 2. Standard SMTP verification
  const createTransporter = (host, port, secure) => nodemailer.createTransport({
    host,
    port,
    secure,
    family: 4, // Force IPv4 to prevent ENETUNREACH errors on cloud/Render hosts
    auth: {
      user: acc.username,
      pass: plainPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
  });

  const isPrimarySecure = acc.secure_type === 'SSL' || acc.port === 465;
  const primaryTransporter = createTransporter(acc.host, acc.port, isPrimarySecure);

  try {
    await primaryTransporter.verify();
    await db.query(`
      UPDATE smtp_accounts 
      SET is_healthy = 1, consecutive_failures = 0, last_tested_at = NOW(), last_error_message = NULL
      WHERE id = ?
    `, [accountId]);
    return { success: true, message: `SMTP connection verified successfully on port ${acc.port}!` };
  } catch (err) {
    console.warn(`[SMTP Test] Primary connection on ${acc.host}:${acc.port} failed (${err.message}). Trying fallback port...`);

    // Automatic fallback between port 465 (SSL) and port 587 (STARTTLS)
    const altPort = acc.port === 465 ? 587 : 465;
    const altSecure = altPort === 465;
    try {
      const altTransporter = createTransporter(acc.host, altPort, altSecure);
      await altTransporter.verify();

      // Fallback verified! Update account config so subsequent dispatches use working port
      await db.query(`
        UPDATE smtp_accounts 
        SET port = ?, secure_type = ?, is_healthy = 1, consecutive_failures = 0, last_tested_at = NOW(), last_error_message = NULL
        WHERE id = ?
      `, [altPort, altSecure ? 'SSL' : 'STARTTLS', accountId]);

      return {
        success: true,
        message: `SMTP connection verified on fallback port ${altPort} (automatically updated setting to port ${altPort})!`
      };
    } catch (altErr) {
      // Diagnostic check for Render port blocking
      const isTimeout = /timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH/i.test(err.message);
      const friendlyMsg = isTimeout 
        ? `Connection timed out (${err.message}). Note: Cloud platforms like Render block outbound SMTP ports (25, 465, 587). To ensure emails send reliably on Render, enter a Resend or Brevo API key, which operates over HTTPS port 443.`
        : `SMTP verification failed: ${err.message}`;

      await db.query(`
        UPDATE smtp_accounts 
        SET is_healthy = 0, consecutive_failures = consecutive_failures + 1, last_tested_at = NOW(), last_error_message = ?
        WHERE id = ?
      `, [friendlyMsg, accountId]);
      return { success: false, message: friendlyMsg };
    }
  }
}

/**
 * Update SMTP account details (email, password, display name, quotas, host/port)
 */
async function updateSmtpAccount(accountId, data, userId) {
  const [existing] = await db.query(`SELECT * FROM smtp_accounts WHERE id = ?`, [accountId]);
  if (existing.length === 0) {
    throw new Error('SMTP account not found.');
  }
  const current = existing[0];

  const senderEmail = (data.senderEmail || data.email || current.sender_email).trim();
  const displayName = data.displayName !== undefined ? data.displayName : current.display_name;
  const dailyQuota = data.dailyQuota !== undefined ? parseInt(data.dailyQuota, 10) : current.daily_quota;
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active;

  let host = data.host || current.host;
  let port = data.port ? parseInt(data.port, 10) : current.port;
  let secureType = data.secureType || current.secure_type;

  // Auto-detect if host not explicitly modified but email domain changed
  if (!data.host && data.senderEmail && data.senderEmail !== current.sender_email) {
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
    }
  }

  let encrypted = current.encrypted_password;
  let iv = current.iv;
  let authTag = current.auth_tag;

  // If a new password or app password was passed, re-encrypt
  const rawPassword = (data.password || data.appPassword || '').trim();
  if (rawPassword) {
    const cleanPassword = rawPassword.replace(/\s+/g, '');
    const enc = encrypt(cleanPassword);
    encrypted = enc.encrypted;
    iv = enc.iv;
    authTag = enc.authTag;
  }

  const username = (data.username || senderEmail).trim();

  await db.query(`
    UPDATE smtp_accounts 
    SET display_name = ?,
        sender_email = ?,
        host = ?,
        port = ?,
        secure_type = ?,
        username = ?,
        encrypted_password = ?,
        iv = ?,
        auth_tag = ?,
        daily_quota = ?,
        is_active = ?,
        is_healthy = 1,
        consecutive_failures = 0,
        last_error_message = NULL
    WHERE id = ?
  `, [displayName, senderEmail, host, port, secureType, username, encrypted, iv, authTag, dailyQuota, isActive, accountId]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'SMTP_ACCOUNT_UPDATED',
    entityType: 'SMTP_ACCOUNT',
    entityId: accountId,
    payload: { senderEmail, host, port, dailyQuota, passwordUpdated: !!rawPassword }
  });

  try {
    const { invalidateTransporterPool } = require('./emailQueueWorker');
    if (typeof invalidateTransporterPool === 'function') invalidateTransporterPool(accountId);
  } catch (e) {}

  return { success: true, message: 'SMTP account updated successfully.' };
}

/**
 * Delete an SMTP account cleanly (unlinks existing jobs)
 */
async function deleteSmtpAccount(accountId, userId) {
  const [existing] = await db.query(`SELECT id, sender_email FROM smtp_accounts WHERE id = ?`, [accountId]);
  if (existing.length === 0) {
    throw new Error('SMTP account not found.');
  }

  // Clear foreign key references in jobs and logs to prevent FK constraint failures
  await db.query(`UPDATE email_jobs SET smtp_account_id = NULL WHERE smtp_account_id = ?`, [accountId]);
  await db.query(`UPDATE email_delivery_logs SET smtp_account_id = NULL WHERE smtp_account_id = ?`, [accountId]);

  await db.query(`DELETE FROM smtp_accounts WHERE id = ?`, [accountId]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'SMTP_ACCOUNT_DELETED',
    entityType: 'SMTP_ACCOUNT',
    entityId: accountId,
    payload: { senderEmail: existing[0].sender_email }
  });

  try {
    const { invalidateTransporterPool } = require('./emailQueueWorker');
    if (typeof invalidateTransporterPool === 'function') invalidateTransporterPool(accountId);
  } catch (e) {}

  return { success: true, message: 'SMTP account deleted successfully.' };
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
 * Pick next available healthy SMTP account with remaining quota (with active fallback)
 */
async function getNextAvailableSmtpAccount() {
  await resetDailyQuotasIfNeeded();

  let [accounts] = await db.query(`
    SELECT * FROM smtp_accounts 
    WHERE is_active = 1 AND is_healthy = 1 AND sent_today < daily_quota
    ORDER BY (sent_today / daily_quota) ASC, id ASC
    LIMIT 1
  `);

  if (accounts.length > 0) return accounts[0];

  // Resilient fallback: If no healthy account is found, allow testing an active account with lowest failures
  [accounts] = await db.query(`
    SELECT * FROM smtp_accounts 
    WHERE is_active = 1 AND sent_today < daily_quota
    ORDER BY consecutive_failures ASC, id ASC
    LIMIT 1
  `);

  if (accounts.length > 0) return accounts[0];
  return null;
}

module.exports = {
  listSmtpAccounts,
  createSmtpAccount,
  testSmtpConnection,
  updateSmtpAccount,
  deleteSmtpAccount,
  getNextAvailableSmtpAccount,
  resetDailyQuotasIfNeeded
};
