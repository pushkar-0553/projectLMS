// Platform API Service
// Student Execution & Mentorship Platform

import api from './api'

const platformAPI = {
  // =============================================
  // USER MANAGEMENT
  // =============================================

  getAllUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/users?${query}`)
  },

  getUserById: (id) => {
    return api.get(`/platform/users/${id}`)
  },

  updateUser: (id, userData) => {
    return api.put(`/platform/users/${id}`, userData)
  },

  getUsersByRole: (role, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/users/role/${role}?${query}`)
  },

  // =============================================
  // BATCH MANAGEMENT
  // =============================================

  getBatches: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/batches?${query}`)
  },

  getBatchById: (id) => {
    return api.get(`/platform/batches/${id}`)
  },

  createBatch: (batchData) => {
    return api.post('/platform/batches', batchData)
  },

  updateBatch: (id, batchData) => {
    return api.put(`/platform/batches/${id}`, batchData)
  },

  getBatchStudents: (id) => {
    return api.get(`/platform/batches/${id}/students`)
  },

  assignStudentsToBatch: (batchId, studentIds) => {
    return api.post(`/platform/batches/${batchId}/students`, { student_ids: studentIds })
  },

  // =============================================
  // PROJECT & TASK MANAGEMENT
  // =============================================

  getProjects: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/projects?${query}`)
  },

  getProjectById: (id) => {
    return api.get(`/platform/projects/${id}`)
  },

  createProject: (projectData) => {
    return api.post('/platform/projects', projectData)
  },

  updateProject: (id, projectData) => {
    return api.put(`/platform/projects/${id}`, projectData)
  },

  getProjectSteps: (id) => {
    return api.get(`/platform/projects/${id}/steps`)
  },

  assignProjectToStudent: (studentId, projectData) => {
    return api.post(`/platform/students/${studentId}/projects`, projectData)
  },

  getStudentProjects: (studentId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/students/${studentId}/projects?${query}`)
  },

  updateStudentProject: (id, projectData) => {
    return api.put(`/platform/student-projects/${id}`, projectData)
  },

  updateStepProgress: (id, progressData) => {
    return api.put(`/platform/step-progress/${id}`, progressData)
  },

  // =============================================
  // LIVE CLASSROOM SYSTEM
  // =============================================

  getSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/sessions?${query}`)
  },

  getSessionById: (id) => {
    return api.get(`/platform/sessions/${id}`)
  },

  createSession: (sessionData) => {
    return api.post('/platform/sessions', sessionData)
  },

  updateSession: (id, sessionData) => {
    return api.put(`/platform/sessions/${id}`, sessionData)
  },

  startSession: (id) => {
    return api.post(`/platform/sessions/${id}/start`)
  },

  endSession: (id) => {
    return api.post(`/platform/sessions/${id}/end`)
  },

  joinSession: (id) => {
    return api.post(`/platform/sessions/${id}/join`)
  },

  leaveSession: (id) => {
    return api.post(`/platform/sessions/${id}/leave`)
  },

  getSessionParticipants: (id) => {
    return api.get(`/platform/sessions/${id}/participants`)
  },

  // =============================================
  // MOCK INTERVIEW SYSTEM
  // =============================================

  getInterviewSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/interviews?${query}`)
  },

  scheduleInterview: (interviewData) => {
    return api.post('/platform/interviews', interviewData)
  },

  submitInterviewEvaluation: (sessionId, evaluationData) => {
    return api.post(`/platform/interviews/${sessionId}/evaluation`, evaluationData)
  },

  getInterviewEvaluations: (sessionId) => {
    if (sessionId) return api.get(`/platform/interviews/${sessionId}/evaluations`)
    return api.get('/platform/interviews/evaluations')
  },

  getStudentInterviewHistory: (studentId) => {
    return api.get(`/platform/students/${studentId}/interviews`)
  },

  // =============================================
  // PERFORMANCE INTELLIGENCE
  // =============================================

  getStudentPerformance: (studentId, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/students/${studentId}/performance?${query}`)
  },

  getBatchPerformance: (batchId) => {
    return api.get(`/platform/batches/${batchId}/performance`)
  },

  getPerformanceAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/analytics/performance?${query}`)
  },

  getRiskAnalysis: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/analytics/risk?${query}`)
  },

  getLeaderboard: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/analytics/leaderboard?${query}`)
  },

  calculatePerformanceMetrics: () => {
    return api.post('/platform/performance/calculate')
  },

  // =============================================
  // NOTIFICATION SYSTEM
  // =============================================

  getNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/notifications?${query}`)
  },

  markNotificationRead: (id) => {
    return api.put(`/platform/notifications/${id}/read`)
  },

  markAllNotificationsRead: () => {
    return api.put('/platform/notifications/read-all')
  },

  deleteNotification: (id) => {
    return api.delete(`/platform/notifications/${id}`)
  },

  createNotification: (notificationData) => {
    return api.post('/platform/notifications', notificationData)
  },

  sendBulkNotifications: (notificationData) => {
    return api.post('/platform/notifications/bulk', notificationData)
  },

  // =============================================
  // ATTENDANCE SYSTEM
  // =============================================

  getAttendanceRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/attendance?${query}`)
  },

  getSessionAttendance: (sessionId) => {
    return api.get(`/platform/sessions/${sessionId}/attendance`)
  },

  takeManualAttendance: (sessionId, attendanceData) => {
    return api.post(`/platform/sessions/${sessionId}/attendance/manual`, attendanceData)
  },

  getAttendanceAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/analytics/attendance?${query}`)
  },

  // =============================================
  // ADMIN ANALYTICS
  // =============================================

  getSystemOverview: () => {
    return api.get('/platform/admin/overview')
  },

  getActivityLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/admin/activity-logs?${query}`)
  },

  getBatchComparisons: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/admin/batch-comparisons?${query}`)
  },

  getFacultyPerformance: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/platform/admin/faculty-performance?${query}`)
  },

  // =============================================
  // SYSTEM CONFIGURATION
  // =============================================

  getSystemSettings: () => {
    return api.get('/platform/settings')
  },

  updateSystemSetting: (key, value) => {
    return api.put(`/platform/settings/${key}`, { value })
  },

  getPublicSettings: () => {
    return api.get('/platform/settings/public')
  },

  // =============================================
  // REAL-TIME ENDPOINTS
  // =============================================

  getActiveSessions: () => {
    return api.get('/platform/realtime/active-sessions')
  },

  getOnlineUsers: () => {
    return api.get('/platform/realtime/online-users')
  },

  getBatchActivity: (batchId) => {
    return api.get(`/platform/realtime/batch-activity/${batchId}`)
  }
}

export default platformAPI
