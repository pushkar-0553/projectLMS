import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export const resolveAssetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getUser: () => api.get('/auth/user')
}

export const adminAPI = {
  createUser: (userData) => api.post('/admin/create-user', userData),
  createBatch: (name, classLink = '') => api.post('/admin/create-batch', { name, classLink }),
  updateBatchClassLink: (batchId, classLink) => api.put(`/admin/batches/${batchId}/class-link`, { classLink }),
  getBatches: () => api.get('/admin/batches'),
  getCoordinators: () => api.get('/admin/coordinators'),
  getFaculties: () => api.get('/admin/faculties'),
  getStudents: () => api.get('/admin/students'),
  getHistory: () => api.get('/admin/history')
}

export const coordinatorAPI = {
  createSubBatch: (data) => api.post('/coordinator/create-subbatch', data),
  getMySubBatches: () => api.get('/coordinator/my-subbatches'),
  updateSubBatchClassLink: (subBatchId, classLink) => api.put(`/coordinator/subbatch/${subBatchId}/class-link`, { classLink }),
  assignStudent: (data) => api.post('/coordinator/assign-student', data),
  getStudents: () => api.get('/admin/students'), // Reusing shared endpoint
  getPendingApprovals: () => api.get('/coordinator/pending-approvals'),
  getProjectStats: () => api.get('/coordinator/project-stats'),
  getStudentProgress: (studentId) => api.get(`/coordinator/student/${studentId}/progress`),
  approveStep: (progressId, data) => api.post(`/coordinator/approve-step/${progressId}`, data),
  rejectStep: (progressId, data) => api.post(`/coordinator/reject-step/${progressId}`, data),
  createTask: (data) => api.post('/coordinator/task/create', data),
  assignTask: (data) => api.post('/coordinator/task/assign', data),
  getMyTasks: () => api.get('/coordinator/my-tasks'),
  getTaskSubmissions: (taskId) => api.get(`/coordinator/task/${taskId}/submissions`),
  reviewSubmission: (data) => api.post('/coordinator/submission/review', data),
  getDashboardStats: () => api.get('/coordinator/dashboard-stats'),
  getHistory: () => api.get('/coordinator/history')
}

export const studentAPI = {
  getMyTasks: () => api.get('/student/my-tasks'),
  getTaskById: (id) => api.get(`/student/task/${id}`),
  submitTask: (data) => api.post('/student/submission/create', data),
  getMySubmissions: () => api.get('/student/my-submissions'),
  getRecentActivity: () => api.get('/student/recent-activity')
}

export const projectAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  createProject: (data) => api.post('/projects', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getSteps: (projectId) => api.get(`/projects/${projectId}/steps`),
  submitStep: (data) => api.post('/progress/submit-step', data),
  completeSimpleStep: (data) => api.post('/progress/complete-simple', data),
  getProgress: (projectId) => api.get('/progress/user', { params: projectId ? { projectId } : {} }),
  resumeLearning: () => api.get('/projects/resume'),
  getDashboardStats: () => api.get('/projects/dashboard/stats')
}

export const progressAPI = {
  getUserProgress: (projectId) => api.get('/progress/user', { params: projectId ? { projectId } : {} }),
  getStudentStats: () => api.get('/progress/stats'),
  updateProgress: (data) => api.post('/projects/progress/step', data)
}

export const academicAPI = {
  getOverview: () => api.get('/academics/overview'),
  createClassLink: (data) => api.post('/academics/class-links', data),
  getClassLinks: (params = {}) => api.get('/academics/class-links', { params }),
  updateClassLink: (linkId, data) => api.put(`/academics/class-links/${linkId}`, data),
  deleteClassLink: (linkId) => api.delete(`/academics/class-links/${linkId}`),
  createAttendanceSession: (data) => api.post('/academics/attendance/sessions', data),
  markAttendance: (sessionId, records) => api.post(`/academics/attendance/sessions/${sessionId}/records`, { records }),
  getAttendanceSessions: () => api.get('/academics/attendance/sessions'),
  getAttendanceRecords: (sessionId) => api.get(`/academics/attendance/sessions/${sessionId}/records`),
  createAssessment: (data) => api.post('/academics/assessments', data),
  recordAssessmentResults: (assessmentId, results) => api.post(`/academics/assessments/${assessmentId}/results`, { results }),
  getAssessments: () => api.get('/academics/assessments'),
  getMyAcademics: () => api.get('/academics/me')
}

