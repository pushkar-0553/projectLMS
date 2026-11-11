const crypto = require('crypto');
const { AttendanceRepository, AppError } = require('./attendance.repository');
const { getPerfContext } = require('../../utils/perfTracker');
const {
  getIstDateString,
  getIstOffsetDateString,
  formatIstTime,
  formatIstDateTime,
  toUtcMysqlDatetime,
  parseUtcDate,
  normalizeIp,
  getVerifiedClientIP,
  isRenderProductionEnv,
  checkIpMatchesSettings,
  generateSessionCode,
  sanitizeCsvCell,
  extractLast4PhoneDigits,
  timingSafePinEquals
} = require('./attendance.utils');
const { validateWifiSettings, validateDateString, ValidationError } = require('./attendance.validation');

function verifyStudentPhonePin(student, submittedPin) {
  const expectedPin = extractLast4PhoneDigits(student.mobile, student.phone);
  if (!expectedPin) {
    throw new AppError(
      'Your registered mobile number is missing or invalid. Please contact an administrator to update your mobile number.',
      400,
      'PIN_NOT_CONFIGURED'
    );
  }
  if (!timingSafePinEquals(submittedPin, expectedPin)) {
    throw new AppError(
      'Invalid PIN. Enter the last 4 digits of your registered mobile number.',
      401,
      'INVALID_PIN'
    );
  }
}

class AttendanceService {
  async getPublicStatus(clientIp, now = new Date()) {
    const settings = await AttendanceRepository.getSettings();
    const todayIst = getIstDateString(now);
    const ipResult = checkIpMatchesSettings(clientIp, settings);

    console.info('[AttendanceIPVerify]', JSON.stringify({
      stage: 'public_status',
      verifiedIp: ipResult.normalizedIp || null,
      family: ipResult.family || null,
      matched: ipResult.matched,
      reason: ipResult.reason || null,
    }));

    const offlineEligible = Boolean(settings.offline_attendance_enabled && ipResult.matched);

    let message = ipResult.reason;
    if (!settings.offline_attendance_enabled) {
      message = 'Offline Wi-Fi attendance is currently disabled by the institute administrator.';
    } else if (offlineEligible) {
      message = `Connected to verified network (${settings.network_display_name}). You can submit offline attendance.`;
    }

    return {
      attendanceDateIst: todayIst,
      serverTimeIst: formatIstTime(now),
      serverTimeUtc: now.toISOString(),
      networkDisplayName: settings.network_display_name,
      offlineAttendanceEnabled: settings.offline_attendance_enabled,
      onlineAttendanceEnabled: settings.online_attendance_enabled,
      deviceRestrictionEnabled: settings.device_restriction_enabled,
      networkVerified: ipResult.matched,
      offlineEligible,
      clientIp: ipResult.normalizedIp,
      verificationMessage: message
    };
  }

  async getPublicEligibleStudents(query = {}) {
    const search = typeof query.search === 'string' ? query.search : '';
    const batchId = query.batchId ? Number(query.batchId) : null;
    const limit = Math.max(1, Math.min(250, parseInt(query.limit, 10) || 150));
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const result = await AttendanceRepository.getPublicEligibleStudents({
      search,
      batchId,
      limit,
      offset
    });

    return {
      ...result,
      page,
      limit
    };
  }

