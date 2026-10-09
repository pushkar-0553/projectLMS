const crypto = require('crypto');

// Master encryption key (32 bytes)
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || 'c3f1b4e8a2d90f5c71a3e6b8d2f40a1c5e7b9d3f1a2c4e6b8d0f2a4c6e8b0d2f';
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive plain text (e.g. SMTP App Password)
 */
function encrypt(plainText) {
  if (!plainText) return { encrypted: '', iv: '', authTag: '' };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt cipher text
 */
function decrypt(encryptedHex, ivHex, authTagHex) {
  if (!encryptedHex || !ivHex || !authTagHex) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
function generateSecureOTP() {
  const otpNumber = crypto.randomInt(100000, 999999);
  return otpNumber.toString();
}

/**
 * Hash an OTP with a unique salt
 */
function hashOTP(otp, salt) {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

/**
 * Generate a random salt (32 bytes hex)
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate random opaque session token (64 hex characters)
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateSecureOTP,
  hashOTP,
  generateSalt,
  generateSessionToken
};
