import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import { feedbackAPI } from '../../services/api';

const StudentFeedbackModal = ({
  isOpen,
  onClose,
  feedbackCampaign,
  student,
  onSuccess
}) => {
  const [answers, setAnswers] = useState({}); // { [questionId]: { answerText, ratingValue } }
  const [overallFeedback, setOverallFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingExisting, setFetchingExisting] = useState(false);

  useEffect(() => {
    if (!isOpen || !feedbackCampaign || !student) return;

    setError('');
    // Check if student already has a submitted response to pre-fill (for viewing/editing)
    if (student.feedback_status === 'COMPLETED' || student.response_id) {
      setFetchingExisting(true);
      feedbackAPI.getStudentResponse(feedbackCampaign.id, student.student_id)
        .then(res => {
          const resp = res.data;
          if (resp) {
            setOverallFeedback(resp.overall_feedback || '');
            const ansMap = {};
            (resp.answers || []).forEach(a => {
              ansMap[a.question_id] = {
                answerText: a.answer_text || '',
                ratingValue: a.rating_value || null
              };
            });
            setAnswers(ansMap);
          }
        })
        .catch(err => {
          console.warn('Could not fetch existing response:', err);
        })
        .finally(() => {
          setFetchingExisting(false);
        });
    } else {
      setAnswers({});
      setOverallFeedback('');
    }
  }, [isOpen, feedbackCampaign, student]);

  if (!isOpen || !student || !feedbackCampaign) return null;

  const questions = feedbackCampaign.questions || [];

  const handleTextAnswerChange = (qId, val) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        answerText: val
      }
    }));
  };

  const handleRatingChange = (qId, rating) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        ratingValue: rating
      }
    }));
  };

  const handleChoiceChange = (qId, choice) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        answerText: choice
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required questions
    for (const q of questions) {
      if (q.is_required) {
        const ans = answers[q.id];
        if (q.question_type === 'RATING') {
          if (!ans || ans.ratingValue === null || ans.ratingValue === undefined) {
            setError(`Please provide a rating for: "${q.question_text}"`);
            return;
          }
        } else {
          if (!ans || !ans.answerText || !ans.answerText.trim()) {
            setError(`Please answer the required question: "${q.question_text}"`);
            return;
          }
        }
      }
    }

    try {
      setLoading(true);
      setError('');

      const answersPayload = questions.map(q => {
        const cur = answers[q.id] || {};
        return {
          questionId: q.id,
          answerText: cur.answerText !== undefined ? cur.answerText.trim() : null,
          ratingValue: cur.ratingValue !== undefined ? cur.ratingValue : null
        };
      });

      const payload = {
        student_id: student.student_id,
        batch_id: student.batch_id,
        overall_feedback: overallFeedback.trim() || null,
        answers: answersPayload
      };

      const res = await feedbackAPI.submitResponse(feedbackCampaign.id, payload);
      onSuccess(res.data?.data || res.data);
      onClose();
    } catch (err) {
      console.error('Failed to submit student feedback:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal-content" style={{ maxWidth: '640px' }}>
        {/* Modal Header */}
        <div className="fb-modal-header">
          <div>
            <h3 className="fb-modal-title">Student Feedback Form</h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {feedbackCampaign.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Student Header Bar */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {student.student_name}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="fb-batch-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
                📁 {student.batch_name || 'Unassigned'}
              </span>
              {student.student_mobile && <span>📱 {student.student_mobile}</span>}
            </div>
          </div>

          {student.student_mobile && (
            <a href={`tel:${student.student_mobile}`} className="fb-call-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <Phone size={13} /> Call
            </a>
          )}
        </div>

        {/* Questionnaire Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="fb-modal-body">
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {fetchingExisting && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '12px', fontSize: '13px' }}>
                Loading existing responses...
              </div>
            )}

            {/* Questions List */}
            {questions.map((q, idx) => {
              const curAnswer = answers[q.id] || {};

              return (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>
                    Q{idx + 1}. {q.question_text}
                    {q.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                  </label>

                  {/* Render based on question_type */}
                  {q.question_type === 'TEXT' && (
                    <input
                      type="text"
                      placeholder="Enter student answer..."
                      value={curAnswer.answerText || ''}
                      onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}

                  {q.question_type === 'LONG_TEXT' && (
                    <textarea
                      rows={3}
                      placeholder="Enter detailed feedback / answers..."
                      value={curAnswer.answerText || ''}
                      onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}

                  {q.question_type === 'RATING' && (
                    <div className="fb-rating-group">
                      {[1, 2, 3, 4, 5].map(ratingNum => {
                        const isSelected = curAnswer.ratingValue === ratingNum;
                        return (
                          <button
                            type="button"
                            key={ratingNum}
                            className={`fb-rating-pill ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleRatingChange(q.id, ratingNum)}
                          >
                            <span style={{ marginRight: '2px' }}>{ratingNum}</span>
                            <Star size={14} fill={isSelected ? '#ffffff' : 'none'} color={isSelected ? '#ffffff' : '#f59e0b'} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === 'SINGLE_CHOICE' && (
                    <div className="fb-choice-group">
                      {(q.options || []).map((opt, optIdx) => {
                        const isSelected = curAnswer.answerText === opt;
                        return (
                          <div
                            key={optIdx}
                            className={`fb-choice-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleChoiceChange(q.id, opt)}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              checked={isSelected}
                              onChange={() => handleChoiceChange(q.id, opt)}
                            />
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Feedback */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                Overall Feedback / Coordinator Notes
                <span style={{ fontSize: '12px', fontWeight: '400', color: '#64748b', marginLeft: '6px' }}>
                  (Optional - any additional comments or observations)
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Student requested more practical problem-solving sessions and doubts clearing support..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="fb-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                background: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '700',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFeedbackModal;
