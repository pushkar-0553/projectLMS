const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const EXAM_API_BASE = `${API_BASE_URL.replace(/\/$/, '')}/exams`;

/**
 * Helper to get authentication token from session/local storage
 */
function getAuthHeaders() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('exam_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${EXAM_API_BASE}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 && !endpoint.includes('/student-exam') && !endpoint.includes('/auth/login')) {
    console.warn('[Exam API] Unauthorized access on', endpoint);
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/exam/')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const examApi = {
  // 1. Auth (uses LMS credentials or standalone token)
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    getProfile: async () => {
      const res = await request('/auth/me');
      return res.user || res.data || res;
    }
  },

  // 2. Paper Management
  papers: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      if (typeof params === 'string') {
        if (params) q.append('status', params);
      } else {
        if (params.status) q.append('status', params.status);
        if (params.search) q.append('search', params.search);
        if (params.courseId) q.append('courseId', params.courseId);
      }
      const res = await request(`/papers?${q.toString()}`);
      return Array.isArray(res) ? res : (res.data || []);
    },
    create: (data) => request('/papers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getById: async (id) => {
      const res = await request(`/papers/${id}`);
      return res.data || res;
    },
    update: (id, data) => request(`/papers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/papers/${id}`, {
      method: 'DELETE'
    }),
    getVersion: async (versionId) => {
      if (!versionId || versionId === 'undefined') {
        console.warn('api.papers.getVersion skipped due to missing/undefined versionId:', versionId);
        return null;
      }
      const res = await request(`/papers/versions/${versionId}`);
      return res.data || res;
    },
    createNewVersion: (paperId, data) => request(`/papers/${paperId}/version`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    publishVersion: (versionId) => {
      if (!versionId || versionId === 'undefined') {
        console.warn('api.papers.publishVersion skipped due to missing/undefined versionId:', versionId);
        return Promise.resolve({ success: false });
      }
      return request(`/papers/versions/${versionId}/publish`, {
        method: 'POST'
      });
    },
    getPreviewUrl: (versionId) => versionId && versionId !== 'undefined' ? `${EXAM_API_BASE}/papers/versions/${versionId}/preview` : '#',
    getAnswerKeyUrl: (versionId) => versionId && versionId !== 'undefined' ? `${EXAM_API_BASE}/papers/versions/${versionId}/answer-key-html` : '#',
    getPdfDownloadUrl: (versionId) => versionId && versionId !== 'undefined' ? `${EXAM_API_BASE}/papers/versions/${versionId}/download-pdf` : '#',
    getDocxDownloadUrl: (versionId) => versionId && versionId !== 'undefined' ? `${EXAM_API_BASE}/papers/versions/${versionId}/download-docx` : '#'
  },

  // 3. Question Bank
  questionBank: {
    listCategories: async () => {
      const res = await request('/question-bank/categories');
      return Array.isArray(res) ? res : (res.data || []);
    },
    createCategory: (data) => request('/question-bank/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    listQuestions: async (categoryId = '') => {
      const res = await request(`/question-bank/questions${categoryId ? `?categoryId=${categoryId}` : ''}`);
      return Array.isArray(res) ? res : (res.data || []);
    },
    createQuestion: (data) => request('/question-bank/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // 4. Stage / LMS Student Integration
  stage: {
    listBatches: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.courseId) q.append('courseId', params.courseId);
      if (params.courseSlug) q.append('courseSlug', params.courseSlug);
      const res = await request(`/stage/batches?${q.toString()}`);
      return Array.isArray(res) ? res : (res.data || []);
    },
    listStudentsByBatch: async (batchId) => {
      const res = await request(`/stage/batches/${batchId}/students`);
      return Array.isArray(res) ? res : (res.data || []);
    },
    listCourses: async () => {
      const res = await request('/stage/courses');
      return Array.isArray(res) ? res : (res.data || []);
    }
  },

  // 5. Exam Assignments
  assignments: {
    list: async (params = '') => {
      const q = new URLSearchParams();
      if (typeof params === 'string') {
        if (params) q.append('status', params);
      } else {
        if (params.status) q.append('status', params.status);
        if (params.courseId) q.append('courseId', params.courseId);
        if (params.courseSlug) q.append('courseSlug', params.courseSlug);
      }
      const res = await request(`/assignments?${q.toString()}`);
      return Array.isArray(res) ? res : (res.data || []);
    },
    create: (data) => request('/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getById: async (id) => {
      const res = await request(`/assignments/${id}`);
      return res.data || res;
    },
    updateStatus: (id, status) => request(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  },

  // 6. SMTP Accounts
  smtp: {
    list: async () => {
      const res = await request('/smtp');
      return Array.isArray(res) ? res : (res.data || []);
    },
    create: (data) => request('/smtp', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    testConnection: (id) => request(`/smtp/${id}/test`, {
      method: 'POST'
    }),
    update: (id, data) => request(`/smtp/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/smtp/${id}`, {
      method: 'DELETE'
    })
  },

  // 6b. AI Assistant Model & Key Configuration
  aiConfig: {
    list: async () => {
      const res = await request('/ai-config');
      return Array.isArray(res) ? res : (res.data || []);
    },
    create: (data) => request('/ai-config', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/ai-config/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    setDefault: (id) => request(`/ai-config/${id}/set-default`, {
      method: 'POST'
    }),
    delete: (id) => request(`/ai-config/${id}`, {
      method: 'DELETE'
    }),
    testConnection: (id) => request(`/ai-config/${id}/test`, {
      method: 'POST'
    })
  },

  // 7. Email Queue
  emailQueue: {
    getStatus: async () => {
      const res = await request('/email-queue');
      return res.data || res || {};
    },
    sendExamEmails: (assignmentId, baseUrl) => request(`/email-queue/send-exam/${assignmentId}`, {
      method: 'POST',
      body: JSON.stringify({ baseUrl: baseUrl || (typeof window !== 'undefined' ? window.location.origin : '') })
    }),
    sendCandidateEmail: (candidateId, baseUrl) => request(`/email-queue/send-candidate/${candidateId}`, {
      method: 'POST',
      body: JSON.stringify({ baseUrl: baseUrl || (typeof window !== 'undefined' ? window.location.origin : '') })
    }),
    retryFailed: () => request('/email-queue/retry', {
      method: 'POST'
    })
  },

  // 8. Public Student Examination API
  studentExam: {
    verifyOtp: (assignmentCode, otp) => request('/student-exam/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ assignmentCode, otp })
    }),
    syncAnswers: (sessionToken, answers) => request('/student-exam/sync-answers', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, answers })
    }),
    reportViolation: (sessionToken, violationType, details = '', clientTimestamp = new Date().toISOString()) => 
      request('/student-exam/violation', {
        method: 'POST',
        body: JSON.stringify({ sessionToken, violationType, details, clientTimestamp })
      }),
    submitExam: (sessionToken) => request('/student-exam/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionToken })
    }),
    search: (sessionToken, query, questionId = null) => request('/student-exam/search', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, query, questionId })
    }),
    readPage: (sessionToken, url) => request('/student-exam/search/read', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, url })
    }),
    askAi: (sessionToken, prompt, questionContext = '', codeContext = '', questionId = null) => request('/student-exam/ai-assist', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, prompt, questionContext, codeContext, questionId })
    }),
    getAiStatus: (sessionToken) => request('/student-exam/ai-status', {
      method: 'GET',
      headers: { 'x-exam-session-token': sessionToken }
    })
  },

  // 9. Evaluation
  evaluation: {
    getCandidateSubmission: async (candidateId) => {
      const res = await request(`/evaluation/candidates/${candidateId}`);
      return res.data || res;
    },
    saveQuestionEvaluation: (candidateId, questionId, marksAwarded, feedback = '') => 
      request('/evaluation/questions', {
        method: 'POST',
        body: JSON.stringify({ candidateId, questionId, marksAwarded, feedback })
      }),
    finalizeCandidateResult: (candidateId) => request(`/evaluation/candidates/${candidateId}/finalize`, {
      method: 'POST'
    }),
    publishAssignmentResults: (assignmentId) => request(`/evaluation/assignments/${assignmentId}/publish`, {
      method: 'POST'
    })
  },

  // 10. Reports
  reports: {
    getAssignmentReport: async (assignmentId) => {
      const res = await request(`/reports/assignments/${assignmentId}`);
      return res.data || res;
    },
    getCsvUrl: (assignmentId) => `${EXAM_API_BASE}/reports/assignments/${assignmentId}/csv`,
    getSecurityViolations: async () => {
      const res = await request('/reports/security-violations');
      return Array.isArray(res) ? res : (res.data || []);
    }
  },

  // 11. Audit Logs
  audit: {
    getLogs: async () => {
      const res = await request('/audit-logs');
      return res.data?.logs || (Array.isArray(res.data) ? res.data : []) || [];
    }
  },

  // 12. Student Self-Service Examination Portal
  student: {
    myExams: async () => {
      const res = await request('/student/my-exams');
      return res.data || res;
    }
  }
};
