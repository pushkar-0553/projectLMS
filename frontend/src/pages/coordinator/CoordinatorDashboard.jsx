import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coordinatorAPI } from '../../services/api'
import platformAPI from '../../services/platformAPI'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Button from '../../components/common/Button'
import {
  Users, Clock, CheckCircle, XCircle, ChevronRight, BarChart2,
  Search, ClipboardList, AlertCircle, Activity, ShieldCheck,
  MessageSquare, Lightbulb, BookOpen, Eye, Video, Calendar,
  TrendingUp, UserCheck, AlertTriangle, Award, Target, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie
} from 'recharts'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9']

const CoordinatorDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [stats, setStats] = useState(null)
  const [projectStats, setProjectStats] = useState([])

  // Enhanced platform state
  const [batches, setBatches] = useState([])
  const [liveSessions, setLiveSessions] = useState([])
  const [performanceData, setPerformanceData] = useState([])
  const [riskAnalysis, setRiskAnalysis] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [attendanceAnalytics, setAttendanceAnalytics] = useState([])
  const [facultyPerformance, setFacultyPerformance] = useState([])
  const [notifications, setNotifications] = useState([])

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
      
      const safeFetch = async (apiCall, setter) => {
        try {
          const res = await apiCall;
          if (res && res.data) setter(res.data);
        } catch (e) {
          console.warn('Individual API call failed:', e);
        }
      };

      await Promise.all([
        safeFetch(coordinatorAPI.getStudents(), setStudents),
        safeFetch(coordinatorAPI.getPendingApprovals(), setPendingApprovals),
        safeFetch(coordinatorAPI.getDashboardStats(), setStats),
        safeFetch(coordinatorAPI.getProjectStats(), setProjectStats),
        safeFetch(platformAPI.getBatches({ coordinator_id: user.id }), setBatches),
        safeFetch(platformAPI.getSessions({ host_id: user.id, status: 'live' }), setLiveSessions),
        safeFetch(platformAPI.getPerformanceAnalytics({ period: '30' }), setPerformanceData),
        safeFetch(platformAPI.getRiskAnalysis(), setRiskAnalysis),
        safeFetch(platformAPI.getAttendanceAnalytics({ period: '30' }), setAttendanceAnalytics),
        safeFetch(platformAPI.getNotifications(), setNotifications)
      ]);
      
      // Get upcoming sessions separately
      try {
        const upcomingRes = await platformAPI.getSessions({ 
          host_id: user.id, 
          status: 'scheduled',
          page: 1,
          limit: 5 
        });
        setUpcomingSessions(upcomingRes.data);
      } catch (e) {
        console.warn('Upcoming sessions fetch failed');
      }
      
    } catch (error) {
      console.error('Core dashboard fetch error:', error)
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('Failed to reject step:', error)
      alert('Failed to reject step. Please try again.')
    }
  }

  const selectStudent = (student) => {
    navigate(`/coordinator/student/${student.id}`)
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="coordinator-dashboard-page fade-in">
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Institutional Overview</h1>
              <p>Welcome, {user?.name}. Orchestrate student hierarchies and oversee academic progression.</p>
            </div>
            <div className="header-actions">
              <Link to="/change-password">
                <Button className="btn-glass">
                  <ShieldCheck size={18} /> Credentials
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {/* Statistics Cluster */}
        <section className="stats-section slide-up">
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span className="stat-label">Total Students</span>
                <h3 className="stat-value">{stats?.total_students || 0}</h3>
              </div>
              <div className="stat-icon-box"><Users size={24} /></div>
            </div>
            <div className="stat-card amber">
              <div className="stat-info">
                <span className="stat-label">Pending Reviews</span>
                <h3 className="stat-value">{stats?.pending_approvals || 0}</h3>
              </div>
              <div className="stat-icon-box"><Clock size={24} /></div>
            </div>
            <div className="stat-card emerald">
              <div className="stat-info">
                <span className="stat-label">Live Sessions</span>
                <h3 className="stat-value">{liveSessions.length} Active</h3>
              </div>
              <div className="stat-icon-box"><Video size={24} /></div>
            </div>
            <div className="stat-card indigo">
              <div className="stat-info">
                <span className="stat-label">Managed Batches</span>
                <h3 className="stat-value">{batches.length} Batches</h3>
              </div>
              <div className="stat-icon-box"><Activity size={24} /></div>
            </div>
          </div>
        </section>

        <div className="platform-overview-row slide-up">
          <div className="card platform-card">
            <div className="card-header-simple">
              <h3><Video size={18} /> Active Sessions</h3>
              <Link to="/faculty/sessions" className="text-sm text-indigo">View All</Link>
            </div>
            <div className="session-list p-4">
              {liveSessions.length > 0 ? (
                liveSessions.map(session => (
                  <div key={session.id} className="session-item-inline">
                    <div className="session-indicator pulse"></div>
                    <div className="session-info">
                      <strong>{session.title}</strong>
                      <span>{session.batch_name || 'All Batches'} • {session.host_first_name}</span>
                    </div>
                    <Button size="sm" className="btn-glass ml-auto">Join</Button>
                  </div>
                ))
              ) : (
                <p className="empty-text">No sessions currently live.</p>
              )}
            </div>
          </div>

          <div className="card platform-card">
            <div className="card-header-simple">
              <h3><Target size={18} /> Managed Batches</h3>
              <Link to="/admin/batches" className="text-sm text-indigo">Manage</Link>
            </div>
            <div className="batch-mini-grid p-4">
              {batches.slice(0, 4).map(batch => (
                <div key={batch.id} className="batch-pill">
                  <strong>{batch.name}</strong>
                  <span>{batch.enrolled_students} Students</span>
                </div>
              ))}
              {batches.length === 0 && <p className="empty-text">No active batches assigned.</p>}
            </div>
          </div>
          
          <div className="card platform-card">
            <div className="card-header-simple">
              <h3><AlertTriangle size={18} /> Risk Analysis</h3>
            </div>
            <div className="risk-summary p-4">
              <div className="risk-bars">
                <div className="risk-bar-item critical">
                  <span>Critical</span>
                  <div className="bar-bg"><div className="bar-fill" style={{width: `${riskAnalysis.critical_risk ? (riskAnalysis.critical_risk/stats?.total_students*100) : 0}%`}}></div></div>
                  <span>{riskAnalysis.critical_risk || 0}</span>
                </div>
                <div className="risk-bar-item high">
                  <span>High</span>
                  <div className="bar-bg"><div className="bar-fill" style={{width: `${riskAnalysis.high_risk ? (riskAnalysis.high_risk/stats?.total_students*100) : 0}%`}}></div></div>
                  <span>{riskAnalysis.high_risk || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-layout">
          <div className="secondary-column">
            {/* Enrollment Distribution */}
            <section className="card chart-card slide-up">
              <div className="card-header-simple">
                <h3><BarChart2 size={20} /> Enrollment Distribution</h3>
                <span className="text-muted text-sm">{projectStats.length} projects tracked</span>
              </div>
              <div className="chart-wrapper">
                {projectStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="students" radius={[6, 6, 0, 0]} barSize={45}>
                        {projectStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">
                    <p>No enrollment data available yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Assessment Queue */}
            <section className="card assessment-card slide-up">
              <div className="card-header-simple flex-between">
                <h3><AlertCircle size={20} /> Assessment Queue</h3>
                <span className="badge-warning">{pendingApprovals.length} Pending</span>
              </div>
              <div className="table-wrapper">
                {pendingApprovals.length === 0 ? (
                  <div className="empty-table-state">
                    <CheckCircle className="text-emerald" size={48} />
                    <p>Review queue is currently empty.</p>
                  </div>
                ) : (
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Student Explorer</th>
                        <th>Institutional Project</th>
                        <th>Target Step</th>
                        <th className="text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApprovals.map(approval => (
                        <tr key={approval.id} className="table-row">
                          <td>
                            <div className="identity-tag">
                              <span className="avatar-mini">{approval.student_name.charAt(0)}</span>
                              <strong>{approval.student_name}</strong>
                            </div>
                          </td>
                          <td><span className="badge-glass">{approval.project_title}</span></td>
                          <td>
                            <div className="step-ref">
                              <strong>{approval.step_title}</strong>
                              <span>Level {approval.level} • Step {approval.order_index}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-3">
                              <Button 
                                variant="danger" 
                                size="small" 
                                className="action-button-premium"
                                onClick={() => { setSelectedProgress(approval); setShowRejectDialog(true); }}
                              >
                                <XCircle size={16} />
                                <span>Revision</span>
                              </Button>
                              <Button 
                                variant="success" 
                                size="small" 
                                className="action-button-premium"
                                onClick={() => { setSelectedProgress(approval); setShowApproveDialog(true); }}
                              >
                                <CheckCircle size={16} />
                                <span>Approve</span>
                              </Button>
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
 
          <aside className="primary-column">
            {/* Student Directory */}
            <section className="card directory-card slide-up">
              <div className="card-header-simple">
                <h3>Student Directory</h3>
              </div>
              <div className="directory-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by name/email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="directory-list">
                {filteredStudents.map(s => (
                  <div
                    key={s.id}
                    className="directory-item"
                    onClick={() => selectStudent(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="avatar-xs">{s.name.charAt(0)}</span>
                    <div className="item-info">
                      <span className="name">{s.name}</span>
                      <span className="email">{s.email}</span>
                    </div>
                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#94a3b8' }} />
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Modals maintained from original logic with premium styling */}
      <ConfirmDialog
        isOpen={showApproveDialog}
        title="Institutional Approval"
        message={`Authorize this submission for ${selectedProgress?.student_name}?`}
        confirmText="Approve Submission"
        onConfirm={handleApprove}
        onCancel={() => { setShowApproveDialog(false); setSelectedProgress(null); }}
      >
        <div className="review-feedback">
          <label>Assessment Remarks (Optional)</label>
          <textarea
            placeholder="e.g. Technical requirements met. Excellent implementation."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={showRejectDialog}
        title="Revision Required"
        message={`Provide technical feedback for ${selectedProgress?.student_name} to address concerns.`}
        confirmText="Request Revision"
        onConfirm={handleReject}
        onCancel={() => { setShowRejectDialog(false); setSelectedProgress(null); }}
      >
        <div className="review-feedback">
          <label>Technical Discrepancies (Required)</label>
          <textarea
            required
            placeholder="Identify specific areas for improvement..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <style>{`
        .platform-overview-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
        .platform-card { background: #fff; border-radius: 1rem; border: 1px solid #e2e8f0; }
        .session-item-inline { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 0.75rem; margin-bottom: 0.5rem; }
        .session-indicator { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
        .session-indicator.pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        .session-info { display: flex; flex-direction: column; }
        .session-info strong { font-size: 0.85rem; color: #1e293b; }
        .session-info span { font-size: 0.75rem; color: #64748b; }
        
        .batch-mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .batch-pill { padding: 0.75rem; background: #eef2ff; border-radius: 0.75rem; display: flex; flex-direction: column; border-left: 3px solid #4f46e5; }
        .batch-pill strong { font-size: 0.8rem; color: #4f46e5; }
        .batch-pill span { font-size: 0.7rem; color: #94a3b8; }
        
        .risk-bars { display: flex; flex-direction: column; gap: 1rem; }
        .risk-bar-item { display: flex; align-items: center; gap: 0.75rem; }
        .risk-bar-item span { font-size: 0.75rem; font-weight: 600; min-width: 50px; }
        .bar-bg { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease-out; }
        .critical .bar-fill { background: #ef4444; }
        .high .bar-fill { background: #f97316; }
        .empty-text { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem 0; }

        .coordinator-dashboard-page { min-height: 100vh; background: #f8fafc; }
        
        .page-header { position: relative; background: #fff; padding: 3rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%); }
        .header-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; }
        .welcome-text h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .welcome-text p { color: #64748b; font-size: 1.1rem; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: #fff; padding: 1.5rem; border-radius: 1rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; }
        .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
        .stat-value { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-top: 0.25rem; }
        .stat-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-card.blue .stat-icon-box { background: #eff6ff; color: #2563eb; }
        .stat-card.amber .stat-icon-box { background: #fffbeb; color: #d97706; }
        .stat-card.emerald .stat-icon-box { background: #ecfdf5; color: #059669; }
        .stat-card.indigo .stat-icon-box { background: #eef2ff; color: #4f46e5; }

        .dashboard-layout { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; }
        .card-header-simple { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.75rem; }
        .card-header-simple h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; margin: 0; }

        .chart-wrapper { padding: 1.5rem; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { padding: 1rem 1.5rem; background: #f8fafc; text-align: left; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .modern-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
        
        .identity-tag { display: flex; align-items: center; gap: 0.75rem; }
        .avatar-mini { width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
        .badge-glass { padding: 0.25rem 0.75rem; background: rgba(79, 70, 229, 0.08); color: #4f46e5; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; }
        .step-ref { display: flex; flex-direction: column; gap: 0.15rem; }
        .step-ref span { font-size: 0.7rem; color: #94a3b8; }

        .directory-search { padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; position: relative; }
        .directory-search input { width: 100%; padding: 0.625rem 1rem 0.625rem 2.5rem; background: #f1f5f9; border: 1px solid transparent; border-radius: 0.75rem; outline: none; }
        .directory-search svg { position: absolute; left: 2.25rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .directory-list { max-height: 400px; overflow-y: auto; }
        .directory-item { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; }
        .directory-item:hover { background: #f8fafc; }
        .directory-item.active { background: #eef2ff; border-left-color: #4f46e5; }
        .avatar-xs { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .item-info { display: flex; flex-direction: column; }
        .item-info .name { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
        .item-info .email { font-size: 0.75rem; color: #94a3b8; }

        .timeline-focused { padding: 2rem 1.5rem; }
        .focused-header { text-align: center; margin-bottom: 2rem; }
        .avatar-md { width: 64px; height: 64px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.5rem; font-weight: 800; }
        .activity-timeline { display: flex; flex-direction: column; gap: 1.5rem; }
        .activity-item { position: relative; padding-left: 1.5rem; border-left: 1px solid #e2e8f0; }
        .status-node { position: absolute; left: -5px; top: 0; width: 9px; height: 9px; border-radius: 50%; }
        .status-node.pending { background: #f97316; }
        .status-node.approved { background: #10b981; }
        .status-node.rejected { background: #ef4444; }

        .review-feedback label { display: block; font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; }
        .review-feedback textarea { width: 100%; min-height: 120px; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; }
        .review-feedback textarea:focus { border-color: #4f46e5; }

        .action-button-premium { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          padding: 0.5rem 0.875rem; 
          border-radius: 0.625rem; 
          font-weight: 600; 
          font-size: 0.8rem;
          transition: all 0.2s;
          border: none;
          color: white;
        }
        .action-button-premium.btn-success { background: #10b981; }
        .action-button-premium.btn-danger { background: #ef4444; }
        .action-button-premium:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); opacity: 0.9; }
        .action-button-premium svg { flex-shrink: 0; }
        
        .modern-table td { vertical-align: middle; }

        @media (max-width: 1200px) {
          .dashboard-layout { grid-template-columns: 1fr; }
          .secondary-column { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        }
        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; }
          .secondary-column { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default CoordinatorDashboard;
