const pool = require('../../config/db');
const { ipToBuffer, safeJsonParse, extractLast4PhoneDigits } = require('./attendance.utils');

class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function hydrateSettingsRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    setting_key: row.setting_key,
    network_display_name: row.network_display_name,
    allowed_ipv4: safeJsonParse(row.allowed_ipv4, []),
    allowed_ipv6: safeJsonParse(row.allowed_ipv6, []),
    allowed_cidrs: safeJsonParse(row.allowed_cidrs, []),
    offline_attendance_enabled: Boolean(row.offline_attendance_enabled),
    online_attendance_enabled: Boolean(row.online_attendance_enabled),
    device_restriction_enabled: Boolean(row.device_restriction_enabled),
    updated_by: row.updated_by,
    updated_at: row.updated_at_utc || row.updated_at
  };
}

class AttendanceRepository {
  async getSettings() {
    const [rows] = await pool.execute(
      `SELECT *, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at_utc
       FROM attendance_settings
       WHERE setting_key = 'DEFAULT'
       LIMIT 1`
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT IGNORE INTO attendance_settings (
          setting_key, network_display_name, allowed_ipv4, allowed_ipv6, allowed_cidrs,
          offline_attendance_enabled, online_attendance_enabled, device_restriction_enabled
        ) VALUES ('DEFAULT', 'Institute Campus Wi-Fi', JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(), TRUE, TRUE, TRUE)`
      );
      const [seeded] = await pool.execute(
        `SELECT *, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at_utc
         FROM attendance_settings WHERE setting_key = 'DEFAULT' LIMIT 1`
      );
      return hydrateSettingsRow(seeded[0]);
    }

    return hydrateSettingsRow(rows[0]);
  }

  async updateSettings(payload, adminId, actorIp, utcNowStr) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        `SELECT * FROM attendance_settings WHERE setting_key = 'DEFAULT' FOR UPDATE`
      );
      const before = existingRows[0] ? hydrateSettingsRow(existingRows[0]) : null;

      if (existingRows.length === 0) {
        await connection.execute(
          `INSERT INTO attendance_settings (
            setting_key, network_display_name, allowed_ipv4, allowed_ipv6, allowed_cidrs,
            offline_attendance_enabled, online_attendance_enabled, device_restriction_enabled, updated_by
          ) VALUES ('DEFAULT', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.networkDisplayName,
            JSON.stringify(payload.allowedIpv4),
            JSON.stringify(payload.allowedIpv6),
            JSON.stringify(payload.allowedCidrs),
            payload.offlineAttendanceEnabled ? 1 : 0,
            payload.onlineAttendanceEnabled ? 1 : 0,
            payload.deviceRestrictionEnabled ? 1 : 0,
            adminId
          ]
        );
      } else {
        await connection.execute(
          `UPDATE attendance_settings
           SET network_display_name = ?,
               allowed_ipv4 = ?,
               allowed_ipv6 = ?,
               allowed_cidrs = ?,
               offline_attendance_enabled = ?,
               online_attendance_enabled = ?,
               device_restriction_enabled = ?,
               updated_by = ?
           WHERE setting_key = 'DEFAULT'`,
          [
            payload.networkDisplayName,
            JSON.stringify(payload.allowedIpv4),
            JSON.stringify(payload.allowedIpv6),
            JSON.stringify(payload.allowedCidrs),
            payload.offlineAttendanceEnabled ? 1 : 0,
            payload.onlineAttendanceEnabled ? 1 : 0,
            payload.deviceRestrictionEnabled ? 1 : 0,
            adminId
          ]
        );
      }

      const [updatedRows] = await connection.execute(
        `SELECT *, DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at_utc
         FROM attendance_settings WHERE setting_key = 'DEFAULT' LIMIT 1`
      );
      const after = hydrateSettingsRow(updatedRows[0]);

      await connection.execute(
        `INSERT INTO attendance_audit_logs (
          action_type, actor_admin_id, reason, actor_ip, before_state, after_state, created_at
        ) VALUES ('WIFI_SETTINGS_UPDATE', ?, 'Updated Wi-Fi and attendance module settings', ?, ?, ?, ?)`,
        [adminId, actorIp, JSON.stringify(before), JSON.stringify(after), utcNowStr]
      );