export const userAPI = {
  changePassword: (data) => api.put('/users/change-password', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAllStudents: () => api.get('/admin/students'),
  createStudent: (data) => api.post('/admin/create-user', { ...data, role: 'student' }),
  deleteStudent: (id) => api.delete(`/admin/users/${id}`),
  bulkCreateStudents: (students) => api.post('/admin/bulk-create-students', { students }),
  getAllCoordinators: () => api.get('/admin/coordinators'),
  createCoordinator: (data) => api.post('/admin/create-user', { ...data, role: 'coordinator' }),
  getAllFaculties: () => api.get('/admin/faculties'),
  createFaculty: (data) => api.post('/admin/create-user', { ...data, role: 'faculty' }),
  deleteCoordinator: (id) => api.delete(`/admin/users/${id}`),

  // Student profile (coordinator + admin)
  getStudentProfile: (studentId) => api.get(`/users/students/${studentId}/profile`),

  // Batch management
  getAllBatchesForAssignment: () => api.get('/users/batches'),
  assignStudentBatch: (studentId, batchId) =>
    api.put(`/users/students/${studentId}/batch`, { batchId }),
  removeStudentBatch: (studentId) =>
    api.delete(`/users/students/${studentId}/batch`),
}

export const attendanceAPI = {
  getBatches: () => api.get('/attendance/batches'),
  getUnassigned: () => api.get('/attendance/unassigned'),
  assignStudent: (studentId, batchId) =>
    api.post('/attendance/assign', { studentId, batchId }),
  removeStudent: (studentId, batchId) =>
    api.delete(`/attendance/assign/${studentId}/${batchId}`),

  getToday: (batchId) => api.get(`/attendance/today/${batchId}`),
  upsertSession: (batchId, topicCovered, notes) =>
    api.post(`/attendance/session/${batchId}`, { topicCovered, notes }),
  markAttendance: (sessionId, records) =>
    api.post('/attendance/mark', { sessionId, records }),

  getHistory: (batchId, startDate, endDate) =>
    api.get(`/attendance/history/${batchId}`, { params: { startDate, endDate } }),
  getSessionDetail: (sessionId) =>
    api.get(`/attendance/session/${sessionId}`),

  getMyAttendanceSummary: (startDate, endDate) =>
    api.get('/attendance/my-summary', { params: { startDate, endDate } }),
};

export const messageAPI = {
  sendMessage: (data) => api.post('/messages/send', data),
  getInbox: () => api.get('/messages/inbox'),
  getUnreadCount: () => api.get('/messages/unread-count'),
  markAsRead: (senderId) => api.put(`/messages/mark-read/${senderId}`),
  getBatchAnnouncements: (batchId) => api.get(`/messages/batch/${batchId}`),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  pinMessage: (id) => api.post(`/messages/${id}/pin`),
  unpinMessage: (id) => api.post(`/messages/${id}/unpin`),
  getPinnedMessages: (type, id) => api.get('/messages/pinned', { params: { type, id } }),
  toggleReaction: (id, emoji) => api.post(`/messages/${id}/react`, { emoji }),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  sendManual: (data) => api.post('/notifications/send', data),
};

export const facultyAPI = {
  getDashboardStats: () => api.get('/faculty/dashboard-stats'),
  getMyBatches: () => api.get('/faculty/my-batches'),
  getStudents: () => api.get('/faculty/student-monitoring'),
  getInterviews: () => api.get('/faculty/interviews'),
  scheduleInterview: (data) => api.post('/faculty/interviews', data),
  updateInterviewStatus: (id, data) => api.put(`/faculty/interviews/${id}/status`, data),
  submitEvaluation: (data) => api.post('/faculty/interviews/evaluate', data),
  getMentoringSessions: () => api.get('/faculty/mentoring'),
  createMentoringSession: (data) => api.post('/faculty/mentoring', data),
  getEngagementStats: () => api.get('/faculty/engagement-stats'),
  getMyPerformance: () => api.get('/faculty/performance'),
  addNote: (data) => api.post('/faculty/notes', data),
  getMyNotes: () => api.get('/faculty/my-notes'),
  deleteNote: (id) => api.delete(`/faculty/notes/${id}`),
  getBatchNotes: (batchId) => api.get(`/faculty/batch/${batchId}/notes`),
};

export const resumeAPI = {
  uploadResume: (data) => api.post('/resumes/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getLatestResume: (studentId) => api.get(`/resumes/student/${studentId}`),
  getHistory: (studentId) => api.get(`/resumes/history/${studentId}`),
  getAllResumes: () => api.get('/resumes'),
  searchResumes: (query) => api.get('/resumes/search', { params: { query } }),
  filterResumes: (filters) => api.get('/resumes/filter', { params: filters }),
  updatePlacementInfo: (studentId, data) => api.put(`/resumes/placement/${studentId}`, data),
  
  // Notes
  addNote: (data) => api.post('/resumes/notes', data),
  getNotes: (studentId) => api.get(`/resumes/notes/${studentId}`),
  deleteNote: (id) => api.delete(`/resumes/notes/${id}`),

  // Collections
  createCollection: (data) => api.post('/resume-collections', data),
  getAllCollections: () => api.get('/resume-collections'),
  getCollectionDetail: (id) => api.get(`/resume-collections/${id}`),
  deleteCollection: (id) => api.delete(`/resume-collections/${id}`),

  // Public
  getPublicCollection: (token) => api.get(`/public/resumes/${token}`)
};

export default api;
