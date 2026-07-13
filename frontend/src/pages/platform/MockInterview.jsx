import React, { useState, useEffect } from 'react';
import { 
  Video, Calendar, Clock, Users, Award, Target, Star, 
  MessageSquare, ChevronRight, Play, CheckCircle, AlertCircle, Search
} from 'lucide-react';
import { facultyAPI } from '../../services/api';

const MockInterview = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState({
    communication_score: 5,
    technical_score: 5,
    confidence_score: 5,
    problem_solving_score: 5,
    strengths: '',
    weaknesses: '',
    recommendations: '',
    final_feedback: ''
  });

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getInterviews();
      setInterviews(response.data || []);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvaluation = async (interviewId) => {
    try {
      await facultyAPI.submitEvaluation({
        interview_id: interviewId,
        communication_score: evaluationForm.communication_score,
        technical_score: evaluationForm.technical_score,
        confidence_score: evaluationForm.confidence_score,
        problem_solving: evaluationForm.problem_solving_score,
        strengths: evaluationForm.strengths,
        improvements: evaluationForm.weaknesses,
        final_remarks: evaluationForm.final_feedback
      });
      fetchInterviews();
      setSelectedInterview(null);
      setEvaluationForm({
        communication_score: 5,
        technical_score: 5,
        confidence_score: 5,
        problem_solving_score: 5,
        strengths: '',
        weaknesses: '',
        recommendations: '',
        final_feedback: ''
      });
      alert('Evaluation submitted successfully!');
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      alert('Failed to submit evaluation');
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'scheduled': return { color: '#3b82f6', bg: '#eff6ff', icon: Calendar, text: 'Scheduled' };
      case 'completed': return { color: '#10b981', bg: '#ecfdf5', icon: CheckCircle, text: 'Completed' };
      case 'cancelled': return { color: '#ef4444', bg: '#fef2f2', icon: AlertCircle, text: 'Cancelled' };
      default: return { color: '#64748b', bg: '#f1f5f9', icon: Calendar, text: status || 'Upcoming' };
    }
  };

  if (loading) {
    return (
      <div className="premium-loader">
        <div className="loader-ring"></div>
        <span className="loader-text">Loading Interviews...</span>
      </div>
    );
  }

  return (
    <div className="mock-interview-premium">
      <header className="p-view-header">
        <div className="title-area">
          <div className="p-icon-box"><Target size={24} /></div>
          <div>
            <h1>Mock Interviews</h1>
            <p>Assessment gateway for professional student evaluations</p>
          </div>
        </div>
        <div className="action-area">
          <div className="p-search-wrapper">
            <Search size={18} />
            <input type="text" placeholder="Search by student or ID..." />
          </div>
          <button className="p-btn-glow">
            Schedule Session
          </button>
        </div>
      </header>

      <div className="interview-grid">
        {interviews.map((interview) => {
          const config = getStatusConfig(interview.status);
          const StatusIcon = config.icon;
          return (
            <div key={interview.id} className="i-card hover-lift">
              <div className="i-card-header">
                <div className="i-status-tag" style={{ backgroundColor: config.bg, color: config.color }}>
                  <StatusIcon size={14} />
                  <span>{config.text}</span>
                </div>
                <button className="i-more-btn">•••</button>
              </div>

              <h3 className="i-title">{interview.title}</h3>
              
              <div className="i-users">
                <div className="i-user">
                  <div className="i-avatar s-avatar">{interview.student_name?.charAt(0)}</div>
                  <div className="i-details">
                    <span className="i-role">Candidate</span>
                    <span className="i-name">{interview.student_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div className="i-meta-grid">
                <div className="i-meta-item">
                  <div className="i-meta-icon"><Calendar size={14} /></div>
                  <span>{interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleDateString() : 'Not set'}</span>
                </div>
                <div className="i-meta-item">
                  <div className="i-meta-icon"><Clock size={14} /></div>
                  <span>{interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                </div>
              </div>

              <div className="i-footer">
                {interview.meeting_link && (
                  <a href={interview.meeting_link} target="_blank" rel="noreferrer" className="i-action-btn primary">
                    <Play size={16} /> Join
                  </a>
                )}
                <button 
                  onClick={() => setSelectedInterview(interview)}
                  className={`i-action-btn ${interview.status === 'scheduled' ? 'success' : 'secondary'}`}
                >
                  {interview.status === 'scheduled' ? <Award size={16} /> : <Search size={16} />}
                  {interview.status === 'scheduled' ? 'Evaluate' : 'Review'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {interviews.length === 0 && (
        <div className="empty-p-state large">
          <div className="empty-visual">
            <Video size={64} className="text-muted opacity-20" />
          </div>
          <h3>No Interviews Found</h3>
          <p>Schedule your first mock interview to begin assessment</p>
        </div>
      )}

      {/* Modern Evaluation Modal */}
      {selectedInterview && (
        <div className="p-modal-overlay">
          <div className="p-modal-window wide animate-scale">
            <div className="p-modal-header">
              <div className="modal-title-box">
                <Award size={20} className="text-primary" />
                <div>
                  <h2>Evaluation: {selectedInterview.student_name}</h2>
                  <p>Session: {selectedInterview.title}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedInterview(null)}>×</button>
            </div>

            <div className="modal-content-grid">
              <div className="modal-left">
                <div className="score-section">
                  <h3>Assessment Scores</h3>
                  {[
                    { key: 'communication_score', label: 'Communication' },
                    { key: 'technical_score', label: 'Technical Proficiency' },
                    { key: 'confidence_score', label: 'Candidate Confidence' },
                    { key: 'problem_solving_score', label: 'Problem Solving' }
                  ].map(score => (
                    <div key={score.key} className="score-input-group">
                      <div className="score-label">
                        <span>{score.label}</span>
                        <span className="score-val">{evaluationForm[score.key]} / 10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" 
                        value={evaluationForm[score.key]}
                        onChange={(e) => setEvaluationForm({...evaluationForm, [score.key]: parseInt(e.target.value)})}
                      />
                    </div>
                  ))}
                </div>

                <div className="overall-summary">
                  <div className="summary-card">
                    <span className="s-label">Consolidated Score</span>
                    <span className="s-value">
                      {Math.round((evaluationForm.communication_score + evaluationForm.technical_score + evaluationForm.confidence_score + evaluationForm.problem_solving_score) / 4)}
                      <span className="s-small">/10</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-right">
                <div className="feedback-section">
                  <h3>Detailed Feedback</h3>
                  <div className="input-row">
                    <div className="p-input-box">
                      <label>Core Strengths</label>
                      <textarea 
                        value={evaluationForm.strengths}
                        onChange={(e) => setEvaluationForm({...evaluationForm, strengths: e.target.value})}
                        placeholder="What did the candidate excel at?"
                      />
                    </div>
                    <div className="p-input-box">
                      <label>Growth Areas</label>
                      <textarea 
                        value={evaluationForm.weaknesses}
                        onChange={(e) => setEvaluationForm({...evaluationForm, weaknesses: e.target.value})}
                        placeholder="Identify specific technical or soft skills gaps..."
                      />
                    </div>
                  </div>
                  <div className="p-input-box">
                    <label>Final Verdict & Recommendations</label>
                    <textarea 
                      value={evaluationForm.final_feedback}
                      onChange={(e) => setEvaluationForm({...evaluationForm, final_feedback: e.target.value})}
                      placeholder="Summary and next steps for the student..."
                      rows={5}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="p-btn-outline" onClick={() => setSelectedInterview(null)}>Save Draft</button>
                  <button className="p-btn-final" onClick={() => handleSubmitEvaluation(selectedInterview.id)}>
                    Submit Final Evaluation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mock-interview-premium {
          padding: 2.5rem;
          background: #f8fafc;
          min-height: 100%;
          animation: fadeIn 0.5s ease-out;
        }

        .p-view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .title-area { display: flex; align-items: center; gap: 1.25rem; }
        .p-icon-box {
          width: 52px; height: 52px;
          background: white; border: 1px solid #e2e8f0;
          border-radius: 14px; display: flex; align-items: center; justify-content: center;
          color: #4f46e5; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .title-area h1 { font-size: 1.75rem; font-weight: 800; margin: 0; color: #0f172a; }
        .title-area p { color: #64748b; margin: 0.25rem 0 0; font-size: 0.875rem; }

        .action-area { display: flex; gap: 1rem; align-items: center; }

        .p-search-wrapper {
          background: white; border: 1px solid #e2e8f0;
          padding: 0 1rem; border-radius: 12px;
          display: flex; align-items: center; gap: 0.75rem; width: 300px;
        }
        .p-search-wrapper input {
          border: none; padding: 0.75rem 0; outline: none; width: 100%; font-size: 0.875rem;
        }

        .p-btn-glow {
          padding: 0.75rem 1.5rem;
          background: #0f172a; color: white; border: none;
          border-radius: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .p-btn-glow:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3); }

        /* --- Interview Grid --- */
        .interview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .i-card {
          background: white; border: 1px solid #e2e8f0;
          border-radius: 20px; padding: 1.75rem;
          transition: all 0.3s;
        }

        .i-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .i-status-tag {
          padding: 0.35rem 0.75rem; border-radius: 8px;
          font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .i-more-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.25rem; }

        .i-title { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 0 0 1.25rem 0; }

        .i-user { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
        .i-avatar {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1.1rem;
        }
        .s-avatar { background: #eff6ff; color: #3b82f6; }
        .i-details { display: flex; flex-direction: column; }
        .i-role { font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
        .i-name { font-size: 0.9375rem; font-weight: 700; color: #1e293b; }

        .i-meta-grid { 
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
          padding: 1rem; background: #f8fafc; border-radius: 12px; margin-bottom: 1.5rem;
        }
        .i-meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; color: #64748b; }

        .i-footer { display: flex; gap: 0.75rem; }
        .i-action-btn {
          flex: 1; padding: 0.75rem; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-size: 0.875rem; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none;
        }
        .i-action-btn.primary { background: #4f46e5; color: white; text-decoration: none; }
        .i-action-btn.secondary { background: #f1f5f9; color: #475569; }
        .i-action-btn.success { background: #dcfce7; color: #15803d; }
        .i-action-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* --- Modal --- */
        .p-modal-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 2rem;
        }
        .p-modal-window.wide { width: 1000px; max-height: 90vh; }
        .p-modal-window { background: white; border-radius: 24px; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25); overflow: hidden; display: flex; flex-direction: column; }
        
        .p-modal-header {
          padding: 1.75rem 2.5rem; background: #f8fafc; 
          border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;
        }
        .modal-title-box { display: flex; gap: 1rem; align-items: center; }
        .modal-title-box h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
        .modal-title-box p { font-size: 0.8125rem; color: #64748b; margin: 0; }
        .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }

        .modal-content-grid { display: grid; grid-template-columns: 350px 1fr; flex: 1; overflow-y: auto; }
        
        .modal-left { padding: 2.5rem; border-right: 1px solid #f1f5f9; background: #fafafa; }
        .score-section h3 { font-size: 1rem; font-weight: 700; margin: 0 0 2rem 0; }
        .score-input-group { margin-bottom: 1.75rem; }
        .score-label { display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 700; color: #475569; margin-bottom: 0.75rem; }
        .score-val { color: #4f46e5; }
        
        .score-input-group input[type=range] {
          width: 100%; height: 6px; background: #e2e8f0; border-radius: 50px; outline: none; appearance: none;
        }
        .score-input-group input[type=range]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; background: #4f46e5; border-radius: 50%; cursor: pointer; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .summary-card {
          margin-top: 2rem; padding: 1.5rem; background: #4f46e5; border-radius: 16px; color: white;
          text-align: center; display: flex; flex-direction: column;
        }
        .s-label { font-size: 0.75rem; font-weight: 600; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
        .s-value { font-size: 2.5rem; font-weight: 800; line-height: 1; }
        .s-small { font-size: 1rem; opacity: 0.6; }

        .modal-right { padding: 2.5rem; display: flex; flex-direction: column; }
        .feedback-section h3 { font-size: 1rem; font-weight: 700; margin: 0 0 2rem 0; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
        .p-input-box { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
        .p-input-box label { font-size: 0.8125rem; font-weight: 700; color: #475569; }
        .p-input-box textarea {
          padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; font-size: 0.875rem; line-height: 1.6; transition: border-color 0.2s;
        }
        .p-input-box textarea:focus { border-color: #4f46e5; }

        .modal-footer { margin-top: auto; display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1rem; }
        .p-btn-outline { padding: 0.875rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; cursor: pointer; color: #64748b; }
        .p-btn-final { padding: 0.875rem 2rem; border-radius: 12px; background: #0f172a; color: white; border: none; font-weight: 700; cursor: pointer; }

        .animate-scale { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MockInterview;