      await connection.commit();
      return after;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getPublicEligibleStudents({ search = '', batchId = null, limit = 150, offset = 0 }) {
    const conditions = ["u.role = 'student'", '(u.is_active = 1 OR u.is_active IS NULL)'];
    const params = [];

    if (search && search.trim()) {
      conditions.push('(u.name LIKE ? OR b.name LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (batchId) {
      conditions.push('sbm.batch_id = ?');
      params.push(Number(batchId));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(DISTINCT u.id) AS total
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       ${whereClause}`,
      params
    );

    const safeLimit = Math.max(1, Math.min(250, Number(limit) || 150));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.mobile,
         u.phone,
         sbm.batch_id,
         COALESCE(b.name, u.batch, 'Unassigned') AS batch_name,
         b.course_id,
         c.name AS course_name
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN Courses c ON b.course_id = c.id
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      students: rows.map((r) => ({
        id: r.id,
        name: r.name,
        batch_id: r.batch_id || null,
        batch_name: r.batch_name,
        course_id: r.course_id || null,
        course_name: r.course_name || null,
        has_pin: Boolean(extractLast4PhoneDigits(r.mobile, r.phone))
      })),
      total: Number(countRow?.total || 0)
    };
  }

  async getStudentForSubmission(studentId) {
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name,
         u.role,
         u.is_active,
         u.mobile,
         u.phone,
         sbm.batch_id,
         COALESCE(b.name, u.batch, 'Unassigned') AS batch_name,
         b.course_id
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       WHERE u.id = ?
       LIMIT 1`,
      [studentId]
    );
    return rows[0] || null;
  }

  async isStudentEnrolledInBatch(studentId, batchId) {
    const [sbmRows] = await pool.execute(
      `SELECT id FROM StudentBatchMap WHERE student_id = ? AND batch_id = ? LIMIT 1`,
      [studentId, batchId]
    );
    if (sbmRows.length > 0) return true;

    const [cmRows] = await pool.execute(
      `SELECT id FROM CourseMemberships WHERE user_id = ? AND batch_id = ? AND status = 'active' LIMIT 1`,
      [studentId, batchId]
    );
    return cmRows.length > 0;
  }

  async getSessionByCode(sessionCode) {
    const [rows] = await pool.execute(
      `SELECT
         s.id,
         s.course_id,
         s.batch_id,
         DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
         s.title,
         s.session_code,
         s.is_active,
         DATE_FORMAT(s.expires_at, '%Y-%m-%dT%H:%i:%sZ') AS expires_at_utc,
         b.name AS batch_name
       FROM attendance_sessions s
       JOIN Batches b ON s.batch_id = b.id
       WHERE s.session_code = ?
       LIMIT 1`,
      [sessionCode]
    );
    return rows[0] || null;
  }

  async submitAttendanceTransactional({
    studentId,
    batchId,
    courseId,
    attendanceDate,
    attendanceMode,
    sessionId = null,
    deviceUuid,
    clientIp,
    userAgent = null,
    utcNowStr,
    enforceDeviceRestriction = true
  }) {
    const connection = await pool.getConnection();
    const ipBin = ipToBuffer(clientIp);

    try {
      await connection.beginTransaction();

      // 1. Lock any existing daily attendance check to prevent simultaneous duplicate insert race
      const [existingRecord] = await connection.execute(
        `SELECT id, attendance_mode
         FROM attendance_records
         WHERE student_id = ? AND attendance_date = ?
         FOR UPDATE`,
        [studentId, attendanceDate]
      );
      if (existingRecord.length > 0) {
        throw new AppError(
          `Attendance has already been submitted for ${attendanceDate} (${existingRecord[0].attendance_mode}).`,
          409,
          'DUPLICATE_DAILY_ATTENDANCE'
        );
      }

      // 2. Device registration / verification
      let deviceRecordId = null;

      if (enforceDeviceRestriction) {
        const [devByUuidRows] = await connection.execute(
          `SELECT id, student_id, device_uuid
           FROM attendance_devices
           WHERE active_device_uuid = ?
           FOR UPDATE`,
          [deviceUuid]
        );

        if (devByUuidRows.length > 0 && Number(devByUuidRows[0].student_id) !== Number(studentId)) {
          throw new AppError(
            'This browser/device is already registered to another student. Please use your own device or request an admin device reset.',
            403,
            'DEVICE_BOUND_TO_OTHER_STUDENT'
          );
        }

        const [devByStudentRows] = await connection.execute(
          `SELECT id, student_id, device_uuid
           FROM attendance_devices
           WHERE active_student_id = ?
           FOR UPDATE`,
          [studentId]
        );

        if (devByStudentRows.length > 0 && devByStudentRows[0].device_uuid !== deviceUuid) {
          throw new AppError(
            'Your account is already bound to a different registered device. Please use your registered device or request an admin device reset.',
            403,
            'STUDENT_BOUND_TO_OTHER_DEVICE'
          );
        }

        if (devByUuidRows.length > 0) {
          deviceRecordId = devByUuidRows[0].id;
          await connection.execute(
            `UPDATE attendance_devices
             SET last_activity_at = ?,
                 last_ip = ?,
                 user_agent = COALESCE(?, user_agent)
             WHERE id = ?`,
            [utcNowStr, clientIp, userAgent ? String(userAgent).slice(0, 500) : null, deviceRecordId]
          );
        } else {
          try {
            const [devInsert] = await connection.execute(
              `INSERT INTO attendance_devices (
                device_uuid, student_id, is_active, active_device_uuid, active_student_id,
                user_agent, registered_ip, last_ip, registered_at, last_activity_at
              ) VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?)`,
              [
                deviceUuid,
                studentId,
                deviceUuid,
                studentId,
                userAgent ? String(userAgent).slice(0, 500) : null,
                clientIp,
                clientIp,
                utcNowStr,
                utcNowStr
              ]
            );
            deviceRecordId = devInsert.insertId;
          } catch (devErr) {
            if (devErr.code === 'ER_DUP_ENTRY') {
              throw new AppError(
                'Device binding conflict detected. Please retry or contact an administrator.',
                409,
                'DEVICE_CONFLICT'
              );
            }
            throw devErr;
          }
        }
      } else {
        // Device restriction disabled: still associate existing matching active device if present
        const [devRows] = await connection.execute(
          `SELECT id FROM attendance_devices
           WHERE device_uuid = ? AND student_id = ? AND is_active = TRUE
           LIMIT 1`,
          [deviceUuid, studentId]
        );
        if (devRows.length > 0) {
          deviceRecordId = devRows[0].id;
          await connection.execute(
            `UPDATE attendance_devices SET last_activity_at = ?, last_ip = ? WHERE id = ?`,
            [utcNowStr, clientIp, deviceRecordId]
          );
        }
      }

      // 3. Insert attendance record protected by UNIQUE(student_id, attendance_date)
      let recordId;
      try {
        const [recInsert] = await connection.execute(
          `INSERT INTO attendance_records (
            student_id, batch_id, course_id, attendance_date, attendance_mode,
            status, source, session_id, device_record_id, device_uuid,
            ip_address, ip_binary, submitted_at
          ) VALUES (?, ?, ?, ?, ?, 'PRESENT', 'SELF_PORTAL', ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            batchId || null,
            courseId || null,
            attendanceDate,
            attendanceMode,
            sessionId || null,
            deviceRecordId,
            deviceUuid,
            clientIp,
            ipBin,
            utcNowStr
          ]
        );
        recordId = recInsert.insertId;
      } catch (recErr) {
        if (recErr.code === 'ER_DUP_ENTRY') {
          throw new AppError(
            `Attendance has already been marked for ${attendanceDate}.`,
            409,
            'DUPLICATE_DAILY_ATTENDANCE'
          );
        }
        throw recErr;
      }

      await connection.commit();
      return { recordId, deviceRecordId };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getTodayOverview({
    todayIstDate,
    courseId = null,
    batchId = null,
    status = 'ALL',
    mode = 'ALL',
    search = '',
    limit = 25,
    offset = 0
  }) {
    const scopeConditions = ["u.role = 'student'", '(u.is_active = 1 OR u.is_active IS NULL)'];
    const scopeParams = [];

    if (courseId) {
      scopeConditions.push(
        "(b.course_id = ? OR EXISTS (SELECT 1 FROM CourseMemberships cm WHERE cm.user_id = u.id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'))"
      );
      scopeParams.push(Number(courseId), Number(courseId));
    }
    if (batchId) {
      scopeConditions.push('sbm.batch_id = ?');
      scopeParams.push(Number(batchId));
    }

    const scopeWhere = `WHERE ${scopeConditions.join(' AND ')}`;

    const [[kpiRow]] = await pool.query(
      `SELECT
         COUNT(DISTINCT u.id) AS total_students,
         COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL AND ar.status IN ('PRESENT', 'LATE', 'EXCUSED') THEN u.id END) AS present_count,
         COUNT(DISTINCT CASE WHEN ar.id IS NULL OR ar.status = 'ABSENT' THEN u.id END) AS absent_count,
         COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL AND ar.status IN ('PRESENT', 'LATE', 'EXCUSED') AND ar.attendance_mode = 'ONLINE' THEN u.id END) AS online_count,
         COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL AND ar.status IN ('PRESENT', 'LATE', 'EXCUSED') AND ar.attendance_mode = 'OFFLINE' THEN u.id END) AS offline_count
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN attendance_records ar ON u.id = ar.student_id AND ar.attendance_date = ?
       ${scopeWhere}`,
      [todayIstDate, ...scopeParams]
    );

    // Table filters
    const tableConditions = [...scopeConditions];
    const tableParams = [todayIstDate, ...scopeParams];

    if (search && search.trim()) {
      tableConditions.push('(u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ?)');
      const term = `%${search.trim()}%`;
      tableParams.push(term, term, term);
    }

    if (status === 'PRESENT') {
      tableConditions.push("ar.status IN ('PRESENT', 'LATE', 'EXCUSED')");
    } else if (status === 'ABSENT') {
      tableConditions.push("(ar.id IS NULL OR ar.status = 'ABSENT')");
    } else if (['LATE', 'EXCUSED'].includes(status)) {
      tableConditions.push('ar.status = ?');
      tableParams.push(status);
    }

    if (mode === 'ONLINE' || mode === 'OFFLINE') {
      tableConditions.push('ar.attendance_mode = ?');
      tableParams.push(mode);
    }

    const tableWhere = `WHERE ${tableConditions.join(' AND ')}`;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(DISTINCT u.id) AS total
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN attendance_records ar ON u.id = ar.student_id AND ar.attendance_date = ?
       ${tableWhere}`,
      tableParams
    );

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [rows] = await pool.query(
      `SELECT
         u.id AS student_id,
         u.name AS student_name,
         u.email AS student_email,
         COALESCE(ar.batch_id, sbm.batch_id) AS batch_id,
         COALESCE(rb.name, b.name, u.batch, 'Unassigned') AS batch_name,
         ar.id AS record_id,
         DATE_FORMAT(ar.attendance_date, '%Y-%m-%d') AS attendance_date,
         ar.attendance_mode,
         COALESCE(ar.status, 'ABSENT') AS status,
         ar.source,
         ar.device_uuid,
         ar.ip_address,
         DATE_FORMAT(ar.submitted_at, '%Y-%m-%dT%H:%i:%sZ') AS submitted_at_utc,
         ar.is_manually_adjusted,
         ar.correction_reason,
         admin_u.name AS marked_by_admin_name
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN attendance_records ar ON u.id = ar.student_id AND ar.attendance_date = ?
       LEFT JOIN Batches rb ON ar.batch_id = rb.id
       LEFT JOIN Users admin_u ON ar.marked_by_admin_id = admin_u.id
       ${tableWhere}
       ORDER BY
         CASE WHEN ar.id IS NULL THEN 1 ELSE 0 END ASC,
         ar.submitted_at DESC,
         u.name ASC
       LIMIT ? OFFSET ?`,
      [...tableParams, safeLimit, safeOffset]
    );

    return {
      summary: {
        date: todayIstDate,
        totalStudents: Number(kpiRow?.total_students || 0),
        present: Number(kpiRow?.present_count || 0),
        absent: Number(kpiRow?.absent_count || 0),
        online: Number(kpiRow?.online_count || 0),
        offline: Number(kpiRow?.offline_count || 0)
      },
      records: rows,
      total: Number(countRow?.total || 0)
    };
  }

