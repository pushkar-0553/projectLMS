const net = require('net');
const crypto = require('crypto');

const IST_TIMEZONE = 'Asia/Kolkata';

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

const istDateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

function getIstDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return istDateFormatter.format(d);
}

function getIstOffsetDateString(daysDelta = 0, baseDate = new Date()) {
  const istToday = getIstDateString(baseDate);
  const [y, m, d] = istToday.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d + daysDelta);
  return new Date(utcMidnight).toISOString().slice(0, 10);
}

function formatIstTime(date) {
  if (!date) return null;
  const d = parseUtcDate(date);
  if (!d || Number.isNaN(d.getTime())) return null;
  return istTimeFormatter.format(d);
}

function formatIstDateTime(date) {
  if (!date) return null;
  const d = parseUtcDate(date);
  if (!d || Number.isNaN(d.getTime())) return null;
  return istDateTimeFormatter.format(d);
}

function toUtcMysqlDatetime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function parseUtcDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return null;
  // Already ISO with timezone
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    return new Date(str);
  }
  // MySQL DATETIME 'YYYY-MM-DD HH:MM:SS' stored in UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    return new Date(str.replace(' ', 'T') + 'Z');
  }
  return new Date(str);
}

function expandIpv6ToGroups(ip) {
  const clean = ip.toLowerCase();
  const halves = clean.split('::');
  if (halves.length > 2) return null;

  const parseSide = (side) => {
    if (!side) return [];
    const parts = side.split(':');
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes('.')) {
        // Embedded IPv4 in last position
        if (i !== parts.length - 1 || net.isIPv4(part) === false) return null;
        const octets = part.split('.').map(Number);
        out.push((octets[0] << 8) | octets[1]);
        out.push((octets[2] << 8) | octets[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
        out.push(parseInt(part, 16));
      }
    }
    return out;
  };

  if (halves.length === 1) {
    const groups = parseSide(halves[0]);
    if (!groups || groups.length !== 8) return null;
    return groups;
  }

  const left = parseSide(halves[0]);
  const right = parseSide(halves[1]);
  if (!left || !right || left.length + right.length >= 8) return null;
  const missing = 8 - (left.length + right.length);
  return [...left, ...new Array(missing).fill(0), ...right];
}

function compressIpv6Groups(groups) {
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === 0) {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestLen < 2) {
    return groups.map((g) => g.toString(16)).join(':');
  }

  const left = groups.slice(0, bestStart).map((g) => g.toString(16)).join(':');
  const right = groups.slice(bestStart + bestLen).map((g) => g.toString(16)).join(':');
  return `${left}::${right}`;
}

function normalizeIp(rawIp) {
  if (!rawIp || typeof rawIp !== 'string') return null;
  let candidate = rawIp.trim();
  if (!candidate) return null;

  // Handle comma-separated string defensively (take first trimmed token only if internal helper is misused)
  if (candidate.includes(',')) {
    candidate = candidate.split(',')[0].trim();
  }

  // Strip bracketed IPv6 with optional port: [2001:db8::1]:443
  const bracketMatch = candidate.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) {
    candidate = bracketMatch[1];
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    // Strip IPv4:port
    candidate = candidate.split(':')[0];
  }

  // Strip IPv6 zone index (%eth0)
  const zoneIdx = candidate.indexOf('%');
  if (zoneIdx !== -1) {
    candidate = candidate.slice(0, zoneIdx);
  }

  const version = net.isIP(candidate);
  if (version === 4) {
    const canonicalV4 = candidate
      .split('.')
      .map((o) => String(parseInt(o, 10)))
      .join('.');
    return { ip: canonicalV4, family: 'ipv4' };
  }

  if (version === 6) {
    const groups = expandIpv6ToGroups(candidate);
    if (!groups) return null;

    // Unwrap IPv4-mapped IPv6 (::ffff:a.b.c.d)
    const isV4Mapped =
      groups[0] === 0 &&
      groups[1] === 0 &&
      groups[2] === 0 &&
      groups[3] === 0 &&
      groups[4] === 0 &&
      groups[5] === 0xffff;

    if (isV4Mapped) {
      const a = (groups[6] >> 8) & 0xff;
      const b = groups[6] & 0xff;
      const c = (groups[7] >> 8) & 0xff;
      const d = groups[7] & 0xff;
      return { ip: `${a}.${b}.${c}.${d}`, family: 'ipv4' };
    }

    return { ip: compressIpv6Groups(groups), family: 'ipv6' };
  }

  return null;
}

