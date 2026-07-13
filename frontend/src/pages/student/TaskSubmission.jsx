import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI, resolveAssetUrl } from '../../services/api';
import { ChevronLeft, Send, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Info, Layout, ExternalLink } from 'lucide-react';
import Button from '../../components/common/Button';

const TaskSubmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState({ submission_text: '', file: null });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getTaskById(id);
      setTask(response.data);
    } catch (err) {
      console.error('Failed to fetch task', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await studentAPI.submitTask({
        task_id: id,
        submission_text: submission.submission_text
      });
      setSuccess(true);
      setTimeout(() => navigate('/student/tasks'), 2000);
    } catch (err) {
      alert('Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Provisioning Workspace...</p>
    </div>
  );

  if (!task) return (
    <div className="error-state">
      <XCircle size={48} className="text-danger" />
      <h3>Task Environment Unavailable</h3>
      <p>The requested training module could not be localized on the server.</p>
      <Button className="btn-secondary" onClick={() => navigate('/student/tasks')}>Return to Roadmap</Button>
    </div>
  );

  return (
    <div className="task-submission-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container text-white">
          <div className="header-top">
            <button 
              onClick={() => navigate('/student/tasks')}
              className="back-btn-light"
            >
              <ChevronLeft size={16} />
              Return to Curriculum
            </button>
          </div>
          
          <div className="header-essence">
            <div className="essence-meta">
              <span className="type-tag">{task.assigned_type} Module</span>
              {task.deadline && (
                <span className="deadline-tag">
                  <Clock size={14} />
                  Resolution Goal: {new Date(task.deadline).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </span>
              )}
            </div>
            <h1 className="essence-title">{task.title}</h1>
          </div>
        </div>
      </header>

      <main className="container main-content -mt-12 relative z-10">
        <div className="workspace-partition">
          {/* Left: Curriculum Specifications */}
          <section className="spec-card card slide-up">
            <div className="spec-header">
              <div className="spec-icon-box">
                <Info size={22} />
              </div>
              <div className="spec-title-group">
                <h3>Technical Specifications</h3>
                <p>Execute the following requirements to fulfill institutional criteria.</p>
              </div>
            </div>
            
            <div className="spec-body text-rich">
              {task.description}
            </div>

            {task.file_path && (
              <div className="resource-alert">
                <div className="alert-content">
                  <FileText className="alert-icon" size={20} />
                  <div className="alert-text">
                    <p className="alert-title">Reference Documentation</p>
                    <p className="alert-desc">Supplementary material provided for technical guidance.</p>
                  </div>
                </div>
                <a 
                  href={resolveAssetUrl(task.file_path)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="resource-download-btn"
                >
                  Retrieve Artifact <ExternalLink size={14} />
                </a>
              </div>
            )}
          </section>

          {/* Right: Submission Operations */}
          <aside className="operations-panel slide-up">
            <div className="submission-card card">
              <div className="card-top-accent"></div>
              <div className="card-inner">
                <div className="section-head">
                  <Send size={18} className="text-primary" />
                  <h4>Executive Response</h4>
                </div>

                {success ? (
                  <div className="submission-success fade-in">
                    <div className="success-lottie-mock">
                      <CheckCircle2 size={48} />
                    </div>
                    <h5>Submission Recorded</h5>
                    <p>Your response is now queued for administrative assessment.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="submission-form">
                    <div className="form-group-custom">
                      <label>Manifesto / Implementation Details</label>
                      <textarea 
                        required
                        rows="8"
                        className="workspace-textarea"
                        placeholder="Detail your technical approach, implementation logic, or paste your solution summary..."
                        value={submission.submission_text}
                        onChange={(e) => setSubmission({...submission, submission_text: e.target.value})}
                      />
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full btn-lg"
                    >
                      {submitting ? 'Transmitting...' : (
                        <>
                          <Send size={18} />
                          Finalize Submission
                        </>
                      )}
                    </Button>
                    
                    <div className="audit-disclaimer">
                      <Lock size={12} />
                      <span>End-to-end encrypted institutional audit trail active</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        .task-submission-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #1e293b;
          padding: 4rem 0 6rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          opacity: 0.95;
        }

        .back-btn-light {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 2rem;
        }

        .back-btn-light:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .header-essence { position: relative; z-index: 1; max-width: 800px; }
        
        .essence-meta { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem; }
        .type-tag { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; background: #4f46e5; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; letter-spacing: 0.05em; }
        .deadline-tag { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); font-weight: 600; }

        .essence-title { font-size: 2.75rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.025em; }

        .workspace-partition { display: grid; grid-template-columns: 1fr 380px; gap: 2rem; }

        .spec-card { padding: 3rem; }
        .spec-header { display: flex; gap: 1.5rem; align-items: flex-start; margin-bottom: 2.5rem; }
        .spec-icon-box { width: 56px; height: 56px; background: #eef2ff; color: #4f46e5; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .spec-title-group h3 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .spec-title-group p { font-size: 0.9rem; color: #64748b; margin: 0; }

        .spec-body { font-size: 1.1rem; line-height: 1.7; color: #334155; white-space: pre-wrap; margin-bottom: 3rem; }

        .resource-alert {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
        }

        .alert-content { display: flex; gap: 1rem; }
        .alert-icon { color: #4f46e5; }
        .alert-title { font-size: 0.9rem; font-weight: 800; color: #0f172a; margin: 0; }
        .alert-desc { font-size: 0.8rem; color: #64748b; margin: 0; }
        
        .resource-download-btn {
          background: white;
          color: #4f46e5;
          padding: 0.625rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .resource-download-btn:hover { background: #4f46e5; color: white; border-color: #4f46e5; transform: scale(1.05); }

        .operations-panel { display: flex; flex-direction: column; }
        .submission-card { padding: 0; border-top: none; }
        .card-top-accent { height: 4px; background: linear-gradient(to right, #4f46e5, #10b981); }
        .card-inner { padding: 2.5rem; }

        .section-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
        .section-head h4 { font-size: 0.8rem; font-weight: 9500; text-transform: uppercase; letter-spacing: 0.1em; color: #1e293b; margin: 0; }

        .workspace-textarea {
          width: 100%;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1.5rem;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #1e293b;
          resize: none;
          transition: all 0.2s;
          margin-bottom: 1.5rem;
        }

        .workspace-textarea:focus {
          outline: none;
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.05);
        }

        .label { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.75rem; }

        .audit-disclaimer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .submission-success {
          text-align: center;
          padding: 2rem 0;
        }
        
        .success-lottie-mock { width: 80px; height: 80px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .submission-success h5 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .submission-success p { font-size: 0.9rem; color: #64748b; margin: 0; }

        .loading-state { height: 60vh; display: flex; flex-direction: column; items-center justify-content: center; gap: 1rem; }
        .error-state { height: 60vh; display: flex; flex-direction: column; items-center justify-content: center; gap: 1rem; text-align: center; }

        @media (max-width: 1024px) {
          .workspace-partition { grid-template-columns: 1fr; }
          .operations-panel { order: -1; }
          .essence-title { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
};

const Lock = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default TaskSubmission;