  async getHistory({
    startDate,
    endDate,
    courseId = null,
    batchId = null,
    mode = 'ALL',
    status = 'ALL',
    search = '',
    limit = 25,
    offset = 0
  }) {
    const conditions = ['ar.attendance_date BETWEEN ? AND ?'];
    const params = [startDate, endDate];

    if (courseId) {
      conditions.push('COALESCE(ar.course_id, b.course_id) = ?');
      params.push(Number(courseId));
    }
    if (batchId) {
      conditions.push('ar.batch_id = ?');
      params.push(Number(batchId));
    }
    if (mode === 'ONLINE' || mode === 'OFFLINE') {
      conditions.push('ar.attendance_mode = ?');
      params.push(mode);
    }
    if (['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
      conditions.push('ar.status = ?');
      params.push(status);
    }
    if (search && search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ? OR ar.ip_address LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM attendance_records ar
       JOIN Users u ON ar.student_id = u.id
       LEFT JOIN Batches b ON ar.batch_id = b.id
       ${whereClause}`,
      params
    );

    const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 25));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [rows] = await pool.query(
      `SELECT
         ar.id,
         ar.student_id,
         u.name AS student_name,
         u.email AS student_email,
         ar.batch_id,
         COALESCE(b.name, u.batch, 'Unassigned') AS batch_name,
         DATE_FORMAT(ar.attendance_date, '%Y-%m-%d') AS attendance_date,
         ar.attendance_mode,
         ar.status,
         ar.source,
         ar.session_id,
         sess.session_code,
         ar.device_uuid,
         ar.ip_address,
         DATE_FORMAT(ar.submitted_at, '%Y-%m-%dT%H:%i:%sZ') AS submitted_at_utc,
         ar.is_manually_adjusted,
         DATE_FORMAT(ar.adjusted_at, '%Y-%m-%dT%H:%i:%sZ') AS adjusted_at_utc,
         ar.correction_reason,
         ar.marked_by_admin_id,
         admin_u.name AS marked_by_admin_name,
         ar.original_evidence
       FROM attendance_records ar
       JOIN Users u ON ar.student_id = u.id
       LEFT JOIN Batches b ON ar.batch_id = b.id
       LEFT JOIN attendance_sessions sess ON ar.session_id = sess.id
       LEFT JOIN Users admin_u ON ar.marked_by_admin_id = admin_u.id
       ${whereClause}
       ORDER BY ar.attendance_date DESC, ar.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      records: rows.map((r) => ({
        ...r,
        original_evidence: safeJsonParse(r.original_evidence, null)
      })),
      total: Number(countRow?.total || 0)
    };
  }

  async getDevices({ statusFilter = 'ACTIVE', search = '', limit = 25, offset = 0 }) {
    const conditions = [];
    const params = [];

    if (statusFilter === 'ACTIVE') {
      conditions.push('d.is_active = TRUE');
    } else if (statusFilter === 'RESET') {
      conditions.push('d.is_active = FALSE');
    }

    if (search && search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ? OR d.device_uuid LIKE ? OR d.last_ip LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM attendance_devices d
       JOIN Users u ON d.student_id = u.id
       ${whereClause}`,
      params
    );

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [rows] = await pool.query(
      `SELECT
         d.id,
         d.device_uuid,
         d.student_id,
         u.name AS student_name,
         u.email AS student_email,
         COALESCE(b.name, u.batch, 'Unassigned') AS batch_name,
         d.is_active,
         d.user_agent,
         d.registered_ip,
         d.last_ip,
         DATE_FORMAT(d.registered_at, '%Y-%m-%dT%H:%i:%sZ') AS registered_at_utc,
         DATE_FORMAT(d.last_activity_at, '%Y-%m-%dT%H:%i:%sZ') AS last_activity_at_utc,
         DATE_FORMAT(d.reset_at, '%Y-%m-%dT%H:%i:%sZ') AS reset_at_utc,
         d.reset_by,
         reset_u.name AS reset_by_name,
         d.reset_reason
       FROM attendance_devices d
       JOIN Users u ON d.student_id = u.id
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       LEFT JOIN Users reset_u ON d.reset_by = reset_u.id
       ${whereClause}
       ORDER BY d.is_active DESC, d.last_activity_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      devices: rows,
      total: Number(countRow?.total || 0)
    };
  }

  async resetDeviceTransactional({ deviceId, adminId, reason, actorIp, utcNowStr }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT d.*, u.name AS student_name
         FROM attendance_devices d
         JOIN Users u ON d.student_id = u.id
         WHERE d.id = ?
         FOR UPDATE`,
        [deviceId]
      );

      if (rows.length === 0) {
        throw new AppError('Device registration not found.', 404);
      }

      const device = rows[0];
      if (!device.is_active) {
        throw new AppError('This device registration has already been reset.', 400);
      }

      await connection.execute(
        `UPDATE attendance_devices
         SET is_active = FALSE,
             active_device_uuid = NULL,
             active_student_id = NULL,
             reset_at = ?,
             reset_by = ?,
             reset_reason = ?
         WHERE id = ?`,
        [utcNowStr, adminId, reason || 'Admin authorized device reset', deviceId]
      );

      await connection.execute(
        `INSERT INTO attendance_audit_logs (
          action_type, actor_admin_id, target_student_id, target_device_id,
          reason, actor_ip, before_state, after_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'DEVICE_RESET',
          adminId,
          device.student_id,
          deviceId,
          reason || 'Admin authorized device reset',
          actorIp,
          JSON.stringify({
            id: device.id,
            device_uuid: device.device_uuid,
            student_id: device.student_id,
            is_active: true
          }),
          JSON.stringify({
            id: device.id,
            device_uuid: device.device_uuid,
            student_id: device.student_id,
            is_active: false,
            reset_at: utcNowStr
          }),
          utcNowStr
        ]
      );

      await connection.commit();
      return { id: device.id, device_uuid: device.device_uuid, student_id: device.student_id, student_name: device.student_name };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getDeviceHistory(deviceId) {
    const [targetRows] = await pool.execute(
      `SELECT d.id, d.device_uuid, d.student_id, u.name AS student_name
       FROM attendance_devices d
       JOIN Users u ON d.student_id = u.id
       WHERE d.id = ?
       LIMIT 1`,
      [deviceId]
    );
    if (targetRows.length === 0) {
      throw new AppError('Device registration not found.', 404);
    }

    const target = targetRows[0];

    const [registrations] = await pool.execute(
      `SELECT
         d.id,
         d.device_uuid,
         d.student_id,
         u.name AS student_name,
         d.is_active,
         d.registered_ip,
         d.last_ip,
         d.user_agent,
         DATE_FORMAT(d.registered_at, '%Y-%m-%dT%H:%i:%sZ') AS registered_at_utc,
         DATE_FORMAT(d.last_activity_at, '%Y-%m-%dT%H:%i:%sZ') AS last_activity_at_utc,
         DATE_FORMAT(d.reset_at, '%Y-%m-%dT%H:%i:%sZ') AS reset_at_utc,
         d.reset_reason,
         reset_u.name AS reset_by_name
       FROM attendance_devices d
       JOIN Users u ON d.student_id = u.id
       LEFT JOIN Users reset_u ON d.reset_by = reset_u.id
       WHERE d.device_uuid = ? OR d.student_id = ?
       ORDER BY d.registered_at DESC`,
      [target.device_uuid, target.student_id]
    );

    const [recentSubmissions] = await pool.execute(
      `SELECT
         ar.id,
         DATE_FORMAT(ar.attendance_date, '%Y-%m-%d') AS attendance_date,
         ar.attendance_mode,
         ar.status,
         ar.device_uuid,
         ar.ip_address,
         DATE_FORMAT(ar.submitted_at, '%Y-%m-%dT%H:%i:%sZ') AS submitted_at_utc
       FROM attendance_records ar
       WHERE ar.device_uuid = ? OR ar.student_id = ?
       ORDER BY ar.submitted_at DESC
       LIMIT 30`,
      [target.device_uuid, target.student_id]
    );

    return {
      target,
      registrations,
      recentSubmissions
    };
  }

  async saveManualAttendanceTransactional({
    studentId,
    attendanceDate,
    attendanceMode,
    status,
    correctionReason,
    adminId,
    actorIp,
    utcNowStr
  }) {
    const connection = await pool.getConnection();
    const ipBin = ipToBuffer(actorIp);

    try {
      await connection.beginTransaction();

      const [studentRows] = await connection.execute(
        `SELECT u.id, u.name, u.role, sbm.batch_id, b.course_id
         FROM Users u
         LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
         LEFT JOIN Batches b ON sbm.batch_id = b.id
         WHERE u.id = ? AND u.role = 'student'
         LIMIT 1`,
        [studentId]
      );
      if (studentRows.length === 0) {
        throw new AppError('Student not found.', 404);
      }
      const student = studentRows[0];

      const [existingRows] = await connection.execute(
        `SELECT *, DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date_str,
                DATE_FORMAT(submitted_at, '%Y-%m-%dT%H:%i:%sZ') AS submitted_at_utc
         FROM attendance_records
         WHERE student_id = ? AND attendance_date = ?
         FOR UPDATE`,
        [studentId, attendanceDate]
      );

      let recordId;
      let actionType;
      let beforeState = null;
      let afterState = null;

      if (existingRows.length === 0) {
        actionType = 'MANUAL_MARK';
        const [ins] = await connection.execute(
          `INSERT INTO attendance_records (
            student_id, batch_id, course_id, attendance_date, attendance_mode,
            status, source, ip_address, ip_binary, submitted_at,
            marked_by_admin_id, correction_reason, is_manually_adjusted, adjusted_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ADMIN_MANUAL', ?, ?, ?, ?, ?, TRUE, ?)`,
          [
            studentId,
            student.batch_id || null,
            student.course_id || null,
            attendanceDate,
            attendanceMode,
            status,
            actorIp,
            ipBin,
            utcNowStr,
            adminId,
            correctionReason,
            utcNowStr
          ]
        );
        recordId = ins.insertId;
        afterState = {
          id: recordId,
          student_id: studentId,
          attendance_date: attendanceDate,
          attendance_mode: attendanceMode,
          status,
          source: 'ADMIN_MANUAL',
          marked_by_admin_id: adminId,
          correction_reason: correctionReason
        };
      } else {
        const existing = existingRows[0];
        recordId = existing.id;
        actionType = 'MANUAL_ADJUST';

        beforeState = {
          id: existing.id,
          student_id: existing.student_id,
          attendance_date: existing.attendance_date_str,
          attendance_mode: existing.attendance_mode,
          status: existing.status,
          source: existing.source,
          session_id: existing.session_id,
          device_record_id: existing.device_record_id,
          device_uuid: existing.device_uuid,
          ip_address: existing.ip_address,
          submitted_at: existing.submitted_at_utc,
          is_manually_adjusted: Boolean(existing.is_manually_adjusted),
          marked_by_admin_id: existing.marked_by_admin_id,
          correction_reason: existing.correction_reason
        };

        // Preserve original evidence permanently if this is the first manual edit
        const preservedOriginal = existing.original_evidence
          ? existing.original_evidence
          : JSON.stringify(beforeState);

        await connection.execute(
          `UPDATE attendance_records
           SET attendance_mode = ?,
               status = ?,
               marked_by_admin_id = ?,
               correction_reason = ?,
               is_manually_adjusted = TRUE,
               adjusted_at = ?,
               original_evidence = ?
           WHERE id = ?`,
          [
            attendanceMode,
            status,
            adminId,
            correctionReason,
            utcNowStr,
            typeof preservedOriginal === 'string' ? preservedOriginal : JSON.stringify(preservedOriginal),
            recordId
          ]
        );

        afterState = {
          ...beforeState,
          attendance_mode: attendanceMode,
          status,
          is_manually_adjusted: true,
          marked_by_admin_id: adminId,
          correction_reason: correctionReason,
          adjusted_at: utcNowStr
        };
      }

      await connection.execute(
        `INSERT INTO attendance_audit_logs (
          action_type, actor_admin_id, target_student_id, target_record_id,
          reason, actor_ip, before_state, after_state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actionType,
          adminId,
          studentId,
          recordId,
          correctionReason,
          actorIp,
          beforeState ? JSON.stringify(beforeState) : null,
          JSON.stringify(afterState),
          utcNowStr
        ]
      );

      await connection.commit();
      return {
        recordId,
        actionType,
        studentName: student.name,
        attendanceDate,
        attendanceMode,
        status
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async createOnlineSessionTransactional({
    batchId,
    sessionDate,
    title,
    sessionCode,
    expiresAtUtcStr,
    adminId,
    actorIp,
    utcNowStr
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [batchRows] = await connection.execute(
        `SELECT id, course_id, name, is_active FROM Batches WHERE id = ? LIMIT 1`,
        [batchId]
      );
      if (batchRows.length === 0) {
        throw new AppError('Selected batch not found.', 404);
      }
      const batch = batchRows[0];

      const [ins] = await connection.execute(
        `INSERT INTO attendance_sessions (
          course_id, batch_id, session_date, title, session_code,
          is_active, expires_at, created_by
        ) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`,
        [batch.course_id || null, batchId, sessionDate, title, sessionCode, expiresAtUtcStr, adminId]
      );

      const sessionId = ins.insertId;

      await connection.execute(
        `INSERT INTO attendance_audit_logs (
          action_type, actor_admin_id, target_session_id, reason, actor_ip, after_state, created_at
        ) VALUES ('SESSION_CREATE', ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          sessionId,
          `Created online attendance session for ${batch.name}`,
          actorIp,
          JSON.stringify({
            id: sessionId,
            batch_id: batchId,
            batch_name: batch.name,
            session_date: sessionDate,
            session_code: sessionCode,
            expires_at: expiresAtUtcStr
          }),
          utcNowStr
        ]
      );

      await connection.commit();

      const [created] = await pool.execute(
        `SELECT
           s.id, s.course_id, s.batch_id, b.name AS batch_name,
           DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
           s.title, s.session_code, s.is_active,
           DATE_FORMAT(s.expires_at, '%Y-%m-%dT%H:%i:%sZ') AS expires_at_utc,
           DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_utc
         FROM attendance_sessions s
         JOIN Batches b ON s.batch_id = b.id
         WHERE s.id = ? LIMIT 1`,
        [sessionId]
      );

      return created[0];
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async listOnlineSessions({ courseId = null, batchId = null, limit = 50, offset = 0 }) {
    const conditions = [];
    const params = [];

    if (courseId) {
      conditions.push('COALESCE(s.course_id, b.course_id) = ?');
      params.push(Number(courseId));
    }
    if (batchId) {
      conditions.push('s.batch_id = ?');
      params.push(Number(batchId));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM attendance_sessions s
       JOIN Batches b ON s.batch_id = b.id
       ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         s.id,
         s.course_id,
         s.batch_id,
         b.name AS batch_name,
         DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
         s.title,
         s.session_code,
         s.is_active,
         DATE_FORMAT(s.expires_at, '%Y-%m-%dT%H:%i:%sZ') AS expires_at_utc,
         DATE_FORMAT(s.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_utc,
         cu.name AS created_by_name,
         COUNT(ar.id) AS attendance_count
       FROM attendance_sessions s
       JOIN Batches b ON s.batch_id = b.id
       LEFT JOIN Users cu ON s.created_by = cu.id
       LEFT JOIN attendance_records ar ON s.id = ar.session_id
       ${whereClause}
       GROUP BY s.id, s.course_id, s.batch_id, b.name, s.session_date, s.title, s.session_code, s.is_active, s.expires_at, s.created_at, cu.name
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      sessions: rows,
      total: Number(countRow?.total || 0)
    };
  }

  async toggleOnlineSessionTransactional({ sessionId, isActive, adminId, actorIp, utcNowStr }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, is_active, session_code, batch_id FROM attendance_sessions WHERE id = ? FOR UPDATE`,
        [sessionId]
      );
      if (rows.length === 0) {
        throw new AppError('Online attendance session not found.', 404);
      }
      const sess = rows[0];
      const nextActive = isActive !== undefined ? Boolean(isActive) : !Boolean(sess.is_active);

      await connection.execute(
        `UPDATE attendance_sessions
         SET is_active = ?,
             deactivated_by = ?,
             deactivated_at = ?
         WHERE id = ?`,
        [nextActive ? 1 : 0, nextActive ? null : adminId, nextActive ? null : utcNowStr, sessionId]
      );

      await connection.execute(
        `INSERT INTO attendance_audit_logs (
          action_type, actor_admin_id, target_session_id, reason, actor_ip, before_state, after_state, created_at
        ) VALUES ('SESSION_TOGGLE', ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          sessionId,
          nextActive ? 'Activated online attendance session' : 'Deactivated online attendance session',
          actorIp,
          JSON.stringify({ is_active: Boolean(sess.is_active) }),
          JSON.stringify({ is_active: nextActive }),
          utcNowStr
        ]
      );

      await connection.commit();
      return { id: sessionId, is_active: nextActive };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getAuditLogs({ actionType = null, studentId = null, limit = 50, offset = 0 }) {
    const conditions = [];
    const params = [];

    if (actionType && actionType !== 'ALL') {
      conditions.push('al.action_type = ?');
      params.push(actionType);
    }
    if (studentId) {
      conditions.push('al.target_student_id = ?');
      params.push(Number(studentId));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM attendance_audit_logs al ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         al.id,
         al.action_type,
         al.actor_admin_id,
         au.name AS actor_admin_name,
         al.target_student_id,
         su.name AS target_student_name,
         al.target_record_id,
         al.target_device_id,
         al.target_session_id,
         al.reason,
         al.actor_ip,
         al.before_state,
         al.after_state,
         DATE_FORMAT(al.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at_utc
       FROM attendance_audit_logs al
       LEFT JOIN Users au ON al.actor_admin_id = au.id
       LEFT JOIN Users su ON al.target_student_id = su.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      logs: rows.map((r) => ({
        ...r,
        before_state: safeJsonParse(r.before_state, null),
        after_state: safeJsonParse(r.after_state, null)
      })),
      total: Number(countRow?.total || 0)
    };
  }

  async getBatches(courseId = null) {
    let sql = `
      SELECT b.id, b.name, b.course_id, c.name AS course_name, c.slug AS course_slug,
             COUNT(DISTINCT sbm.student_id) AS student_count
      FROM Batches b
      LEFT JOIN Courses c ON b.course_id = c.id
      LEFT JOIN StudentBatchMap sbm ON b.id = sbm.batch_id
      WHERE (b.is_active = TRUE OR b.is_active IS NULL)
    `;
    const params = [];
    if (courseId) {
      sql += ' AND b.course_id = ?';
      params.push(Number(courseId));
    }
    sql += ' GROUP BY b.id, b.name, b.course_id, c.name, c.slug ORDER BY b.name ASC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async getAdminStudents({ courseId = null, batchId = null, search = '', limit = 250, offset = 0 }) {
    const conditions = ["u.role = 'student'", '(u.is_active = 1 OR u.is_active IS NULL)'];
    const params = [];

    if (courseId) {
      conditions.push(
        "(b.course_id = ? OR EXISTS (SELECT 1 FROM CourseMemberships cm WHERE cm.user_id = u.id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'))"
      );
      params.push(Number(courseId), Number(courseId));
    }
    if (batchId) {
      conditions.push('sbm.batch_id = ?');
      params.push(Number(batchId));
    }
    if (search && search.trim()) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const [[countRow]] = await pool.query(
      `SELECT COUNT(DISTINCT u.id) AS total
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       ${whereClause}`,
      params
    );

    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 250));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         sbm.batch_id,
         COALESCE(b.name, u.batch, 'Unassigned') AS batch_name
       FROM Users u
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );

    return {
      students: rows,
      total: Number(countRow?.total || 0)
    };
  }
}

module.exports = {
  AttendanceRepository: new AttendanceRepository(),
  AppError
};

