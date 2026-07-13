import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { ClipboardList, Clock, CheckCircle2, XCircle, ChevronRight, Target, Calendar, Award, BookOpen } from 'lucide-react';
import Button from '../../components/common/Button';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getMyTasks();
      setTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'approved': return { color: 'success', label: 'Completed', icon: <CheckCircle2 size={16} /> };
      case 'rejected': return { color: 'danger', label: 'Revision Required', icon: <XCircle size={16} /> };
      case 'submitted': return { color: 'info', label: 'In Review', icon: <Clock size={16} /> };
      default: return { color: 'neutral', label: 'Action Required', icon: <AlertCircle size={16} /> };
    }
  };

  return (
    <div className="student-tasks-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Training Roadmap</h1>
              <p>Execute your technical curriculum and track your institutional progress.</p>
            </div>
            <div className="header-stats">
              <div className="header-stat-box">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{tasks.filter(t => !t.review_status && !t.submission_status).length}</span>
              </div>
              <div className="header-stat-box">
                <span className="stat-label">In Review</span>
                <span className="stat-value">{tasks.filter(t => t.submission_status === 'submitted' && !t.review_status).length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <div className="tasks-inventory">
          {loading ? (
            <div className="skeleton-list">
              {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton-card-large"></div>)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state-card card">
              <div className="empty-icon-wrapper">
                <ClipboardList size={48} />
              </div>
              <h3>Curriculum Empty</h3>
              <p>Your institutional learning path will appear here once assigned by your coordinator.</p>
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map((task) => {
                const status = task.review_status || task.submission_status;
                const config = getStatusConfig(status);
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => navigate(`/student/task/${task.id}`)}
                    className="task-assignment-card card slide-up clickable"
                  >
                    <div className="task-card-header">
                      <div className="task-type-badge">
                        <Target size={14} />
                        {task.assigned_type}
                      </div>
                      {task.deadline && (
                        <div className="task-expiry-box">
                          <Calendar size={14} />
                          <span>Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    <div className="task-card-body">
                      <h3>{task.title}</h3>
                      <p className="task-summary">{task.description}</p>
                    </div>

                    <div className="task-card-footer">
                      <div className={`status-indicator ${config.color}`}>
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                      <div className="action-trigger">
                        <span className="trigger-text">View Specifications</span>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                    
                    <div className="card-decoration">
                      <div className="circle"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .student-tasks-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 3.5rem 0;
          margin-bottom: 2.5rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
        }

        .header-container { position: relative; z-index: 1; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .welcome-text h1 { font-size: 2.25rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.025em; }
        .welcome-text p { color: #64748b; font-size: 1.15rem; margin-top: 0.5rem; }

        .header-stats { display: flex; gap: 2rem; }
        .header-stat-box { display: flex; flex-direction: column; align-items: flex-end; }
        .stat-label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
        .stat-value { font-size: 1.75rem; font-weight: 900; color: #4f46e5; }

        .main-content { padding-bottom: 5rem; }

        .tasks-grid { display: flex; flex-direction: column; gap: 1.5rem; }

        .task-assignment-card {
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .task-assignment-card:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: #c7d2fe;
          box-shadow: 0 12px 30px -8px rgba(79, 70, 229, 0.12);
        }

        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .task-type-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #eff6ff;
          color: #3b82f6;
          padding: 0.35rem 0.85rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .task-expiry-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .task-card-body h3 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.75rem;
          transition: color 0.2s;
        }

        .task-assignment-card:hover .task-card-body h3 { color: #4f46e5; }

        .task-summary {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.6;
          max-width: 800px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .task-card-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .status-indicator.success { color: #10b981; }
        .status-indicator.danger { color: #ef4444; }
        .status-indicator.info { color: #3b82f6; }
        .status-indicator.neutral { color: #94a3b8; }

        .action-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #cbd5e1;
          transition: all 0.2s;
        }

        .trigger-text { font-size: 0.875rem; font-weight: 700; opacity: 0; transform: translateX(10px); transition: all 0.2s; }

        .task-assignment-card:hover .action-trigger { color: #4f46e5; }
        .task-assignment-card:hover .trigger-text { opacity: 1; transform: translateX(0); }

        .card-decoration .circle {
          position: absolute;
          top: -20px; right: -20px;
          width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.03) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          transition: transform 0.5s;
        }

        .task-assignment-card:hover .card-decoration .circle { transform: scale(1.5); }

        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; gap: 2rem; }
          .header-stat-box { align-items: flex-start; }
          .task-card-footer { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

const AlertCircle = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default TaskList;

