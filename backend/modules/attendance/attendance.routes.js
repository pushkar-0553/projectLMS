const express = require('express');
const router = express.Router();
const ctrl = require('./attendance.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  extractClientIp,
  publicReadLimiter,
  studentPinSubmitLimiter,
  campusSubmitBurstLimiter,
  adminMutationLimiter
} = require('./attendance.middleware');

// ==================== PUBLIC STUDENT PORTAL ROUTES ====================
// Mounted under /api -> /api/public/attendance/*

router.get('/public/attendance/status', extractClientIp, publicReadLimiter, ctrl.getPublicStatus);
router.get('/public/attendance/students', extractClientIp, publicReadLimiter, ctrl.getPublicStudents);

router.post(
  '/public/attendance/offline',
  extractClientIp,
  campusSubmitBurstLimiter,
  studentPinSubmitLimiter,
  ctrl.submitOfflineAttendance
);

router.post(
  '/public/attendance/online',
  extractClientIp,
  campusSubmitBurstLimiter,
  studentPinSubmitLimiter,
  ctrl.submitOnlineAttendance
);

// ==================== PROTECTED ADMIN ROUTES ====================
// Mounted under /api -> /api/admin/attendance/*
// Note: authorize('admin') allows 'admin' and 'super_admin' via existing authMiddleware.js

const adminAuth = [protect, authorize('admin'), extractClientIp];

router.get('/admin/attendance/batches', ...adminAuth, ctrl.getAdminBatches);
router.get('/admin/attendance/today', ...adminAuth, ctrl.getAdminToday);
router.get('/admin/attendance/history', ...adminAuth, ctrl.getAdminHistory);
router.get('/admin/attendance/export', ...adminAuth, ctrl.exportAdminHistory);

router.get('/admin/attendance/settings', ...adminAuth, ctrl.getWifiSettings);
router.put('/admin/attendance/settings', ...adminAuth, adminMutationLimiter, ctrl.updateWifiSettings);
router.post('/admin/attendance/settings/test-network', ...adminAuth, adminMutationLimiter, ctrl.testNetworkConfig);

router.get('/admin/attendance/devices', ...adminAuth, ctrl.getDevices);
router.post('/admin/attendance/devices/:deviceId/reset', ...adminAuth, adminMutationLimiter, ctrl.resetDevice);
router.get('/admin/attendance/devices/:deviceId/history', ...adminAuth, ctrl.getDeviceHistory);

router.post('/admin/attendance/manual', ...adminAuth, adminMutationLimiter, ctrl.markManualAttendance);

router.get('/admin/attendance/sessions', ...adminAuth, ctrl.listOnlineSessions);
router.post('/admin/attendance/sessions', ...adminAuth, adminMutationLimiter, ctrl.createOnlineSession);
router.patch('/admin/attendance/sessions/:sessionId/toggle', ...adminAuth, adminMutationLimiter, ctrl.toggleOnlineSession);

router.get('/admin/attendance/audit-logs', ...adminAuth, ctrl.getAuditLogs);
router.get('/admin/attendance/students', ...adminAuth, ctrl.getAdminStudents);
router.get('/admin/attendance/diagnostics/network', ...adminAuth, ctrl.getNetworkDiagnostics);

module.exports = router;
