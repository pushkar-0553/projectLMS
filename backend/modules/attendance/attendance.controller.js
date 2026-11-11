const AttendanceService = require('./attendance.service');
const Course = require('../../models/courseModel');
const {
  ValidationError,
  parsePositiveInt,
  validateOfflineSubmission,
  validateOnlineSubmission,
  validateWifiSettings,
  validateManualAttendance,
  validateCreateSession
} = require('./attendance.validation');
const { AppError } = require('./attendance.repository');
const { getVerifiedClientIP } = require('./attendance.utils');

function setNoStoreHeaders(res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
    Vary: 'Origin, X-Forwarded-For'
  });
}

function handleControllerError(res, err, contextLabel) {
  if (err instanceof ValidationError || err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code: err.code || undefined
    });
  }
  console.error(`[AttendanceController] ${contextLabel}:`, err);
  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred while processing attendance.'
  });
}

async function resolveOptionalCourseId(req) {
  if (req.query?.scope === 'all' || req.body?.scope === 'all') return null;
  if (req.query?.courseId) return parseInt(req.query.courseId, 10) || null;
  const slug = req.headers['x-course-slug'] || req.query?.courseSlug;
  if (slug) {
    const course = await Course.findBySlug(slug);
    if (course) return course.id;
  }
  return null;
}

