import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

export const projectAPI = {
  getAll: () => api.get('/projects'),
  getByLevel: (level) => api.get(`/projects/level/${level}`),
  getByType: (type) => api.get(`/projects/type/${type}`),
  getById: (id) => api.get(`/projects/${id}`),
  getSteps: (projectId) => api.get(`/projects/${projectId}/steps`),
  getProgress: () => api.get('/projects/progress/user'),
  updateProgress: (projectId, stepCompleted) => 
    api.post('/projects/progress', { projectId, stepCompleted }),
  getDashboardStats: () => api.get('/projects/dashboard/stats'),
  
  // Enhanced progress APIs
  getProjectProgress: (projectId) => api.get(`/projects/progress/${projectId}`),
  getRoadmap: (level) => api.get('/projects/roadmap', { params: { level } }),
  resumeLearning: () => api.get('/projects/resume'),
  completeStep: (data) => api.post('/projects/progress/step', data),
  checkStepAccess: (projectId, stepId) => api.get(`/projects/progress/check/${projectId}/${stepId}`),
  
  // Submit step for approval (main projects)
  submitStep: (data) => api.post('/progress/submit-step', data),
  
  // Complete step directly (simple projects)
  completeSimpleStep: (data) => api.post('/progress/complete-simple', data),
  
  // Project creation with file upload
  createProject: (formData) => {
    const token = localStorage.getItem('token')
    return fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.message || err.error || 'Upload failed')
        })
      }
      return response.json()
    })
  },
  updateProject: (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  createStep: (projectId, stepData) => api.post(`/projects/${projectId}/steps`, stepData),
  updateStep: (stepId, stepData) => api.put(`/projects/steps/${stepId}`, stepData),
  deleteStep: (stepId) => api.delete(`/projects/steps/${stepId}`)
}

export const userAPI = {
  getAllStudents: () => api.get('/users/students'),
  createStudent: (studentData) => api.post('/users/students', studentData),
  bulkCreateStudents: (students) => api.post('/users/students/bulk', { students }),
  deleteStudent: (id) => api.delete(`/users/students/${id}`),
  
  getAllCoordinators: () => api.get('/users/coordinators'),
  createCoordinator: (coordinatorData) => api.post('/users/coordinators', coordinatorData),
  deleteCoordinator: (id) => api.delete(`/users/coordinators/${id}`),
  
  changePassword: (data) => api.put('/users/change-password', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data)
}

export const coordinatorAPI = {
  getStudents: () => api.get('/coordinator/students'),
  getPendingApprovals: () => api.get('/coordinator/pending-approvals'),
  getStudentProgress: (studentId, projectId) => api.get(`/coordinator/student/${studentId}/progress`, { params: { projectId } }),
  approveStep: (progressId, data) => api.post(`/coordinator/approve/${progressId}`, data),
  rejectStep: (progressId, data) => api.post(`/coordinator/reject/${progressId}`, data),
  getDashboardStats: () => api.get('/coordinator/dashboard-stats'),
  getProjectStats: () => api.get('/coordinator/project-stats')
}

export const progressAPI = {
  submitStep: (data) => api.post('/progress/submit-step', data),
  completeSimpleStep: (data) => api.post('/progress/complete-simple', data),
  getUserProgress: (projectId) => api.get('/progress/user', { params: { projectId } }),
  getCurrentStep: (projectId) => api.get(`/progress/current/${projectId}`),
  getStudentStats: () => api.get('/progress/stats'),
  getNextStep: (projectId) => api.get(`/progress/next/${projectId}`)
}

export default api
