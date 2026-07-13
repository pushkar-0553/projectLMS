import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectAPI, adminAPI, userAPI } from '../services/api'
import Button from '../components/common/Button'
import ProjectUploadForm from '../components/forms/ProjectUploadForm'
import { BookOpen, Users, Upload, Clock, Activity, Settings, User, Eye, Trash2, ChevronRight, Layers, BarChart2, Shield, GraduationCap, UserCheck } from 'lucide-react'

const AdminDashboard = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [facultyCount, setFacultyCount] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [projectsRes, activityRes, facultyRes] = await Promise.all([
        projectAPI.getAll(),
        adminAPI.getHistory(),
        userAPI.getAllFaculties()
      ])
      setProjects(projectsRes.data)
      setActivityLogs(activityRes.data ? activityRes.data.slice(0, 5) : [])
      setFacultyCount(facultyRes.data.length)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectUploaded = () => {
    setShowUploadForm(false)
    fetchDashboardData()
  }

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.deleteProject(projectId)
        fetchDashboardData()
        alert('Project deleted successfully!')
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('Failed to delete project. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Welcome back, {user?.name}! 👋</h1>
              <p>Here's what's happening in your digital learning platform today.</p>
            </div>
            <div className="header-actions">
              <Link to="/admin/students" className="action-link">
                <Button className="btn-glass">
                  <Users className="icon-sm" /> Manage Students
                </Button>
              </Link>
              <Link to="/admin/faculties" className="action-link">
                <Button className="btn-glass">
                  <UserCheck className="icon-sm" /> Manage Faculty
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container dashboard-main">
        {/* Stats Grid */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-content">
                <p className="stat-label">Total Projects</p>
                <h3 className="stat-number">{projects.length}</h3>
              </div>
              <div className="stat-icon-wrapper">
                <BookOpen className="stat-icon" />
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-content">
                <p className="stat-label">Beginner Tier</p>
                <h3 className="stat-number">
                  {projects.filter(p => p.level <= 2).length}
                </h3>
              </div>
              <div className="stat-icon-wrapper">
                <Layers className="stat-icon" />
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-content">
                <p className="stat-label">Advanced Tier</p>
                <h3 className="stat-number">
                  {projects.filter(p => p.level >= 3).length}
                </h3>
              </div>
              <div className="stat-icon-wrapper">
                <Activity className="stat-icon" />
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-content">
                <p className="stat-label">Faculty/Mentors</p>
                <h3 className="stat-number">{facultyCount}</h3>
              </div>
              <div className="stat-icon-wrapper">
                <UserCheck className="stat-icon" />
              </div>
            </div>
          </div>
        </section>

        {/* Projects Table Section */}
        <section className="dashboard-grid-2-1">
          <div className="table-card">
            <div className="card-header">
              <h2>Recent Modules</h2>
              <div className="card-actions">
                <BarChart2 className="text-muted" />
                <span className="text-muted text-sm ml-2">Displaying top {Math.min(projects.length, 5)}</span>
              </div>
            </div>

            <div className="table-wrapper">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <BookOpen className="empty-icon" />
                  </div>
                  <h3>No Projects Found</h3>
                  <p>Get started by uploading your first learning module!</p>
                  <Button className="btn-primary" onClick={() => setShowUploadForm(true)}>
                    Upload Project
                  </Button>
                </div>
              ) : (
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Project Details</th>
                      <th>Level</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 5).map((project) => (
                      <tr key={project.id} className="table-row">
                        <td>
                          <div className="project-detail-cell">
                            <div className="project-avatar" style={{ backgroundColor: getColorForLevel(project.level) }}>
                              {project.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="project-text">
                              <strong>{project.title}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge level-badge level-${project.level}`}>
                            Level {project.level}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons justify-end">
                            <Link to={`/guided-learning/${project.id}`} className="btn-icon view" title="View Project">
                              <Eye className="icon-sm" />
                            </Link>
                            <button
                              className="btn-icon delete"
                              title="Delete Project"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="icon-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {projects.length > 5 && (
              <div className="card-footer">
                <Link to="/admin/projects" className="view-all-link">
                  View All <ChevronRight className="icon-xs" />
                </Link>
              </div>
            )}
          </div>

          <aside className="activity-card">
            <div className="card-header">
              <h2>Recent Activity</h2>
              <Link to="/admin/history">
                <Shield className="icon-sm text-primary" />
              </Link>
            </div>
            <div className="activity-feed-mini">
              {activityLogs.length === 0 ? (
                <div className="empty-activity">
                  <Clock className="icon-md text-muted" />
                  <p>No recent activity logs.</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="activity-item-mini">
                    <div className="activity-icon-sm">
                      <Activity className="icon-xs" />
                    </div>
                    <div className="activity-info">
                      <p className="activity-desc">
                        <strong>{log.user_name}</strong> {log.description}
                      </p>
                      <span className="activity-time">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="card-footer">
              <Link to="/admin/history" className="view-all-link">
                View Audit Log <ChevronRight className="icon-xs" />
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <style>{`
        /* --- Base Layout --- */
        .admin-dashboard {
          min-height: 100vh;
          background-color: #f3f6f9;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #1e293b;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .loader-container {
          display: flex;
          height: 100vh;
          align-items: center;
          justify-content: center;
          background-color: #f3f6f9;
        }

        /* --- Utilities --- */
        .flex-center { display: flex; align-items: center; }
        .justify-end { justify-content: flex-end; }
        .text-muted { color: #64748b; }
        .text-sm { font-size: 0.875rem; }
        .mr-1 { margin-right: 0.25rem; }
        .ml-2 { margin-left: 0.5rem; }
        .icon-xs { width: 14px; height: 14px; }
        .icon-sm { width: 18px; height: 18px; }

        /* --- Header Section --- */
        .dashboard-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          overflow: hidden;
          padding: 2.5rem 0;
          margin-bottom: -3rem; /* Overlap for stats grid */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%);
          z-index: 0;
        }

        .header-container {
          position: relative;
          z-index: 1;
        }

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

        .action-link {
          text-decoration: none;
        }

        /* --- Buttons --- */
        .btn-glass {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s;
          cursor: pointer;
        }

        .btn-glass:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
        }

        .btn-primary:hover {
          background: #4338ca;
          box-shadow: 0 6px 8px -1px rgba(79, 70, 229, 0.4);
          transform: translateY(-1px);
        }

        .btn-primary.active {
          background: #ef4444;
          box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
        }

        /* --- Main Content --- */
        .dashboard-main {
          position: relative;
          z-index: 10;
          padding-top: 1.5rem;
          padding-bottom: 4rem;
        }

        .upload-section {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          animation: slideDown 0.3s ease-out forwards;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Stats Grid --- */
        .stats-section {
          margin-bottom: 2.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

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
          width: 56px;
          height: 56px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-card.primary .stat-icon-wrapper {
          background: #eef2ff;
          color: #4f46e5;
        }
        
        .stat-card.success .stat-icon-wrapper {
          background: #ecfdf5;
          color: #10b981;
        }

        .stat-card.warning .stat-icon-wrapper {
          background: #fff7ed;
          color: #f97316;
        }

        .stat-card.info .stat-icon-wrapper {
          background: #f0f9ff;
          color: #0ea5e9;
        }

        .stat-icon {
          width: 28px;
          height: 28px;
        }

        /* --- Table Card --- */
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

        .card-actions {
          display: flex;
          align-items: center;
        }

        .table-wrapper {
          overflow-x: auto;
          width: 100%;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
        }

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

        .table-row {
          transition: background-color 0.2s;
        }

        .table-row:hover {
          background-color: #f8fafc;
        }

        .project-detail-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .project-avatar {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1.25rem;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.1);
        }

        .project-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .project-text strong {
          color: #0f172a;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .project-text .description {
          color: #64748b;
          font-size: 0.8125rem;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* --- Badges --- */
        .badges-wrapper {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1;
        }

        .level-1 { background: #dcfce7; color: #166534; }
        .level-2 { background: #fef9c3; color: #854d0e; }
        .level-3 { background: #ffedd5; color: #9a3412; }
        .level-4 { background: #fee2e2; color: #991b1b; }
        .level-5 { background: #f3f4f6; color: #374151; }

        .difficulty-easy { border: 1px solid #86efac; color: #166534; background: transparent; }
        .difficulty-medium { border: 1px solid #fde047; color: #854d0e; background: transparent; }
        .difficulty-hard { border: 1px solid #fca5a5; color: #991b1b; background: transparent; }

        /* --- Action Buttons --- */
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .btn-icon.view:hover {
          color: #4f46e5;
          border-color: #c7d2fe;
          background: #eef2ff;
        }

        .btn-icon.delete:hover {
          color: #ef4444;
          border-color: #fecaca;
          background: #fef2f2;
        }

        /* --- Empty State --- */
        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty-icon-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .empty-icon {
          width: 32px;
          height: 32px;
          color: #94a3b8;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          color: #64748b;
          margin: 0 0 1.5rem 0;
        }

        /* --- Footer --- */
        .card-footer {
          padding: 1.25rem 2rem;
          background: #fafaf9;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: center;
        }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: #4f46e5;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .view-all-link:hover {
          color: #4338ca;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          .dashboard-header {
            margin-bottom: 2rem;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .action-buttons {
            flex-direction: column;
          }
          .project-text .description {
            max-width: 200px;
          }
        }

        /* --- New Activity Feed Styles --- */
        .dashboard-grid-2-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        .activity-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .activity-feed-mini {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 300px;
        }

        .activity-item-mini {
          display: flex;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity-item-mini:last-child {
          border-bottom: none;
        }

        .activity-icon-sm {
          width: 32px;
          height: 32px;
          background: #f1f5f9;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }

        .activity-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .activity-desc {
          margin: 0;
          font-size: 0.875rem;
          color: #334155;
          line-height: 1.4;
        }

        .activity-desc strong {
          color: #0f172a;
        }

        .activity-time {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .empty-activity {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
          color: #94a3b8;
          text-align: center;
        }

        .empty-activity p {
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }

        @media (max-width: 1024px) {
          .dashboard-grid-2-1 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function getColorForLevel(level) {
  const colors = [
    '#4f46e5', // Indigo
    '#059669', // Emerald
    '#d97706', // Amber
    '#dc2626', // Red
    '#7c3aed'  // Violet
  ];
  return colors[Math.max(0, Math.min(level - 1, colors.length - 1))] || colors[0];
}

export default AdminDashboard
