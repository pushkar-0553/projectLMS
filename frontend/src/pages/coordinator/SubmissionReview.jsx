import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coordinatorAPI, resolveAssetUrl } from '../../services/api';
import { CheckCircle2, XCircle, Clock, FileText, Download, User, MessageSquare, ChevronLeft, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';

const SubmissionReview = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState({ submissionId: '', status: '', feedback: '' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchSubmissions();
    }
  }, [taskId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await coordinatorAPI.getTaskSubmissions(taskId);
      setSubmissions(response.data);
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await coordinatorAPI.reviewSubmission(reviewData);
      setShowModal(false);
      setReviewData({ submissionId: '', status: '', feedback: '' });
      fetchSubmissions();
    } catch (err) {
      alert('Failed to submit review');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'badge-primary',
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return (
      <span className={`badge ${badges[status] || 'badge-warning'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="submission-review-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <button 
                onClick={() => navigate(-1)}
                className="back-btn"
              >
                <ChevronLeft size={16} />
                Manage Tasks
              </button>
              <h1>Assessment Gateway</h1>
              <p>Evaluate student performance and provide constructive institutional feedback.</p>
            </div>
            <div className="header-icon-box">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content overflow-visible">
        <div className="submissions-list">
          {loading ? (
            <div className="skeleton-list">
              {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton-card-large"></div>)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty-state-card card">
              <div className="empty-icon-wrapper">
                <Clock size={48} />
              </div>
              <h3>Waiting for Submissions</h3>
              <p>When students assigned to this task submit their work, they will appear here for your review.</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="submission-card card slide-up">
                <div className="sub-card-layout">
                  {/* Sidebar: Student Metadata */}
                  <aside className="student-sidebar">
                    <div className="student-profile">
                      <div className="student-avatar">
                        {sub.student_name.charAt(0)}
                      </div>
                      <div className="student-info">
                        <h3>{sub.student_name}</h3>
                        <p>{sub.student_email}</p>
                      </div>
                    </div>
                    
                    <div className="metadata-grid">
                      <div className="meta-item">
                        <span className="meta-label">Current Status</span>
                        {getStatusBadge(sub.status)}
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Date Submitted</span>
                        <span className="meta-value">{new Date(sub.submitted_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                    </div>
                  </aside>

                  {/* Main: Submission Content */}
                  <section className="submission-content">
                    <div className="content-block">
                      <div className="block-header">
                        <MessageSquare size={16} />
                        <h4>Executive Summary / Description</h4>
                      </div>
                      <div className="response-well">
                        {sub.submission_text || "The student did not provide a textual summary for this submission."}
                      </div>
                    </div>

                    {sub.file_path && (
                      <div className="attachment-well">
                        <div className="file-icon">
                          <FileText size={20} />
                        </div>
                        <div className="file-meta">
                          <p className="file-name">{sub.file_path.split(/[\\/]/).pop()}</p>
                          <p className="file-type">Institutional Project Artifact</p>
                        </div>
                        <a 
                          href={resolveAssetUrl(sub.file_path)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="download-anchor"
                          title="Download Submisson"
                        >
                          <Download size={20} />
                        </a>
                      </div>
                    )}

                    {sub.feedback && (
                      <div className="feedback-block">
                        <div className="block-header">
                          <AlertCircle size={16} />
                          <h4>Institutional Feedback</h4>
                        </div>
                        <div className={`feedback-well ${sub.status}`}>
                          {sub.feedback}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Actions Area */}
                  <div className="submission-actions">
                    {sub.status === 'submitted' ? (
                      <div className="action-stack">
                        <Button 
                          onClick={() => {
                            setReviewData({ submissionId: sub.id, status: 'approved', feedback: '' });
                            setShowModal(true);
                          }}
                          className="btn-success w-full"
                        >
                          <CheckCircle2 size={18} />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => {
                            setReviewData({ submissionId: sub.id, status: 'rejected', feedback: '' });
                            setShowModal(true);
                          }}
                          className="btn-danger w-full btn-glass"
                        >
                          <XCircle size={18} />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => {
                          setReviewData({ submissionId: sub.id, status: sub.status, feedback: sub.feedback });
                          setShowModal(true);
                        }}
                        className="btn-secondary w-full"
                      >
                        Revise Assessment
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Assessment Modal */}
      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content slide-up">
            <div className="modal-header">
              <div className={`icon-box-${reviewData.status === 'approved' ? 'success' : 'danger'}`}>
                {reviewData.status === 'approved' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
              <div className="modal-labels">
                <h2>Grade Submission</h2>
                <p>Submit your final evaluation and feedback for this artifact.</p>
              </div>
            </div>
            
            <form onSubmit={handleReview} className="modal-body-form">
              <div className="form-group">
                <label>Assessment Decision</label>
                <div className="verdict-toggle">
                  <button 
                    type="button"
                    onClick={() => setReviewData({...reviewData, status: 'approved'})}
                    className={`verdict-btn approve ${reviewData.status === 'approved' ? 'active' : ''}`}
                  >
                    Passed Approval
                  </button>
                  <button 
                    type="button"
                    onClick={() => setReviewData({...reviewData, status: 'rejected'})}
                    className={`verdict-btn reject ${reviewData.status === 'rejected' ? 'active' : ''}`}
                  >
                    Requires Revision
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Constructive Feedback</label>
                <textarea 
                  rows="5" 
                  required={reviewData.status === 'rejected'}
                  className="form-control"
                  placeholder="Explain your decision and provide guidance for improvement..."
                  value={reviewData.feedback}
                  onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Discard Changes</button>
                <Button 
                  type="submit" 
                  className={`btn-${reviewData.status === 'approved' ? 'success' : 'danger'}`}
                >
                  Finalize Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .submission-review-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 2.5rem 0;
          margin-bottom: 2rem;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .back-btn:hover { color: #4f46e5; }

        .header-container { position: relative; z-index: 1; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .welcome-text h1 { font-size: 1.875rem; font-weight: 800; color: #0f172a; margin: 0; }
        .welcome-text p { color: #64748b; margin-top: 0.25rem; font-size: 1rem; }
        
        .header-icon-box {
          width: 64px;
          height: 64px;
          background: #f1f5f9;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-content { padding-bottom: 5rem; }

        .submissions-list { display: flex; flex-direction: column; gap: 1.5rem; }

        .submission-card { padding: 0; overflow: hidden; }
        
        .sub-card-layout {
          display: grid;
          grid-template-columns: 260px 1fr 180px;
        }

        .student-sidebar {
          background: #fafafa;
          padding: 2rem;
          border-right: 1px solid #f1f5f9;
        }

        .student-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1.25rem;
        }

        .student-info h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .student-info p { font-size: 0.8rem; color: #64748b; margin: 0; }

        .metadata-grid { margin-top: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .meta-item { display: flex; flex-direction: column; gap: 0.35rem; }
        .meta-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-value { font-size: 0.875rem; font-weight: 700; color: #475569; }

        .submission-content { padding: 2.5rem; }
        .content-block { margin-bottom: 2rem; }
        .block-header { display: flex; align-items: center; gap: 0.75rem; color: #94a3b8; margin-bottom: 1rem; }
        .block-header h4 { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

        .response-well {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 1rem;
          color: #334155;
          font-size: 0.95rem;
          line-height: 1.6;
          white-space: pre-wrap;
          border: 1px solid #f1f5f9;
        }

        .attachment-well {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }

        .file-icon {
          width: 44px;
          height: 44px;
          background: #3b82f6;
          color: white;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-name { font-size: 0.9rem; font-weight: 800; color: #1e3a8a; margin: 0; }
        .file-type { font-size: 0.75rem; color: #3b82f6; font-weight: 600; margin: 0; }
        .download-anchor { color: #3b82f6; transition: transform 0.2s; }
        .download-anchor:hover { transform: scale(1.1); }

        .feedback-well {
          padding: 1.25rem;
          border-radius: 1rem;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .feedback-well.approved { background: #ecfdf5; color: #065f46; border: 1px solid #d1fae5; }
        .feedback-well.rejected { background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; }

        .submission-actions {
          padding: 2.5rem 1.5rem;
          background: #fafafa;
          border-left: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
        }

        .action-stack { display: flex; flex-direction: column; gap: 1rem; width: 100%; }

        .verdict-toggle { display: flex; gap: 0.75rem; }
        .verdict-btn {
          flex: 1;
          padding: 1rem;
          border-radius: 0.875rem;
          border: 2px solid #f1f5f9;
          font-weight: 800;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .verdict-btn.approve.active { background: #10b981; border-color: #10b981; color: white; }
        .verdict-btn.reject.active { background: #ef4444; border-color: #ef4444; color: white; }

        @media (max-width: 1024px) {
          .sub-card-layout { grid-template-columns: 1fr; }
          .student-sidebar { border-right: none; border-bottom: 1px solid #f1f5f9; }
          .submission-actions { border-left: none; border-top: 1px solid #f1f5f9; }
        }
      `}</style>
    </div>
  );
};

export default SubmissionReview;
