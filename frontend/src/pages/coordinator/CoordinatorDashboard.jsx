import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coordinatorAPI } from '../../services/api'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Button from '../../components/common/Button'
import {
  Users, Clock, CheckCircle, XCircle, ChevronRight, BarChart2,
  Search, ClipboardList, AlertCircle, Activity, ShieldCheck,
  MessageSquare, Lightbulb, BookOpen, Eye
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9']

const CoordinatorDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentProgress, setStudentProgress] = useState([])
  const [stats, setStats] = useState(null)
  const [projectStats, setProjectStats] = useState([])

  const [loading, setLoading] = useState(true)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedProgress, setSelectedProgress] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [studentsRes, approvalsRes, statsRes, projectStatsRes] = await Promise.all([
        coordinatorAPI.getStudents(),
        coordinatorAPI.getPendingApprovals(),
        coordinatorAPI.getDashboardStats(),
        coordinatorAPI.getProjectStats()
      ])
      setStudents(studentsRes.data)
      setPendingApprovals(approvalsRes.data)
      setStats(statsRes.data)
      setProjectStats(projectStatsRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentProgress = async (studentId) => {
    try {
      const response = await coordinatorAPI.getStudentProgress(studentId)
      setStudentProgress(response.data)
    } catch (error) {
      console.error('Failed to fetch student progress:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedProgress) return
    try {
      await coordinatorAPI.approveStep(selectedProgress.id, { feedback })
      setShowApproveDialog(false)
      setSelectedProgress(null)
      setFeedback('')
      fetchDashboardData()
      if (selectedStudent) fetchStudentProgress(selectedStudent.id)
    } catch (error) {
      console.error('Failed to approve step:', error)
      alert('Failed to approve step. Please try again.')
    }
  }

  const handleReject = async () => {
    if (!selectedProgress || !feedback.trim()) {
      alert('Please provide feedback for rejection')
      return
    }
    try {
      await coordinatorAPI.rejectStep(selectedProgress.id, { feedback })
      setShowRejectDialog(false)
      setSelectedProgress(null)
      setFeedback('')
      fetchDashboardData()
      if (selectedStudent) fetchStudentProgress(selectedStudent.id)
    } catch (error) {
      console.error('Failed to reject step:', error)
      alert('Failed to reject step. Please try again.')
    }
  }

  const selectStudent = (student) => {
    setSelectedStudent(student)
    fetchStudentProgress(student.id)
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="loader-container" style={{ height: '80vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="coordinator-dashboard fade-in">
      {/* Header — same pattern as AdminDashboard */}
      <header className="dashboard-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Welcome back, {user?.name}! 👋</h1>
              <p>Monitor student progress and manage academic reviews.</p>
            </div>
            <div className="header-actions">
              <Link to="/change-password">
                <Button variant="glass" className="flex-center gap-2">
                  <ShieldCheck className="icon-sm" /> Security
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container dashboard-main">
        {/* Stats Grid — same pattern as AdminDashboard */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-content">
                <p className="stat-label">Total Students</p>
                <h3 className="stat-number">{stats?.total_students || 0}</h3>
              </div>
              <div className="stat-icon-wrapper">
                <Users className="stat-icon" />
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-content">
                <p className="stat-label">Pending Reviews</p>
                <h3 className="stat-number">{stats?.pending_approvals || 0}</h3>
              </div>
              <div className="stat-icon-wrapper">
                <Clock className="stat-icon" />
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-content">
                <p className="stat-label">Total Approvals</p>
                <h3 className="stat-number">{stats?.total_approvals || 0}</h3>
              </div>
              <div className="stat-icon-wrapper">
                <CheckCircle className="stat-icon" />
              </div>
            </div>
          </div>
        </section>

        {/* Main grid: left content + right sidebar */}
        <div className="dashboard-grid-layout">
          <div className="main-feed">
            {/* Chart Card */}
            <section className="table-card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h2>
                  <BarChart2 className="icon-sm" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Enrollment Distribution
                </h2>
                <div className="card-actions">
                  <span className="text-muted text-sm">{projectStats.length} projects</span>
                </div>
              </div>
              <div style={{ padding: '1.5rem', height: '300px' }}>
                {projectStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectStats} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="students" radius={[6, 6, 0, 0]} barSize={40}>
                        {projectStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon-wrapper"><BarChart2 className="empty-icon" /></div>
                    <h3>No Data Yet</h3>
                    <p>Enrollment data will appear here once students enroll in projects.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Review Queue */}
            <section className="table-card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h2>
                  <AlertCircle className="icon-sm" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Pending Reviews
                </h2>
                <div className="card-actions">
                  <span className="badge badge-warning">{pendingApprovals.length} pending</span>
                </div>
              </div>
              <div className="table-wrapper">
                {pendingApprovals.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon-wrapper"><CheckCircle className="empty-icon" /></div>
                    <h3>All Clear!</h3>
                    <p>No pending reviews at this time.</p>
                  </div>
                ) : (
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Project</th>
                        <th>Step</th>
                        <th>Submitted</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApprovals.map((approval) => (
                        <tr key={approval.id} className="table-row">
                          <td>
                            <div className="project-detail-cell">
                              <div className="project-avatar" style={{ backgroundColor: '#4f46e5' }}>
                                {approval.student_name.charAt(0)}
                              </div>
                              <strong>{approval.student_name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-primary">{approval.project_title}</span>
                          </td>
                          <td>
                            <span className="text-sm">{approval.step_title}</span>
                            <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>(Step {approval.order_index})</span>
                          </td>
                          <td>
                            <div className="flex-center text-muted text-sm">
                              <Clock className="icon-xs" style={{ marginRight: '0.25rem' }} />
                              {new Date(approval.submitted_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons justify-end">
                              <button
                                className="btn-icon delete"
                                title="Reject"
                                onClick={() => { setSelectedProgress(approval); setShowRejectDialog(true) }}
                              >
                                <XCircle className="icon-sm" />
                              </button>
                              <button
                                className="btn-icon view"
                                title="Approve"
                                onClick={() => { setSelectedProgress(approval); setShowApproveDialog(true) }}
                              >
                                <CheckCircle className="icon-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Student Directory */}
            <section className="table-card">
              <div className="card-header">
                <h2>Student Directory</h2>
                <div className="card-actions">
                  <div className="search-box">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="table-wrapper">
                {filteredStudents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon-wrapper"><Users className="empty-icon" /></div>
                    <h3>No Students Found</h3>
                    <p>Try adjusting your search query.</p>
                  </div>
                ) : (
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Batch</th>
                        <th className="text-center">Pending</th>
                        <th className="text-center">Approved</th>
                        <th className="text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className={`table-row ${selectedStudent?.id === student.id ? 'active' : ''}`}
                        >
                          <td>
                            <div className="project-detail-cell">
                              <div className="project-avatar" style={{ backgroundColor: '#4f46e5' }}>
                                {student.name.charAt(0)}
                              </div>
                              <div className="project-text">
                                <strong>{student.name}</strong>
                                <span className="description">{student.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-primary">{student.batch || 'General'}</span>
                          </td>
                          <td className="text-center">
                            {student.pending_submissions > 0
                              ? <span className="badge badge-warning">{student.pending_submissions}</span>
                              : <span className="text-muted">—</span>
                            }
                          </td>
                          <td className="text-center">
                            {student.approved_submissions > 0
                              ? <span className="badge badge-success">{student.approved_submissions}</span>
                              : <span className="text-muted">—</span>
                            }
                          </td>
                          <td>
                            <div className="action-buttons justify-end">
                              <button
                                className="btn-icon view"
                                title="View Progress"
                                onClick={() => selectStudent(student)}
                              >
                                <Eye className="icon-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar — same pattern as Student Dashboard */}
          <aside className="dashboard-sidebar">
            {/* Selected Student Card */}
            <div className="card shadow-soft">
              {!selectedStudent ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div className="empty-icon-wrapper" style={{ margin: '0 auto 1rem' }}>
                    <Users className="empty-icon" />
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#0f172a' }}>Student Details</h4>
                  <p className="text-muted text-sm">Select a student from the directory to view their progress timeline.</p>
                </div>
              ) : (
                <div className="student-profile-card">
                  <div className="profile-header-mini">
                    <div className="avatar-placeholder">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <h4>{selectedStudent.name}</h4>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <div className="profile-divider"></div>
                  <div className="profile-stats">
                    <div className="mini-stat">
                      <span>Batch</span>
                      <strong>{selectedStudent.batch || 'N/A'}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Submissions</span>
                      <strong>{studentProgress.length}</strong>
                    </div>
                  </div>
                  <div className="profile-divider"></div>

                  <h4 className="flex-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
                    <Activity className="icon-sm" style={{ color: 'var(--primary)' }} /> Activity Timeline
                  </h4>

                  {studentProgress.length === 0 ? (
                    <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '1rem 0' }}>No activity recorded yet.</p>
                  ) : (
                    <div className="timeline">
                      {studentProgress.map((progress) => (
                        <div key={progress.id} className="timeline-item">
                          <div className={`timeline-dot ${progress.status}`}></div>
                          <div className="timeline-content">
                            <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.625rem' }}>{progress.project_title}</span>
                              <span className={`badge badge-${progress.status === 'approved' ? 'success' : progress.status === 'rejected' ? 'danger' : 'warning'}`}>
                                {progress.status}
                              </span>
                            </div>
                            <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{progress.step_title}</strong>
                            <div className="flex-center text-muted" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                              <Clock className="icon-xs" style={{ marginRight: '0.25rem' }} />
                              {new Date(progress.submitted_at).toLocaleDateString()}
                            </div>
                            {progress.feedback && (
                              <div className="feedback-box">
                                <MessageSquare className="icon-xs" style={{ marginRight: '0.25rem', opacity: 0.5, flexShrink: 0 }} />
                                <span>"{progress.feedback}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tips Card */}
            <div className="card shadow-soft" style={{ marginTop: '1.5rem' }}>
              <h4 className="flex-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
                <Lightbulb className="icon-sm" style={{ color: 'var(--primary)' }} /> Pro Tips
              </h4>
              <ul className="tips-list">
                <li>
                  <div className="tip-bullet"></div>
                  <p>Quality feedback leads to faster project completion rates.</p>
                </li>
                <li>
                  <div className="tip-bullet"></div>
                  <p>Specific technical feedback increases student retention by 2.5x.</p>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Approve Dialog */}
      <ConfirmDialog
        isOpen={showApproveDialog}
        title="Approve Submission"
        message={`Approve this submission from ${selectedProgress?.student_name}?`}
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={handleApprove}
        onCancel={() => { setShowApproveDialog(false); setSelectedProgress(null); setFeedback('') }}
      >
        <div style={{ marginTop: '1rem' }}>
          <label className="form-group">
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Feedback (optional):</span>
            <textarea
              className="form-control"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Great work! Everything looks solid."
              rows={3}
            />
          </label>
        </div>
      </ConfirmDialog>

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={showRejectDialog}
        title="Reject Submission"
        message={`Provide feedback for ${selectedProgress?.student_name} to fix issues.`}
        confirmText="Reject"
        cancelText="Cancel"
        onConfirm={handleReject}
        onCancel={() => { setShowRejectDialog(false); setSelectedProgress(null); setFeedback('') }}
      >
        <div style={{ marginTop: '1rem' }}>
          <label className="form-group">
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Feedback (required):</span>
            <textarea
              className="form-control"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Please fix the following issues..."
              rows={4}
              required
            />
          </label>
        </div>
      </ConfirmDialog>

      <style>{`
        /* --- Base Layout (matches AdminDashboard exactly) --- */
        .coordinator-dashboard {
          min-height: 100vh;
          background-color: #f3f6f9;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1e293b;
        }

        /* --- Header (copied from Admin) --- */
        .dashboard-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          overflow: hidden;
          padding: 2.5rem 0;
          margin-bottom: -3rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%);
          z-index: 0;
        }

        .header-container { position: relative; z-index: 1; }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .welcome-text h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.025em;
        }

        .welcome-text p {
          color: #64748b;
          margin: 0;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        /* --- Main Content --- */
        .dashboard-main {
          position: relative;
          z-index: 10;
          padding-top: 1.5rem;
          padding-bottom: 4rem;
        }

        /* --- Stats Grid (copied from Admin) --- */
        .stats-section { margin-bottom: 2.5rem; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          padding: 1.75rem;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }

        .stat-content { display: flex; flex-direction: column; gap: 0.25rem; }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .stat-number {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }

        .stat-icon-wrapper {
          width: 56px; height: 56px;
          border-radius: 1rem;
          display: flex; align-items: center; justify-content: center;
        }

        .stat-card.primary .stat-icon-wrapper { background: #eef2ff; color: #4f46e5; }
        .stat-card.success .stat-icon-wrapper { background: #ecfdf5; color: #10b981; }
        .stat-card.warning .stat-icon-wrapper { background: #fff7ed; color: #f97316; }
        .stat-icon { width: 28px; height: 28px; }

        /* --- Dashboard Grid (matches Student Dashboard) --- */
        .dashboard-grid-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2rem;
        }

        /* --- Table Card (copied from Admin) --- */
        .table-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e2e8f0;
          background: #fafaf9;
        }

        .card-header h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .card-actions { display: flex; align-items: center; }
        .table-wrapper { overflow-x: auto; width: 100%; }

        .modern-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
        .modern-table th {
          background: white;
          padding: 1rem 2rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }
        .modern-table td {
          padding: 1.25rem 2rem;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }

        .table-row { transition: background-color 0.2s; }
        .table-row:hover { background-color: #f8fafc; }
        .table-row.active { background-color: #eef2ff; }

        .project-detail-cell { display: flex; align-items: center; gap: 1rem; }
        .project-avatar {
          width: 40px; height: 40px; border-radius: 0.5rem;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 600; font-size: 1.25rem;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.1);
        }
        .project-text { display: flex; flex-direction: column; gap: 0.25rem; }
        .project-text strong { color: #0f172a; font-size: 0.9375rem; font-weight: 600; }
        .project-text .description { color: #64748b; font-size: 0.8125rem; }

        .action-buttons { display: flex; gap: 0.5rem; }
        .btn-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 0.5rem;
          border: 1px solid #e2e8f0; background: white; color: #64748b;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-icon:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
        .btn-icon.view:hover { color: #4f46e5; border-color: #c7d2fe; background: #eef2ff; }
        .btn-icon.delete:hover { color: #ef4444; border-color: #fecaca; background: #fef2f2; }

        .empty-state { padding: 4rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .empty-icon-wrapper {
          width: 72px; height: 72px; border-radius: 50%; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;
        }
        .empty-icon { width: 32px; height: 32px; color: #94a3b8; }
        .empty-state h3 { font-size: 1.25rem; color: #0f172a; margin: 0 0 0.5rem 0; }
        .empty-state p { color: #64748b; margin: 0; }

        /* --- Search Box --- */
        .search-box { position: relative; }
        .search-box .search-icon {
          position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; color: #94a3b8;
        }
        .search-box input {
          padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border: 1px solid #e2e8f0; border-radius: 0.5rem;
          font-size: 0.875rem; outline: none; transition: all 0.2s;
          width: 220px; background: white;
        }
        .search-box input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        /* --- Sidebar (matches Student Dashboard) --- */
        .dashboard-sidebar { }

        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
        }

        .student-profile-card { text-align: center; }

        .profile-header-mini { padding-top: 0.5rem; }
        .avatar-placeholder {
          width: 80px; height: 80px; background: #eef2ff; color: #4f46e5;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem; font-size: 2rem; font-weight: 700;
          border: 4px solid #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .profile-header-mini h4 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .profile-header-mini p { color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }
        .profile-divider { height: 1px; background: #f1f5f9; margin: 1.5rem 0; }
        .profile-stats { display: flex; justify-content: space-around; }
        .mini-stat { display: flex; flex-direction: column; gap: 0.25rem; text-align: center; }
        .mini-stat span { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        .mini-stat strong { font-size: 0.9375rem; color: #334155; }

        /* --- Timeline (simple clean style) --- */
        .timeline { display: flex; flex-direction: column; gap: 1rem; }
        .timeline-item { display: flex; gap: 0.75rem; }
        .timeline-dot {
          width: 10px; height: 10px; border-radius: 50%; margin-top: 0.35rem; flex-shrink: 0;
        }
        .timeline-dot.approved { background: #10b981; }
        .timeline-dot.rejected { background: #ef4444; }
        .timeline-dot.pending { background: #f59e0b; }
        .timeline-dot.submitted { background: #f59e0b; }
        .timeline-content { flex: 1; min-width: 0; }
        .feedback-box {
          margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: #f8fafc;
          border-radius: 0.5rem; border: 1px solid #f1f5f9;
          font-size: 0.75rem; color: #64748b; font-style: italic;
          display: flex; align-items: flex-start;
        }

        /* --- Tips (matches Student Dashboard) --- */
        .tips-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.25rem; }
        .tips-list li { display: flex; gap: 1rem; align-items: flex-start; }
        .tip-bullet { min-width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 0.4rem; }
        .tips-list p { margin: 0; font-size: 0.875rem; color: #64748b; line-height: 1.5; }

        /* --- Utilities --- */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .icon-xs { width: 14px; height: 14px; }
        .icon-sm { width: 18px; height: 18px; }

        @media (max-width: 1024px) {
          .dashboard-grid-layout { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; }
          .stats-grid { grid-template-columns: 1fr; }
          .search-box input { width: 160px; }
        }
      `}</style>
    </div>
  )
}

export default CoordinatorDashboard
