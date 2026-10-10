import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  CheckSquare, Award, Clock, AlertTriangle, ChevronRight, 
  ChevronLeft, Save, CheckCircle, FileText, Send, User, Copy
} from 'lucide-react';

export default function EvaluationView({ courseId, courseSlug }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active candidate evaluation state
  const [evaluatingCandidateId, setEvaluatingCandidateId] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  // Evaluator input form: { [questionId]: { marks, feedback } }
  const [evalInputs, setEvalInputs] = useState({});
  const [savingQuestionId, setSavingQuestionId] = useState(null);

  useEffect(() => {
    loadAssignments();
  }, [courseId, courseSlug]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const list = await api.assignments.list({ courseId, courseSlug });
      setAssignments(list);
      if (list.length > 0) {
        setSelectedAssignmentId(list[0].id);
        loadAssignmentDetails(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentDetails = async (id) => {
    try {
      const details = await api.assignments.getById(id);
      setAssignmentDetails(details);
      setEvaluatingCandidateId(null);
      setSubmissionData(null);
    } catch (err) {
      console.error('Failed to load assignment details:', err);
    }
  };

  const handleSelectCandidate = async (candidateId) => {
    setLoadingSubmission(true);
    setEvaluatingCandidateId(candidateId);
    try {
      const data = await api.evaluation.getCandidateSubmission(candidateId);
      setSubmissionData(data);

      // Pre-fill existing evaluations
      const inputs = {};
      (data.sections || []).forEach(sec => {
        (sec.questions || []).forEach(q => {
          inputs[q.id] = {
            marks: q.evaluation?.marksAwarded ?? '',
            feedback: q.evaluation?.feedback || ''
          };
        });
      });
      setEvalInputs(inputs);
    } catch (err) {
      alert(`Error loading candidate submission: ${err.message}`);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleSaveQuestionEval = async (questionId, maxMarks) => {
    const input = evalInputs[questionId] || {};
    const marks = parseFloat(input.marks);

    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      alert(`Please enter a valid mark between 0 and ${maxMarks}`);
      return;
    }

    setSavingQuestionId(questionId);
    try {
      await api.evaluation.saveQuestionEvaluation(
        evaluatingCandidateId,
        questionId,
        marks,
        input.feedback || ''
      );
      // Reload submission to refresh summary tallies
      const refreshed = await api.evaluation.getCandidateSubmission(evaluatingCandidateId);
      setSubmissionData(refreshed);
    } catch (err) {
      alert(`Error saving mark: ${err.message}`);
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleFinalizeCandidate = async () => {
    if (!confirm('Finalize evaluation for this student and compute final result?')) return;
    try {
      const res = await api.evaluation.finalizeCandidateResult(evaluatingCandidateId);
      alert(`Candidate result finalized! Score: ${res.totalAwarded} / ${res.totalPossible} (${res.percentage}%) - ${res.isPassed ? 'PASSED' : 'FAILED'}`);
      loadAssignmentDetails(selectedAssignmentId);
    } catch (err) {
      alert(`Finalize error: ${err.message}`);
    }
  };

  const handlePublishAllResults = async () => {
    if (!confirm('Publish results for this entire assignment? Students will be able to see their scores.')) return;
    try {
      await api.evaluation.publishAssignmentResults(selectedAssignmentId);
      alert('All evaluated results for this assignment published!');
      loadAssignmentDetails(selectedAssignmentId);
    } catch (err) {
      alert(`Publish error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <label className="label" style={{ margin: 0 }}>Select Exam Assignment:</label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => {
              setSelectedAssignmentId(e.target.value);
              loadAssignmentDetails(e.target.value);
            }}
            className="select"
            style={{ width: '320px' }}
          >
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.batch_name})
              </option>
            ))}
          </select>
        </div>

        {assignmentDetails && (
          <button onClick={handlePublishAllResults} className="btn btn-primary" style={{ gap: '8px' }}>
            <Award size={16} />
            Publish Assignment Results
          </button>
        )}
      </div>

      {/* Main evaluation layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Candidates List */}
        <div className="card" style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '14px', color: 'var(--text-secondary)' }}>
            Candidates ({assignmentDetails?.candidates?.length || 0})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(assignmentDetails?.candidates || []).map(c => {
              const isSelected = evaluatingCandidateId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCandidate(c.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--primary-glow)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {c.snapshot_student_name}
                    </strong>
                    <span className={`badge ${
                      c.candidate_status === 'EVALUATED' ? 'badge-success' :
                      c.candidate_status === 'SUBMITTED' ? 'badge-primary' :
                      c.candidate_status === 'AUTO_SUBMITTED' ? 'badge-danger' : 'badge-muted'
                    }`} style={{ fontSize: '10px' }}>
                      {c.candidate_status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Violations: {c.violation_count || 0}</span>
                    <span>{c.total_marks_awarded !== null ? `${c.total_marks_awarded} pts` : 'Pending'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Submission Work Area */}
        <div className="card">
          {!evaluatingCandidateId ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <CheckSquare size={48} color="var(--border-default)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Select a Candidate to Begin Evaluation</h3>
              <p style={{ fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
                Review written answers, compare against answer keys, assign scores, and provide constructive feedback.
              </p>
            </div>
          ) : loadingSubmission ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading candidate submission...
            </div>
          ) : submissionData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Submission Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', margin: 0 }}>
                    {submissionData.candidate.snapshot_student_name}
                  </h3>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Submission: {submissionData.candidate.submission_type || 'MANUAL'} | Violations: {submissionData.candidate.violation_count || 0}/3
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Awarded</div>
                    <strong style={{ fontSize: '20px', color: 'var(--primary)' }}>
                      {submissionData.summary.totalMarksAwarded} / {submissionData.summary.totalPossibleMarks}
                    </strong>
                  </div>

                  <button onClick={handleFinalizeCandidate} className="btn btn-success" style={{ gap: '6px' }}>
                    <CheckCircle size={16} />
                    Finalize Result
                  </button>
                </div>
              </div>

              {/* Sections & Questions Evaluation */}
              {(submissionData.sections || []).map((sec, sIdx) => (
                <div key={sec.id || sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    {sec.title}
                  </h4>

                  {(sec.questions || []).map((q, qIdx) => {
                    const input = evalInputs[q.id] || { marks: '', feedback: '' };
                    return (
                      <div key={q.id} style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                        {/* Question Title & Marks */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold' }}>Q{q.questionOrder}.</span>
                            <span className="badge badge-primary">{q.questionType}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Max: {q.marks} Marks</span>
                          </div>

                          {q.evaluation && (
                            <span className="badge badge-success">
                              Graded: {q.evaluation.marksAwarded} Marks
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '14px', color: 'var(--text-primary)' }}>
                          {q.questionText}
                        </div>

                        {/* Answer Key / Solution Guide */}
                        {q.answerKey && (
                          <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderLeft: '3px solid var(--primary)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', marginBottom: '16px' }}>
                            <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>Answer Key:</strong>
                            <div style={{ color: 'var(--text-secondary)' }}>{q.answerKey}</div>
                          </div>
                        )}

                        {/* Student's Written Answer & Code */}
                        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                              Candidate Submitted Answer:
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {q.codeLanguage && (
                                <span className="badge badge-primary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                                  {q.codeLanguage}
                                </span>
                              )}
                              {q.codeContent && (
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard?.writeText(q.codeContent)}
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '2px 8px', fontSize: '11px', gap: '4px' }}
                                  title="Copy candidate code"
                                >
                                  <Copy size={12} /> Copy
                                </button>
                              )}
                            </div>
                          </div>

                          {q.codeContent ? (
                            <div style={{
                              background: '#0f172a',
                              color: '#38bdf8',
                              border: '1px solid #1e293b',
                              borderRadius: '6px',
                              padding: '12px',
                              fontFamily: 'monospace',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              overflowX: 'auto',
                              whiteSpace: 'pre',
                              marginBottom: (q.studentAnswer && q.studentAnswer !== q.codeContent) ? '10px' : 0
                            }}>
                              {q.codeContent}
                            </div>
                          ) : null}

                          {(!q.codeContent || (q.studentAnswer && q.studentAnswer !== q.codeContent)) && (
                            <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', color: q.studentAnswer ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {q.studentAnswer || '(No answer provided by candidate)'}
                            </div>
                          )}
                        </div>

                        {/* Evaluator Controls */}
                        <div className="grid grid-cols-3 gap-4" style={{ alignItems: 'flex-end' }}>
                          <div>
                            <label className="label">Award Marks (Max {q.marks})</label>
                            <input
                              type="number"
                              min="0"
                              max={q.marks}
                              step="0.5"
                              value={input.marks}
                              onChange={(e) => setEvalInputs(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], marks: e.target.value }
                              }))}
                              placeholder="0.0"
                              className="input"
                            />
                          </div>

                          <div>
                            <label className="label">Feedback (Optional)</label>
                            <input
                              type="text"
                              value={input.feedback}
                              onChange={(e) => setEvalInputs(prev => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], feedback: e.target.value }
                              }))}
                              placeholder="e.g. Good explanation of memory references"
                              className="input"
                            />
                          </div>

                          <div>
                            <button
                              onClick={() => handleSaveQuestionEval(q.id, q.marks)}
                              disabled={savingQuestionId === q.id}
                              className="btn btn-primary"
                              style={{ width: '100%', gap: '6px' }}
                            >
                              <Save size={15} />
                              {savingQuestionId === q.id ? 'Saving...' : 'Save Mark'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