  async submitOfflineAttendance({ studentId, pin, deviceUuid, clientIp, userAgent, now = new Date() }) {
    const settings = await AttendanceRepository.getSettings();

    if (!settings.offline_attendance_enabled) {
      throw new AppError(
        'Offline attendance is currently disabled by the administrator.',
        403,
        'OFFLINE_DISABLED'
      );
    }

    // Revalidate network eligibility on every submission (never trust frontend)
    const ipCheck = checkIpMatchesSettings(clientIp, settings);
    console.info('[AttendanceIPVerify]', JSON.stringify({
      stage: 'offline_submit',
      verifiedIp: ipCheck.normalizedIp || null,
      family: ipCheck.family || null,
      matched: ipCheck.matched,
      reason: ipCheck.reason || null,
    }));
    if (!ipCheck.matched) {
      throw new AppError(
        ipCheck.reason || 'Please connect to the institute Wi-Fi network to mark offline attendance.',
        403,
        'NETWORK_NOT_VERIFIED'
      );
    }

    const student = await AttendanceRepository.getStudentForSubmission(studentId);
    if (!student || student.role !== 'student' || student.is_active === 0) {
      throw new AppError('Eligible student account not found.', 404, 'STUDENT_NOT_FOUND');
    }

    verifyStudentPhonePin(student, pin);

    const attendanceDate = getIstDateString(now);
    const utcNowStr = toUtcMysqlDatetime(now);

    const { recordId, deviceRecordId } = await AttendanceRepository.submitAttendanceTransactional({
      studentId: student.id,
      batchId: student.batch_id,
      courseId: student.course_id,
      attendanceDate,
      attendanceMode: 'OFFLINE',
      sessionId: null,
      deviceUuid,
      clientIp: ipCheck.normalizedIp,
      userAgent,
      utcNowStr,
      enforceDeviceRestriction: settings.device_restriction_enabled
    });

    return {
      recordId,
      deviceRecordId,
      studentId: student.id,
      studentName: student.name,
      batchName: student.batch_name,
      attendanceDate,
      attendanceTimeIst: formatIstTime(now),
      submittedAtUtc: now.toISOString(),
      attendanceMode: 'OFFLINE',
      status: 'PRESENT',
      networkDisplayName: settings.network_display_name
    };
  }

  async submitOnlineAttendance({ studentId, pin, sessionCode, deviceUuid, clientIp, userAgent, now = new Date() }) {
    const settings = await AttendanceRepository.getSettings();

    if (!settings.online_attendance_enabled) {
      throw new AppError(
        'Online attendance is currently disabled by the administrator.',
        403,
        'ONLINE_DISABLED'
      );
    }

    const session = await AttendanceRepository.getSessionByCode(sessionCode);
    if (!session) {
      throw new AppError('Invalid online attendance session code.', 404, 'SESSION_NOT_FOUND');
    }

    if (!session.is_active) {
      throw new AppError('This online attendance session has been deactivated.', 403, 'SESSION_INACTIVE');
    }

    const expiresAt = parseUtcDate(session.expires_at_utc);
    if (!expiresAt || now.getTime() > expiresAt.getTime()) {
      throw new AppError('This online attendance session code has expired.', 410, 'SESSION_EXPIRED');
    }

    const todayIst = getIstDateString(now);
    if (session.session_date !== todayIst) {
      throw new AppError(
        `This session code is valid for ${session.session_date} IST, not today (${todayIst}).`,
        400,
        'SESSION_DATE_MISMATCH'
      );
    }

    const student = await AttendanceRepository.getStudentForSubmission(studentId);
    if (!student || student.role !== 'student' || student.is_active === 0) {
      throw new AppError('Eligible student account not found.', 404, 'STUDENT_NOT_FOUND');
    }

    const enrolled = await AttendanceRepository.isStudentEnrolledInBatch(student.id, session.batch_id);
    if (!enrolled) {
      throw new AppError(
        `You are not assigned to batch "${session.batch_name}" for this online session.`,
        403,
        'BATCH_MISMATCH'
      );
    }

    verifyStudentPhonePin(student, pin);

    const normClientIp = normalizeIp(clientIp)?.ip || null;
    const utcNowStr = toUtcMysqlDatetime(now);

    const { recordId, deviceRecordId } = await AttendanceRepository.submitAttendanceTransactional({
      studentId: student.id,
      batchId: session.batch_id,
      courseId: session.course_id,
      attendanceDate: todayIst,
      attendanceMode: 'ONLINE',
      sessionId: session.id,
      deviceUuid,
      clientIp: normClientIp,
      userAgent,
      utcNowStr,
      enforceDeviceRestriction: settings.device_restriction_enabled
    });

    return {
      recordId,
      deviceRecordId,
      sessionId: session.id,
      sessionTitle: session.title || null,
      studentId: student.id,
      studentName: student.name,
      batchName: session.batch_name,
      attendanceDate: todayIst,
      attendanceTimeIst: formatIstTime(now),
      submittedAtUtc: now.toISOString(),
      attendanceMode: 'ONLINE',
      status: 'PRESENT'
    };
  }

