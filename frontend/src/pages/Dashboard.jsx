import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectAPI, studentAPI } from '../services/api'
import ResumeLearning from '../components/learning/ResumeLearning'
import Button from '../components/common/Button'
import { 
  BookOpen, Clock, ChevronRight, Layout, Activity, Award, 
  MessageSquare, Lightbulb, Users, CheckCircle, Calendar, XCircle, AlertCircle 
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    fetchRecentActivity()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await projectAPI.getDashboardStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const response = await studentAPI.getRecentActivity()
      setActivities(response.data)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    } finally {
      setActivitiesLoading(false)
    }
  }

  const renderRecentActivity = () => {
    if (activitiesLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        </div>
      )
    }

    if (activities.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No recent activity found. Submit tasks or steps to see them here!
        </div>
      )
    }

    const getIcon = (type, status) => {
      switch (type) {
        case 'task_submission':
          return <MessageSquare size={16} style={{ color: '#4f46e5' }} />
        case 'step_progress':
          return status === 'approved' 
            ? <CheckCircle size={16} style={{ color: '#10b981' }} /> 
            : status === 'rejected'
              ? <XCircle size={16} style={{ color: '#ef4444' }} />
              : <Clock size={16} style={{ color: '#f59e0b' }} />
        case 'simple_step':
          return <CheckCircle size={16} style={{ color: '#10b981' }} />
        case 'mock_interview':
          return <Calendar size={16} style={{ color: '#6366f1' }} />
        case 'mentoring':
          return <Users size={16} style={{ color: '#14b8a6' }} />
        default:
          return <Activity size={16} style={{ color: '#64748b' }} />
      }
    }

    const getBadgeStyle = (status) => {
      switch (status) {
        case 'approved':
        case 'completed':
          return { bg: '#dcfce7', text: '#15803d' }
        case 'rejected':
          return { bg: '#fee2e2', text: '#991b1b' }
        case 'pending':
        case 'submitted':
          return { bg: '#fef9c3', text: '#92400e' }
        default:
          return { bg: '#f1f5f9', text: '#475569' }
      }
    }

    return (
      <div className="activity-timeline">
        {activities.map((act) => {
          const badge = getBadgeStyle(act.status)
          const formattedDate = new Date(act.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })

          return (
            <div key={`${act.type}-${act.id}`} className="activity-timeline-item">
              <div className="activity-timeline-line"></div>
              <div className="activity-timeline-badge">
                {getIcon(act.type, act.status)}
              </div>
              <div className="activity-timeline-content">
                <div className="activity-meta">
                  <span className="activity-title-text">{act.title}</span>
                  <span className="activity-date">{formattedDate}</span>
                </div>
                <div className="activity-footer-pills">
                  <span 
                    className="activity-status-badge"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {act.status}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="student-dashboard fade-in">
      <header className="dashboard-header-modern">
        <div className="header-overlay"></div>
        <div className="container header-container">
          <div className="header-content-modern">
            <div className="welcome-section">
              <span className="badge badge-primary mb-2">Student Portal</span>
              <h1>Welcome back, {user?.name}! 👋</h1>
              <p>Continue your learning journey and build amazing projects.</p>
            </div>
            <div className="header-stats-grid">
              <div className="header-stat-glass">
                <Activity className="icon-sm text-primary" />
                <div>
                  <span className="stat-value">{stats?.overallProgress?.length || stats?.overallProgress?.totalProjects || 0}</span>
                  <span className="stat-label">Total Projects</span>
                </div>
              </div>
              <div className="header-stat-glass">
                <Award className="icon-sm text-success" />
                <div>
                  <span className="stat-value">{stats?.completedProjects || 0}</span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container dashboard-main-content">
        <div className="dashboard-grid-layout">
          {/* Left: Continued Learning & Exploration */}
          <div className="main-feed section-item">
            {/* Resume Section */}
            <div className="section-header-modern">
              <h2 className="section-title-modern">
                <Clock className="icon-md text-primary" /> Continue Learning
              </h2>
            </div>
            <div className="resume-container-modern shadow-soft mb-8">
              <ResumeLearning />
            </div>

            {/* Recent Activity Section */}
            <div className="section-header-modern">
              <h2 className="section-title-modern">
                <Activity className="icon-md text-primary" /> Recent Activity
              </h2>
            </div>
            <div className="card shadow-soft mb-8" style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #f1f5f9', padding: '16px' }}>
              {renderRecentActivity()}
            </div>

            {/* Active Project Highlight */}
            {stats?.activeProject && (
              <div className="card active-project-card mb-8 slide-up">
                <div className="active-project-header">
                  <div className="flex-center gap-3">
                    <div className="active-project-icon">
                      <BookOpen className="icon-md text-white" />
                    </div>
                    <div>
                      <span className="badge badge-success mb-1">In Progress</span>
                      <h3 className="section-title-mini">{stats.activeProject.title}</h3>
                    </div>
                  </div>
                  <div className="active-project-meta">
                    <span className="text-sm text-muted">Trainer: {stats.activeProject.trainer || 'TBD'}</span>
                  </div>
                </div>

                <div className="active-project-body mt-4">
                  <div className="flex-between mb-2">
                    <span className="text-sm font-bold">
                      {Math.round((stats.activeProject.step_completed / stats.activeProject.total_steps) * 100)}% Completed
                    </span>
                    <span className="text-sm text-muted">
                      {stats.activeProject.step_completed} / {stats.activeProject.total_steps} Steps
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(stats.activeProject.step_completed / stats.activeProject.total_steps) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex-end mt-4">
                    <Link to={`/guided-learning/${stats.activeProject.id}`}>
                      <Button variant="primary" className="btn-lg">
                        Continue Project <ChevronRight className="icon-xs ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Interview Guidance */}
            <div className="section-header-modern">
              <h2 className="section-title-modern">
                <Users className="icon-md text-indigo" /> Interview Guidance
              </h2>
            </div>
            <div className="guidance-grid-modern">
              <div className="guidance-card-modern hover-lift">
                <div className="guidance-icon-box bg-indigo-light">
                  <MessageSquare className="text-indigo" />
                </div>
                <h3>Self Introduction</h3>
                <p>Master the art of presenting yourself professionally.</p>
                <Link to="/student/interview-guidance?tab=intro">
                  <Button variant="secondary" size="small">Get Started</Button>
                </Link>
              </div>
              <div className="guidance-card-modern hover-lift">
                <div className="guidance-icon-box bg-emerald-light">
                  <Award className="text-success" />
                </div>
                <h3>Common HR Questions</h3>
                <p>Prepare for the most frequent interview challenges.</p>
                <Link to="/student/interview-guidance?tab=questions">
                  <Button variant="secondary" size="small">Get Started</Button>
                </Link>
              </div>
              <div className="guidance-card-modern hover-lift">
                <div className="guidance-icon-box bg-amber-light">
                  <Lightbulb className="text-warning" />
                </div>
                <h3>Tips & Tricks</h3>
                <p>Essential strategies for interview success.</p>
                <Link to="/student/interview-guidance?tab=tips">
                  <Button variant="secondary" size="small">Get Started</Button>
                </Link>
              </div>
            </div>

            <div className="flex-center mt-10">
              <Link to="/project-learning">
                <Button variant="primary" className="btn-lg">
                  <BookOpen className="icon-sm" /> Browse Full Catalog
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Sidebar */}
          <aside className="dashboard-sidebar-modern section-item">
            <div className="card shadow-soft profile-preview-card">
              <div className="profile-header-mini">
                <div className="avatar-placeholder">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <h4>{user?.name}</h4>
                <p>{user?.email}</p>
              </div>
              <div className="profile-divider"></div>
              <div className="profile-stats">
                <div className="mini-stat">
                  <span>Batch</span>
                  <strong>{user?.batch || 'N/A'}</strong>
                </div>
                <div className="mini-stat">
                  <span>Role</span>
                  <strong>Student</strong>
                </div>
              </div>
              <Link to="/users/profile" className="w-full mt-4">
                <Button variant="secondary" className="w-full">View Profile</Button>
              </Link>
            </div>

            <div className="card mt-6 shadow-soft">
              <h4 className="flex-center gap-2 mb-4 font-bold text-sm">
                <Lightbulb className="icon-sm text-primary" /> Learning Pro-Tips
              </h4>
              <ul className="tips-list">
                <li>
                  <div className="tip-bullet"></div>
                  <p>Check the project type: Simple projects can be completed anytime!</p>
                </li>
                <li>
                  <div className="tip-bullet"></div>
                  <p>Main projects require step-by-step approval from coordinators.</p>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        .activity-timeline {
          position: relative;
          padding: 1rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .activity-timeline-item {
          display: flex;
          position: relative;
          gap: 1rem;
        }

        .activity-timeline-line {
          position: absolute;
          left: 17px;
          top: 36px;
          bottom: -28px;
          width: 2px;
          background: #e2e8f0;
          z-index: 0;
        }

        .activity-timeline-item:last-child .activity-timeline-line {
          display: none;
        }

        .activity-timeline-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .activity-timeline-content {
          flex-grow: 1;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 1rem;
          padding: 0.875rem 1.125rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .activity-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .activity-title-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
        }

        .activity-date {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .activity-status-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 1px 6px;
          border-radius: 8px;
        }

        .student-dashboard {
          background-color: #f8fafc;
          min-height: 100vh;
          padding-bottom: 4rem;
        }

        .dashboard-header-modern {
          position: relative;
          background: #ffffff;
          padding: 3.5rem 0;
          overflow: hidden;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .header-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%);
          z-index: 0;
        }

        .header-container { position: relative; z-index: 1; }

        .header-content-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .welcome-section h1 {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0.5rem 0;
        }

        .welcome-section p { color: #64748b; font-size: 1.1rem; }

        .header-stats-grid {
          display: flex;
          gap: 1rem;
        }

        .header-stat-glass {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 1.25rem 1.75rem;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }

        .stat-value { display: block; font-size: 1.75rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }

        .dashboard-main-content { margin-top: -1rem; }

        .dashboard-grid-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2.5rem;
        }

        .section-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
        }

        .section-title-mini { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0; }

        .resume-container-modern {
          background: white;
          border-radius: 1.25rem;
          border: 1px solid #f1f5f9;
        }

        .active-project-card {
          border-left: 5px solid var(--success);
          padding: 2rem;
        }

        .active-project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .active-project-icon {
          width: 48px;
          height: 48px;
          background: var(--success);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
        }

        .guidance-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .guidance-card-modern {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1.25rem;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .guidance-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }

        .bg-indigo-light { background: #eef2ff; }
        .bg-emerald-light { background: #ecfdf5; }
        .bg-amber-light { background: #fff7ed; }

        .guidance-card-modern h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
        .guidance-card-modern p { font-size: 0.8125rem; color: #64748b; margin-bottom: 1.25rem; line-height: 1.4; }

        .profile-preview-card { text-align: center; padding: 2rem; }
        .avatar-placeholder { width: 80px; height: 80px; background: #eef2ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2rem; font-weight: 700; border: 4px solid #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .profile-header-mini h4 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .profile-header-mini p { color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }
        .profile-divider { height: 1px; background: #f1f5f9; margin: 1.5rem 0; }
        .profile-stats { display: flex; justify-content: space-around; }
        .mini-stat { display: flex; flex-direction: column; gap: 0.25rem; }
        .mini-stat span { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        .mini-stat strong { font-size: 0.9375rem; color: #334155; }

        .tips-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.25rem; }
        .tips-list li { display: flex; gap: 1rem; align-items: flex-start; }
        .tip-bullet { min-width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 0.4rem; }
        .tips-list p { margin: 0; font-size: 0.875rem; color: #64748b; line-height: 1.5; }

        .flex-end { display: flex; justify-content: flex-end; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .mt-10 { margin-top: 2.5rem; }
        .ml-1 { margin-left: 0.25rem; }
        .w-full { width: 100%; }
        .icon-md { width: 24px; height: 24px; }
        .icon-sm { width: 18px; height: 18px; }
        .icon-xs { width: 14px; height: 14px; }
        .shadow-soft { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }

        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }

        @media (max-width: 1024px) {
          .dashboard-grid-layout { grid-template-columns: 1fr; }
          .dashboard-sidebar-modern { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        }

        @media (max-width: 768px) {
          .header-content-modern { flex-direction: column; align-items: flex-start; }
          .welcome-section h1 { font-size: 1.85rem; }
          .active-project-header { flex-direction: column; gap: 1rem; }
        }
      `}</style>
    </div>
  )
}

export default Dashboard