function ipToBuffer(rawIp) {
  const norm = normalizeIp(rawIp);
  if (!norm) return null;

  if (norm.family === 'ipv4') {
    const octets = norm.ip.split('.').map((n) => parseInt(n, 10));
    return Buffer.from(octets);
  }

  const groups = expandIpv6ToGroups(norm.ip);
  if (!groups) return null;
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 8; i++) {
    buf.writeUInt16BE(groups[i], i * 2);
  }
  return buf;
}

function normalizeCidr(rawCidr) {
  if (!rawCidr || typeof rawCidr !== 'string') return null;
  const parts = rawCidr.trim().split('/');
  if (parts.length !== 2) return null;

  const normIp = normalizeIp(parts[0]);
  if (!normIp) return null;

  if (!/^\d+$/.test(parts[1])) return null;
  const prefix = parseInt(parts[1], 10);
  const maxPrefix = normIp.family === 'ipv4' ? 32 : 128;
  if (prefix < 0 || prefix > maxPrefix) return null;

  return {
    cidr: `${normIp.ip}/${prefix}`,
    network: normIp.ip,
    prefix,
    family: normIp.family
  };
}

function checkIpMatchesSettings(rawClientIp, settings) {
  const normClient = normalizeIp(rawClientIp);
  if (!normClient) {
    return {
      matched: false,
      normalizedIp: null,
      family: null,
      reason: 'Unable to determine a valid client IP address.'
    };
  }

  const allowedIpv4 = Array.isArray(settings?.allowed_ipv4) ? settings.allowed_ipv4 : [];
  const allowedIpv6 = Array.isArray(settings?.allowed_ipv6) ? settings.allowed_ipv6 : [];
  const allowedCidrs = Array.isArray(settings?.allowed_cidrs) ? settings.allowed_cidrs : [];

  const blockList = new net.BlockList();
  let ruleCount = 0;

  for (const entry of allowedIpv4) {
    const norm = normalizeIp(entry);
    if (norm && norm.family === 'ipv4') {
      blockList.addAddress(norm.ip, 'ipv4');
      ruleCount++;
    }
  }

  for (const entry of allowedIpv6) {
    const norm = normalizeIp(entry);
    if (norm && norm.family === 'ipv6') {
      blockList.addAddress(norm.ip, 'ipv6');
      ruleCount++;
    }
  }

  for (const entry of allowedCidrs) {
    const normCidr = normalizeCidr(entry);
    if (normCidr) {
      blockList.addSubnet(normCidr.network, normCidr.prefix, normCidr.family);
      ruleCount++;
    }
  }

  if (ruleCount === 0) {
    return {
      matched: false,
      normalizedIp: normClient.ip,
      family: normClient.family,
      reason: 'Institute Wi-Fi IP allowlist is not configured yet.'
    };
  }

  const matched = blockList.check(normClient.ip, normClient.family);
  return {
    matched,
    normalizedIp: normClient.ip,
    family: normClient.family,
    reason: matched
      ? 'Client IP matched configured institute Wi-Fi policy.'
      : 'Your current network IP does not match the institute Wi-Fi network. Please connect to institute Wi-Fi and disable any VPN.'
  };
}

function isValidUuid(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function generateSessionCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

function generateNumericPin(length = 4) {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += String(crypto.randomInt(0, 10));
  }
  return pin;
}

function safeJsonParse(val, fallback = []) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Prevent CSV formula injection in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function extractLast4PhoneDigits(mobile, phone) {
  const primary = String(mobile || '').replace(/\D/g, '');
  if (primary.length >= 4) return primary.slice(-4);
  const secondary = String(phone || '').replace(/\D/g, '');
  if (secondary.length >= 4) return secondary.slice(-4);
  return null;
}

function timingSafePinEquals(submittedPin, expectedPin) {
  if (!submittedPin || !expectedPin) return false;
  const a = Buffer.from(String(submittedPin), 'utf8');
  const b = Buffer.from(String(expectedPin), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  IST_TIMEZONE,
  getIstDateString,
  getIstOffsetDateString,
  formatIstTime,
  formatIstDateTime,
  toUtcMysqlDatetime,
  parseUtcDate,
  normalizeIp,
  ipToBuffer,
  normalizeCidr,
  checkIpMatchesSettings,
  isValidUuid,
  generateSessionCode,
  generateNumericPin,
  safeJsonParse,
  sanitizeCsvCell,
  extractLast4PhoneDigits,
  timingSafePinEquals
};