  // ==================== ADMIN SERVICES ====================

  async getAdminToday(query = {}, resolvedCourseId = null, now = new Date()) {
    const todayIstDate = getIstDateString(now);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    const batchId = query.batchId ? Number(query.batchId) : null;
    const status = query.status ? String(query.status).toUpperCase() : 'ALL';
    const mode = query.mode ? String(query.mode).toUpperCase() : 'ALL';
    const search = typeof query.search === 'string' ? query.search : '';

    const data = await AttendanceRepository.getTodayOverview({
      todayIstDate,
      courseId: courseScope,
      batchId,
      status,
      mode,
      search,
      limit,
      offset
    });

    return {
      summary: data.summary,
      records: data.records.map((r) => ({
        ...r,
        submitted_time_ist: formatIstTime(r.submitted_at_utc),
        submitted_datetime_ist: formatIstDateTime(r.submitted_at_utc)
      })),
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / limit))
      }
    };
  }

  resolveDateRangePreset(query = {}, now = new Date()) {
    const preset = String(query.preset || '').toLowerCase();
    const todayIst = getIstDateString(now);

    if (preset === 'today') {
      return { startDate: todayIst, endDate: todayIst };
    }
    if (preset === 'yesterday') {
      const y = getIstOffsetDateString(-1, now);
      return { startDate: y, endDate: y };
    }
    if (preset === 'last7days' || preset === '7d') {
      return { startDate: getIstOffsetDateString(-6, now), endDate: todayIst };
    }
    if (query.startDate && query.endDate) {
      const startDate = validateDateString(query.startDate, 'startDate');
      const endDate = validateDateString(query.endDate, 'endDate');
      if (startDate > endDate) {
        throw new ValidationError('startDate cannot be after endDate.');
      }
      return { startDate, endDate };
    }

    return { startDate: getIstOffsetDateString(-6, now), endDate: todayIst };
  }

  async getAdminHistory(query = {}, resolvedCourseId = null, now = new Date()) {
    const { startDate, endDate } = this.resolveDateRangePreset(query, now);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    const batchId = query.batchId ? Number(query.batchId) : null;
    const mode = query.mode ? String(query.mode).toUpperCase() : 'ALL';
    const status = query.status ? String(query.status).toUpperCase() : 'ALL';
    const search = typeof query.search === 'string' ? query.search : '';

    const data = await AttendanceRepository.getHistory({
      startDate,
      endDate,
      courseId: courseScope,
      batchId,
      mode,
      status,
      search,
      limit,
      offset
    });

    return {
      dateRange: { startDate, endDate },
      records: data.records.map((r) => ({
        ...r,
        submitted_time_ist: formatIstTime(r.submitted_at_utc),
        submitted_datetime_ist: formatIstDateTime(r.submitted_at_utc),
        adjusted_datetime_ist: formatIstDateTime(r.adjusted_at_utc)
      })),
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / limit))
      }
    };
  }

  async exportHistory(query = {}, resolvedCourseId = null, now = new Date()) {
    const { startDate, endDate } = this.resolveDateRangePreset(query, now);
    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    const batchId = query.batchId ? Number(query.batchId) : null;
    const mode = query.mode ? String(query.mode).toUpperCase() : 'ALL';
    const status = query.status ? String(query.status).toUpperCase() : 'ALL';
    const search = typeof query.search === 'string' ? query.search : '';

    const data = await AttendanceRepository.getHistory({
      startDate,
      endDate,
      courseId: courseScope,
      batchId,
      mode,
      status,
      search,
      limit: 5000,
      offset: 0
    });

    const rows = data.records.map((r) => ({
      studentName: r.student_name,
      studentEmail: r.student_email,
      batchName: r.batch_name,
      attendanceDate: r.attendance_date,
      attendanceTimeIst: formatIstTime(r.submitted_at_utc) || '',
      attendanceMode: r.attendance_mode,
      status: r.status,
      source: r.source,
      deviceUuid: r.device_uuid || '',
      ipAddress: r.ip_address || '',
      sessionCode: r.session_code || '',
      manuallyAdjusted: r.is_manually_adjusted ? 'Yes' : 'No',
      markedByAdmin: r.marked_by_admin_name || '',
      correctionReason: r.correction_reason || ''
    }));

    const headers = [
      'Student Name',
      'Email',
      'Batch',
      'Date (IST)',
      'Time (IST)',
      'Mode',
      'Status',
      'Source',
      'Device ID',
      'IP Address',
      'Session Code',
      'Manually Adjusted',
      'Admin Name',
      'Correction Reason'
    ];

    const csvLines = [headers.map(sanitizeCsvCell).join(',')];
    for (const row of rows) {
      csvLines.push(
        [
          row.studentName,
          row.studentEmail,
          row.batchName,
          row.attendanceDate,
          row.attendanceTimeIst,
          row.attendanceMode,
          row.status,
          row.source,
          row.deviceUuid,
          row.ipAddress,
          row.sessionCode,
          row.manuallyAdjusted,
          row.markedByAdmin,
          row.correctionReason
        ]
          .map(sanitizeCsvCell)
          .join(',')
      );
    }

    return {
      dateRange: { startDate, endDate },
      rows,
      csvContent: '\uFEFF' + csvLines.join('\r\n')
    };
  }

  async getWifiSettings(clientIp) {
    const settings = await AttendanceRepository.getSettings();
    const norm = normalizeIp(clientIp);
    const liveTest = checkIpMatchesSettings(clientIp, settings);
    return {
      settings,
      currentClientIp: norm ? norm.ip : null,
      currentClientFamily: norm ? norm.family : null,
      currentNetworkMatched: liveTest.matched
    };
  }

  async updateWifiSettings(validatedPayload, adminId, actorIp, now = new Date()) {
    const utcNowStr = toUtcMysqlDatetime(now);
    const updated = await AttendanceRepository.updateSettings(validatedPayload, adminId, actorIp, utcNowStr);
    return updated;
  }

  async testNetworkConfig(body = {}, currentClientIp) {
    const saved = await AttendanceRepository.getSettings();
    let configToTest = saved;

    if (
      body.allowedIpv4 !== undefined ||
      body.allowedIpv6 !== undefined ||
      body.allowedCidrs !== undefined
    ) {
      const validated = validateWifiSettings({
        networkDisplayName: body.networkDisplayName || saved.network_display_name,
        allowedIpv4: body.allowedIpv4 ?? saved.allowed_ipv4,
        allowedIpv6: body.allowedIpv6 ?? saved.allowed_ipv6,
        allowedCidrs: body.allowedCidrs ?? saved.allowed_cidrs,
        offlineAttendanceEnabled:
          body.offlineAttendanceEnabled !== undefined
            ? body.offlineAttendanceEnabled
            : saved.offline_attendance_enabled,
        onlineAttendanceEnabled:
          body.onlineAttendanceEnabled !== undefined
            ? body.onlineAttendanceEnabled
            : saved.online_attendance_enabled,
        deviceRestrictionEnabled:
          body.deviceRestrictionEnabled !== undefined
            ? body.deviceRestrictionEnabled
            : saved.device_restriction_enabled
      });

      configToTest = {
        ...saved,
        network_display_name: validated.networkDisplayName,
        allowed_ipv4: validated.allowedIpv4,
        allowed_ipv6: validated.allowedIpv6,
        allowed_cidrs: validated.allowedCidrs,
        offline_attendance_enabled: validated.offlineAttendanceEnabled
      };
    }

    const targetIp =
      typeof body.testIp === 'string' && body.testIp.trim() ? body.testIp.trim() : currentClientIp;
    const match = checkIpMatchesSettings(targetIp, configToTest);

    return {
      testedIp: match.normalizedIp || targetIp || null,
      family: match.family,
      matched: match.matched,
      offlineAttendanceEnabled: configToTest.offline_attendance_enabled,
      eligibleForOffline: Boolean(configToTest.offline_attendance_enabled && match.matched),
      reason: match.reason
    };
  }

  async getDevices(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const statusFilter = query.status ? String(query.status).toUpperCase() : 'ALL';
    const search = typeof query.search === 'string' ? query.search : '';

    const data = await AttendanceRepository.getDevices({ statusFilter, search, limit, offset });

    return {
      devices: data.devices.map((d) => ({
        ...d,
        is_active: Boolean(d.is_active),
        registered_at_ist: formatIstDateTime(d.registered_at_utc),
        last_activity_at_ist: formatIstDateTime(d.last_activity_at_utc),
        reset_at_ist: formatIstDateTime(d.reset_at_utc)
      })),
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / limit))
      }
    };
  }

  async resetDevice(deviceId, reason, adminId, actorIp, now = new Date()) {
    const utcNowStr = toUtcMysqlDatetime(now);
    const cleanReason =
      typeof reason === 'string' && reason.trim()
        ? reason.trim().slice(0, 500)
        : 'Admin authorized device reset';
    return AttendanceRepository.resetDeviceTransactional({
      deviceId,
      adminId,
      reason: cleanReason,
      actorIp: normalizeIp(actorIp)?.ip || null,
      utcNowStr
    });
  }

  async getDeviceHistory(deviceId) {
    const data = await AttendanceRepository.getDeviceHistory(deviceId);
    return {
      target: data.target,
      registrations: data.registrations.map((r) => ({
        ...r,
        is_active: Boolean(r.is_active),
        registered_at_ist: formatIstDateTime(r.registered_at_utc),
        last_activity_at_ist: formatIstDateTime(r.last_activity_at_utc),
        reset_at_ist: formatIstDateTime(r.reset_at_utc)
      })),
      recentSubmissions: data.recentSubmissions.map((s) => ({
        ...s,
        submitted_at_ist: formatIstDateTime(s.submitted_at_utc)
      }))
    };
  }

  async markManualAttendance(payload, adminId, actorIp, now = new Date()) {
    const attendanceDate = payload.attendanceDate || getIstDateString(now);
    const utcNowStr = toUtcMysqlDatetime(now);

    return AttendanceRepository.saveManualAttendanceTransactional({
      studentId: payload.studentId,
      attendanceDate,
      attendanceMode: payload.attendanceMode,
      status: payload.status,
      correctionReason: payload.correctionReason,
      adminId,
      actorIp: normalizeIp(actorIp)?.ip || null,
      utcNowStr
    });
  }

  async createOnlineSession(payload, adminId, actorIp, now = new Date()) {
    const sessionDate = payload.sessionDate || getIstDateString(now);
    const expiresAtDate = payload.expiresAt
      ? payload.expiresAt
      : new Date(now.getTime() + payload.expiresInMinutes * 60 * 1000);

    if (expiresAtDate.getTime() <= now.getTime()) {
      throw new ValidationError('Session expiration time must be in the future.');
    }

    const sessionCode = payload.customCode || generateSessionCode(8);
    const utcNowStr = toUtcMysqlDatetime(now);
    const expiresAtUtcStr = toUtcMysqlDatetime(expiresAtDate);

    const created = await AttendanceRepository.createOnlineSessionTransactional({
      batchId: payload.batchId,
      sessionDate,
      title: payload.title,
      sessionCode,
      expiresAtUtcStr,
      adminId,
      actorIp: normalizeIp(actorIp)?.ip || null,
      utcNowStr
    });

    return {
      ...created,
      is_active: Boolean(created.is_active),
      expires_at_ist: formatIstDateTime(created.expires_at_utc)
    };
  }

  async listOnlineSessions(query = {}, resolvedCourseId = null, now = new Date()) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    const batchId = query.batchId ? Number(query.batchId) : null;

    const data = await AttendanceRepository.listOnlineSessions({
      courseId: courseScope,
      batchId,
      limit,
      offset
    });

    return {
      sessions: data.sessions.map((s) => {
        const expDate = parseUtcDate(s.expires_at_utc);
        const isExpired = !expDate || now.getTime() > expDate.getTime();
        return {
          ...s,
          is_active: Boolean(s.is_active),
          is_expired: isExpired,
          effective_status: !s.is_active ? 'DEACTIVATED' : isExpired ? 'EXPIRED' : 'ACTIVE',
          expires_at_ist: formatIstDateTime(s.expires_at_utc),
          created_at_ist: formatIstDateTime(s.created_at_utc)
        };
      }),
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / limit))
      }
    };
  }

  async toggleOnlineSession(sessionId, isActive, adminId, actorIp, now = new Date()) {
    return AttendanceRepository.toggleOnlineSessionTransactional({
      sessionId,
      isActive,
      adminId,
      actorIp: normalizeIp(actorIp)?.ip || null,
      utcNowStr: toUtcMysqlDatetime(now)
    });
  }

  async getAuditLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const actionType = query.actionType || 'ALL';
    const studentId = query.studentId ? Number(query.studentId) : null;

    const data = await AttendanceRepository.getAuditLogs({
      actionType,
      studentId,
      limit,
      offset
    });

    return {
      logs: data.logs.map((l) => ({
        ...l,
        created_at_ist: formatIstDateTime(l.created_at_utc)
      })),
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / limit))
      }
    };
  }

  async getAdminBatches(query = {}, resolvedCourseId = null) {
    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    return AttendanceRepository.getBatches(courseScope);
  }

  async getAdminStudents(query = {}, resolvedCourseId = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(query.limit, 10) || 250));
    const offset = (page - 1) * limit;
    const courseScope = query.scope === 'all' ? null : (query.courseId ? Number(query.courseId) : resolvedCourseId);
    const batchId = query.batchId ? Number(query.batchId) : null;
    const search = typeof query.search === 'string' ? query.search : '';

    return AttendanceRepository.getAdminStudents({
      courseId: courseScope,
      batchId,
      search,
      limit,
      offset
    });
  }

  getNetworkDiagnostics(req) {
    const perfCtx = getPerfContext();
    const requestId = req.headers['x-request-id'] || perfCtx?.reqId || crypto.randomUUID();
    const verifiedClientIp = getVerifiedClientIP(req);

    const snapshot = {
      verifiedClientIp,
      reqIp: req.ip || null,
      reqIps: Array.isArray(req.ips) ? req.ips : [],
      socketRemoteAddress: req.socket?.remoteAddress || null,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      xRealIp: req.headers['x-real-ip'] || null,
      cfConnectingIp: req.headers['cf-connecting-ip'] || null,
      trueClientIp: req.headers['true-client-ip'] || null,
      requestTimestamp: new Date().toISOString(),
      requestId,
      renderInstanceId: process.env.RENDER_INSTANCE_ID || null,
      renderServiceId: process.env.RENDER_SERVICE_ID || null,
      renderRegion: process.env.RENDER_REGION || null,
      isRenderEnvironment: isRenderProductionEnv()
    };

    console.info('[AttendanceNetworkDiag]', JSON.stringify(snapshot));
    return snapshot;
  }
}

module.exports = new AttendanceService();

