const { normalizeIp, normalizeCidr, isValidUuid } = require('./attendance.utils');

class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

function parsePositiveInt(val, fieldName) {
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }
  return num;
}

function validatePin(pin) {
  if (typeof pin !== 'string' && typeof pin !== 'number') {
    throw new ValidationError('Student PIN is required.');
  }
  const str = String(pin).trim();
  if (!/^\d{4}$/.test(str)) {
    throw new ValidationError('PIN must be 4 numeric digits (last 4 digits of your registered mobile number).');
  }
  return str;
}

function validateDateString(dateStr, fieldName = 'Date') {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format.`);
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new ValidationError(`${fieldName} is not a valid calendar date.`);
  }
  return dateStr.trim();
}

function validateOfflineSubmission(body = {}) {
  const studentId = parsePositiveInt(body.studentId, 'studentId');
  const pin = validatePin(body.pin);

  if (!isValidUuid(body.deviceUuid)) {
    throw new ValidationError('A valid device UUID is required.');
  }

  return {
    studentId,
    pin,
    deviceUuid: body.deviceUuid.trim().toLowerCase()
  };
}

function validateOnlineSubmission(body = {}) {
  const studentId = parsePositiveInt(body.studentId, 'studentId');
  const pin = validatePin(body.pin);

  if (!isValidUuid(body.deviceUuid)) {
    throw new ValidationError('A valid device UUID is required.');
  }

  const rawCode = typeof body.sessionCode === 'string' ? body.sessionCode.trim().toUpperCase() : '';
  if (!rawCode || !/^[A-Z0-9-]{4,32}$/.test(rawCode)) {
    throw new ValidationError('Please enter a valid attendance session code.');
  }

  return {
    studentId,
    pin,
    deviceUuid: body.deviceUuid.trim().toLowerCase(),
    sessionCode: rawCode
  };
}

function validateIpList(items, expectedFamily, label) {
  if (items === undefined || items === null) return [];
  if (!Array.isArray(items)) {
    throw new ValidationError(`${label} must be an array.`);
  }
  const normalizedSet = new Set();
  for (const raw of items) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) continue;
    const norm = normalizeIp(trimmed);
    if (!norm || norm.family !== expectedFamily) {
      throw new ValidationError(`Invalid ${label} entry: "${trimmed}".`);
    }
    normalizedSet.add(norm.ip);
  }
  return Array.from(normalizedSet);
}

function validateCidrList(items) {
  if (items === undefined || items === null) return [];
  if (!Array.isArray(items)) {
    throw new ValidationError('CIDR ranges must be an array.');
  }
  const normalizedSet = new Set();
  for (const raw of items) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) continue;
    const norm = normalizeCidr(trimmed);
    if (!norm) {
      throw new ValidationError(`Invalid CIDR range: "${trimmed}". Expected format like 203.0.113.0/24 or 2001:db8::/32.`);
    }
    normalizedSet.add(norm.cidr);
  }
  return Array.from(normalizedSet);
}

function validateWifiSettings(body = {}) {
  const networkDisplayName =
    typeof body.networkDisplayName === 'string' && body.networkDisplayName.trim()
      ? body.networkDisplayName.trim().slice(0, 255)
      : 'Institute Campus Wi-Fi';

  const allowedIpv4 = validateIpList(body.allowedIpv4, 'ipv4', 'IPv4 address');
  const allowedIpv6 = validateIpList(body.allowedIpv6, 'ipv6', 'IPv6 address');
  const allowedCidrs = validateCidrList(body.allowedCidrs);

  return {
    networkDisplayName,
    allowedIpv4,
    allowedIpv6,
    allowedCidrs,
    offlineAttendanceEnabled: Boolean(body.offlineAttendanceEnabled),
    onlineAttendanceEnabled:
      body.onlineAttendanceEnabled === undefined ? true : Boolean(body.onlineAttendanceEnabled),
    deviceRestrictionEnabled:
      body.deviceRestrictionEnabled === undefined ? true : Boolean(body.deviceRestrictionEnabled)
  };
}

function validateManualAttendance(body = {}) {
  const studentId = parsePositiveInt(body.studentId, 'studentId');
  const attendanceDate = body.attendanceDate
    ? validateDateString(body.attendanceDate, 'attendanceDate')
    : null;

  const mode = typeof body.attendanceMode === 'string' ? body.attendanceMode.trim().toUpperCase() : '';
  if (!['OFFLINE', 'ONLINE'].includes(mode)) {
    throw new ValidationError('attendanceMode must be OFFLINE or ONLINE.');
  }

  const status = body.status ? String(body.status).trim().toUpperCase() : 'PRESENT';
  if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
    throw new ValidationError('status must be PRESENT, ABSENT, LATE, or EXCUSED.');
  }

  const reason = typeof body.correctionReason === 'string' ? body.correctionReason.trim() : '';
  if (reason.length < 3 || reason.length > 500) {
    throw new ValidationError('Correction reason must be between 3 and 500 characters.');
  }

  return {
    studentId,
    attendanceDate,
    attendanceMode: mode,
    status,
    correctionReason: reason
  };
}

function validateCreateSession(body = {}) {
  const batchId = parsePositiveInt(body.batchId, 'batchId');
  const sessionDate = body.sessionDate
    ? validateDateString(body.sessionDate, 'sessionDate')
    : null;
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 255) : null;

  let expiresInMinutes = null;
  if (body.expiresInMinutes !== undefined && body.expiresInMinutes !== null && body.expiresInMinutes !== '') {
    const mins = Number(body.expiresInMinutes);
    if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
      throw new ValidationError('expiresInMinutes must be between 1 and 1440 minutes.');
    }
    expiresInMinutes = Math.round(mins);
  }

  let expiresAt = null;
  if (body.expiresAt) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('expiresAt must be a valid ISO timestamp.');
    }
    expiresAt = parsed;
  }

  if (!expiresInMinutes && !expiresAt) {
    expiresInMinutes = 30;
  }

  let customCode = null;
  if (body.sessionCode && typeof body.sessionCode === 'string' && body.sessionCode.trim()) {
    const c = body.sessionCode.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,32}$/.test(c)) {
      throw new ValidationError('Custom session code must be 4-32 alphanumeric/hyphen characters.');
    }
    customCode = c;
  }

  return {
    batchId,
    sessionDate,
    title: title || null,
    expiresInMinutes,
    expiresAt,
    customCode
  };
}

function validatePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  ValidationError,
  parsePositiveInt,
  validatePin,
  validateDateString,
  validateOfflineSubmission,
  validateOnlineSubmission,
  validateWifiSettings,
  validateManualAttendance,
  validateCreateSession,
  validatePagination
};