const attendanceController = {
  // ==================== PUBLIC PORTAL ====================

  async getPublicStatus(req, res) {
    try {
      setNoStoreHeaders(res);
      const clientIp = getVerifiedClientIP(req);
      const data = await AttendanceService.getPublicStatus(clientIp);
      return res.json({ success: true, data });
    } catch (err) {
      return handleControllerError(res, err, 'getPublicStatus');
    }
  },

  async getPublicStudents(req, res) {
    try {
      setNoStoreHeaders(res);
      const data = await AttendanceService.getPublicEligibleStudents(req.query);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getPublicStudents');
    }
  },

  async submitOfflineAttendance(req, res) {
    try {
      setNoStoreHeaders(res);
      const validated = validateOfflineSubmission(req.body);
      const clientIp = getVerifiedClientIP(req);
      const confirmation = await AttendanceService.submitOfflineAttendance({
        ...validated,
        clientIp,
        userAgent: req.headers['user-agent'] || null
      });
      return res.status(201).json({
        success: true,
        message: 'Offline attendance recorded successfully.',
        data: confirmation
      });
    } catch (err) {
      return handleControllerError(res, err, 'submitOfflineAttendance');
    }
  },

  async submitOnlineAttendance(req, res) {
    try {
      const validated = validateOnlineSubmission(req.body);
      const confirmation = await AttendanceService.submitOnlineAttendance({
        ...validated,
        clientIp: getVerifiedClientIP(req),
        userAgent: req.headers['user-agent'] || null
      });
      setNoStoreHeaders(res);
      return res.status(201).json({
        success: true,
        message: 'Online attendance recorded successfully.',
        data: confirmation
      });
    } catch (err) {
      return handleControllerError(res, err, 'submitOnlineAttendance');
    }
  },

  // ==================== ADMIN MANAGEMENT ====================

  async getAdminBatches(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const batches = await AttendanceService.getAdminBatches(req.query, courseId);
      return res.json({ success: true, batches });
    } catch (err) {
      return handleControllerError(res, err, 'getAdminBatches');
    }
  },

  async getAdminToday(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const data = await AttendanceService.getAdminToday(req.query, courseId);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getAdminToday');
    }
  },

  async getAdminHistory(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const data = await AttendanceService.getAdminHistory(req.query, courseId);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getAdminHistory');
    }
  },

  async exportAdminHistory(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const result = await AttendanceService.exportHistory(req.query, courseId);
      if (String(req.query.format || '').toLowerCase() === 'csv') {
        const filename = `attendance_history_${result.dateRange.startDate}_to_${result.dateRange.endDate}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(result.csvContent);
      }
      return res.json({ success: true, dateRange: result.dateRange, rows: result.rows });
    } catch (err) {
      return handleControllerError(res, err, 'exportAdminHistory');
    }
  },

  async getWifiSettings(req, res) {
    try {
      setNoStoreHeaders(res);
      const data = await AttendanceService.getWifiSettings(getVerifiedClientIP(req));
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getWifiSettings');
    }
  },

  async updateWifiSettings(req, res) {
    try {
      const validated = validateWifiSettings(req.body);
      const updated = await AttendanceService.updateWifiSettings(
        validated,
        req.user.id,
        req.clientIp
      );
      return res.json({
        success: true,
        message: 'Wi-Fi and attendance settings saved successfully.',
        settings: updated
      });
    } catch (err) {
      return handleControllerError(res, err, 'updateWifiSettings');
    }
  },

  async testNetworkConfig(req, res) {
    try {
      setNoStoreHeaders(res);
      const result = await AttendanceService.testNetworkConfig(req.body, getVerifiedClientIP(req));
      return res.json({ success: true, data: result });
    } catch (err) {
      return handleControllerError(res, err, 'testNetworkConfig');
    }
  },

  async getDevices(req, res) {
    try {
      const data = await AttendanceService.getDevices(req.query);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getDevices');
    }
  },

  async resetDevice(req, res) {
    try {
      const deviceId = parsePositiveInt(req.params.deviceId, 'deviceId');
      const result = await AttendanceService.resetDevice(
        deviceId,
        req.body?.reason,
        req.user.id,
        req.clientIp
      );
      return res.json({
        success: true,
        message: `Device reset successfully for ${result.student_name}.`,
        data: result
      });
    } catch (err) {
      return handleControllerError(res, err, 'resetDevice');
    }
  },

  async getDeviceHistory(req, res) {
    try {
      const deviceId = parsePositiveInt(req.params.deviceId, 'deviceId');
      const data = await AttendanceService.getDeviceHistory(deviceId);
      return res.json({ success: true, data });
    } catch (err) {
      return handleControllerError(res, err, 'getDeviceHistory');
    }
  },

  async markManualAttendance(req, res) {
    try {
      const validated = validateManualAttendance(req.body);
      const data = await AttendanceService.markManualAttendance(
        validated,
        req.user.id,
        req.clientIp
      );
      return res.json({
        success: true,
        message: `Attendance updated for ${data.studentName} (${data.attendanceDate}).`,
        data
      });
    } catch (err) {
      return handleControllerError(res, err, 'markManualAttendance');
    }
  },

  async listOnlineSessions(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const data = await AttendanceService.listOnlineSessions(req.query, courseId);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'listOnlineSessions');
    }
  },

  async createOnlineSession(req, res) {
    try {
      const validated = validateCreateSession(req.body);
      const session = await AttendanceService.createOnlineSession(
        validated,
        req.user.id,
        req.clientIp
      );
      return res.status(201).json({
        success: true,
        message: 'Online attendance session created successfully.',
        data: session
      });
    } catch (err) {
      return handleControllerError(res, err, 'createOnlineSession');
    }
  },

  async toggleOnlineSession(req, res) {
    try {
      const sessionId = parsePositiveInt(req.params.sessionId, 'sessionId');
      const result = await AttendanceService.toggleOnlineSession(
        sessionId,
        req.body?.isActive,
        req.user.id,
        req.clientIp
      );
      return res.json({
        success: true,
        message: result.is_active ? 'Session activated.' : 'Session deactivated.',
        data: result
      });
    } catch (err) {
      return handleControllerError(res, err, 'toggleOnlineSession');
    }
  },

  async getAuditLogs(req, res) {
    try {
      const data = await AttendanceService.getAuditLogs(req.query);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getAuditLogs');
    }
  },

  async getAdminStudents(req, res) {
    try {
      const courseId = await resolveOptionalCourseId(req);
      const data = await AttendanceService.getAdminStudents(req.query, courseId);
      return res.json({ success: true, ...data });
    } catch (err) {
      return handleControllerError(res, err, 'getAdminStudents');
    }
  },

  async getNetworkDiagnostics(req, res) {
    try {
      setNoStoreHeaders(res);
      const data = AttendanceService.getNetworkDiagnostics(req);
      return res.json({ success: true, data });
    } catch (err) {
      return handleControllerError(res, err, 'getNetworkDiagnostics');
    }
  }
};

module.exports = attendanceController;

