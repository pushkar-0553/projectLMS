const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { normalizeIp } = require('./attendance.utils');

/**
 * Extracts and normalizes the client public IP resolved by Express's trusted proxy config.
 * Never reads client-supplied body/query IP fields.
 */
function extractClientIp(req, res, next) {
  const rawIp = req.ip || req.socket?.remoteAddress || '';
  const normalized = normalizeIp(rawIp);
  req.clientIp = normalized ? normalized.ip : null;
  req.clientIpFamily = normalized ? normalized.family : null;
  next();
}

/**
 * Rate limiter for public GET status and student search endpoints.
 * Sized generously because all campus students share the same institute public NAT IP.
 */
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || '0.0.0.0'),
  message: {
    success: false,
    message: 'Too many requests from this network. Please wait a moment and try again.'
  }
});

/**
 * Per-(IP + studentId) limiter to defend student PINs against brute force
 * without blocking classmates sharing the same institute NAT public IP.
 */
const studentPinSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip || '0.0.0.0');
    const sid = req.body?.studentId ? String(req.body.studentId).trim() : 'anon';
    return `${ipKey}::student:${sid}`;
  },
  message: {
    success: false,
    message: 'Too many attendance attempts for this student. Please wait 15 minutes before retrying.'
  }
});

/**
 * Overall per-IP burst ceiling for public submission endpoints.
 */
const campusSubmitBurstLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || '0.0.0.0'),
  message: {
    success: false,
    message: 'Submission rate limit reached for this network. Please wait a few minutes.'
  }
});

/**
 * Rate limiter for admin attendance mutations.
 */
const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.id ? `admin:${req.user.id}` : ipKeyGenerator(req.ip || '0.0.0.0')),
  message: {
    success: false,
    message: 'Too many administrative requests. Please slow down.'
  }
});

module.exports = {
  extractClientIp,
  publicReadLimiter,
  studentPinSubmitLimiter,
  campusSubmitBurstLimiter,
  adminMutationLimiter
};

