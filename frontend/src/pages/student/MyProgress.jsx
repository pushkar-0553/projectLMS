import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import Button from '../../components/common/Button'
import { Trophy, BookOpen, BarChart3, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

const MyProgress = () => {
  const { user } = useAuth()
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await projectAPI.getProgress()
      setProgress(response.data)
    } catch (error) {
      console.error('Failed to fetch progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    )
  }

  const completedProjects = progress.filter(p => p.completed).length
  const totalProjects = progress.length
  const overallProgress = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0

  return (
    <div className="my-progress fade-in">
      <header className="page-header-modern">
        <div className="container">
          <div className="flex-between flex-wrap gap-4">
            <div>
              <span className="badge badge-primary mb-2">Performance Tracking</span>
              <h1 className="header-title-modern">My Progress</h1>
              <p className="text-muted">Track your learning journey and project milestones.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content-modern">
        <div className="stats-grid-modern mb-10">
          <div className="card-stat-modern shadow-soft">
            <div className="stat-icon-wrapper bg-emerald-soft">
              <Trophy className="text-success" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{completedProjects}</span>
              <span className="stat-label">Finished</span>
            </div>
          </div>
          
          <div className="card-stat-modern shadow-soft">
            <div className="stat-icon-wrapper bg-indigo-soft">
              <BookOpen className="text-primary" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalProjects - completedProjects}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
          
          <div className="card-stat-modern shadow-soft">
            <div className="stat-icon-wrapper bg-amber-soft">
              <BarChart3 className="text-warning" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{Math.round(overallProgress)}%</span>
              <span className="stat-label">Mastery</span>
            </div>
          </div>
        </div>

        <div className="section-header-modern">
          <h2 className="section-title-modern">Project Roadmap</h2>
        </div>

        <div className="progress-details-modern">
          {progress.length === 0 ? (
            <div className="card empty-state-card text-center py-12 shadow-soft">
              <div className="empty-icon-box mb-4">
                <BookOpen className="icon-xl text-muted opacity-20" />
              </div>
              <h3 className="mb-2">No projects started yet</h3>
              <p className="text-muted mb-6">Begin your first course to see your progress here!</p>
              <Link to="/project-learning">
                <Button variant="primary" className="btn-lg">Explore Projects</Button>
              </Link>
            </div>
          ) : (
            <div className="progress-list-modern">
              {progress.map((item) => (
                <div key={item.project_id} className="progress-row-card shadow-soft hover-lift mb-4">
                  <div className="row-main-info">
                    <div className="project-type-indicator" style={{background: item.completed ? 'var(--success)' : 'var(--primary)'}}></div>
                    <div className="project-text">
                      <h4 className="font-bold">{item.title}</h4>
                      <div className="meta-flex">
                        <span className="text-xs text-muted">Level {item.level}</span>
                        <span className="dot"></span>
                        <span className="text-xs text-muted">{item.trainer || 'System Guided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="row-progress-section">
                    <div className="flex-between mb-2">
                       <span className="text-xs font-bold">{item.progress_percentage || 0}%</span>
                       <span className="text-xs text-muted">{item.step_completed}/{item.total_steps} Steps</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${item.progress_percentage || 0}%`,
                          background: item.completed ? 'var(--success)' : 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="row-action-section">
                    {item.completed ? (
                      <div className="status-badge-success">
                        <CheckCircle2 className="icon-xs" /> Completed
                      </div>
                    ) : (
                      <Link to={`/guided-learning/${item.project_id}`}>
                        <Button variant="secondary" size="small" className="btn-icon-right">
                          Resume <ChevronRight className="icon-xs" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .my-progress {
          background-color: #f8fafc;
          min-height: 100vh;
          padding-bottom: 5rem;
        }

        .page-header-modern {
          background: white;
          padding: 3rem 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 2.5rem;
        }

        .header-title-modern {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0.5rem 0;
        }

        .stats-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .card-stat-modern {
          background: white;
          border-radius: 1.25rem;
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          border: 1px solid #f1f5f9;
        }

        .stat-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-emerald-soft { background: #ecfdf5; }
        .bg-indigo-soft { background: #f0f9ff; }
        .bg-amber-soft { background: #fffbeb; }

        .stat-value { display: block; font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .stat-label { font-size: 0.8125rem; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.025em; }

        .progress-row-card {
          background: white;
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: grid;
          grid-template-columns: 1.5fr 2fr 120px;
          align-items: center;
          gap: 2rem;
          border: 1px solid #f1f5f9;
        }

        .row-main-info { display: flex; align-items: center; gap: 1.25rem; }
        .project-type-indicator { width: 4px; height: 40px; border-radius: 2px; }
        .project-text h4 { font-size: 1.1rem; color: #0f172a; margin-bottom: 0.25rem; }
        .meta-flex { display: flex; align-items: center; gap: 0.5rem; }
        .dot { width: 3px; height: 3px; background: #cbd5e1; border-radius: 50%; }

        .status-badge-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .btn-icon-right { gap: 0.4rem; }

        .empty-state-card { border: 2px dashed #e2e8f0; background: transparent; }
        .empty-icon-box { display: flex; justify-content: center; }

        .mb-10 { margin-bottom: 2.5rem; }
        .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
        .icon-xl { width: 64px; height: 64px; }
        .icon-md { width: 24px; height: 24px; }
        .shadow-soft { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); }

        @media (max-width: 900px) {
          .progress-row-card { grid-template-columns: 1fr; gap: 1.5rem; }
          .row-action-section { display: flex; justify-content: flex-end; }
        }
      `}</style>
    </div>
  )
}

export default MyProgress
