import api from './api';

const facultyAPI = {
  getMyBatches: () => api.get('/faculty/my-batches'),
  getMyNotes: () => api.get('/faculty/my-notes'),
  addNote: (data) => api.post('/faculty/notes', data),
  deleteNote: (id) => api.delete(`/faculty/notes/${id}`),
  getBatchNotes: (batchId) => api.get(`/faculty/batch/${batchId}/notes`),
  
  // Task Assignments (Coming in next step)
  getTasks: () => api.get('/coordinator/tasks'), // Reusing templates
  createTask: (data) => api.post('/coordinator/tasks', data),

  getEngagementStats: () => api.get('/faculty/engagement-stats'),
  getMyPerformance: () => api.get('/faculty/performance'),
  getDashboardStats: () => api.get('/faculty/dashboard-stats'),
  getStudents: () => api.get('/faculty/student-monitoring'),
  getStudentPerformance: (batchId) => api.get(`/faculty/student-performance${batchId ? `?batchId=${batchId}` : ''}`),
};

export default facultyAPI;
