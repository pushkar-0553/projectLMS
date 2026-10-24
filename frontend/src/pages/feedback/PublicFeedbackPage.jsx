import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Clock, AlertCircle, Send, Lock, RotateCcw, BookOpen, Calendar, HelpCircle } from 'lucide-react';
import { feedbackAPI } from '../../services/api';

const PublicFeedbackPage = () => {
  const { token } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [answers, setAnswers] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Edit request states
  const [showRequestEditForm, setShowRequestEditForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    loadPublicForm();
  }, [token]);

  const loadPublicForm = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await feedbackAPI.getPublicFeedback(token);
      const formPayload = res.data?.data || res.data;
      setData(formPayload);

      // Pre-fill previous answers if they exist (e.g. when re-editing or viewing)
      if (formPayload.answers && formPayload.answers.length > 0) {
        const initialAns = {};
        formPayload.answers.forEach(a => {
          initialAns[a.question_id] = {
            answerText: a.answer_text || '',
            ratingValue: a.rating_value || null
          };
        });
        setAnswers(initialAns);
      }

      if (formPayload.response?.overall_feedback) {
        setOverallFeedback(formPayload.response.overall_feedback);
      }
    } catch (err) {
      console.error('Failed to load public feedback form:', err);
      setError(err.response?.data?.message || 'Unable to open feedback form. Please verify your link.');
    } finally {
      setLoading(false);
    }
  };

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
    if (!data) return;

    // Validate required questions
    for (const q of (data.questions || [])) {
      if (q.is_required) {
        const ans = answers[q.id];
        if (q.question_type === 'RATING') {
          if (!ans || ans.ratingValue === null || ans.ratingValue === undefined) {
            alert(`Please provide a rating for: "${q.question_text}"`);
            return;
          }
        } else {
          if (!ans || !ans.answerText || !ans.answerText.trim()) {
            alert(`Please answer the required question: "${q.question_text}"`);
            return;
          }
        }
      }
    }

    try {
      setSubmitting(true);
      const formattedAnswers = (data.questions || []).map(q => {
        const cur = answers[q.id] || {};
        return {
          questionId: q.id,
          answerText: cur.answerText !== undefined ? String(cur.answerText).trim() : null,
          ratingValue: cur.ratingValue !== undefined ? cur.ratingValue : null
        };
      });

      const payload = {
        answers: formattedAnswers,
        overall_feedback: overallFeedback.trim() || null
      };

      const res = await feedbackAPI.submitPublicFeedback(token, payload);
      setSubmitSuccess(true);
      setData(prev => ({
        ...prev,
        link_status: 'SUBMITTED'
      }));
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEdit = async (e) => {
    e.preventDefault();
    try {
      setRequesting(true);
      const res = await feedbackAPI.requestPublicEditAccess(token, { reason: requestReason });
      setRequestMessage(res.data?.message || 'Edit request sent successfully.');
      setData(prev => ({
        ...prev,
        link_status: 'EDIT_REQUESTED'
      }));
      setShowRequestEditForm(false);
    } catch (err) {
      console.error('Failed to request edit access:', err);
      alert(err.response?.data?.message || 'Failed to send edit request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>Loading your feedback form...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #fee2e2',
          borderRadius: '16px',
          padding: '32px 24px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <AlertCircle size={44} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            Link Unavailable
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            {error || 'This feedback link is invalid or no longer active. Please contact your coordinator.'}
          </p>
        </div>
      </div>
    );
  }

  const isLockedSubmitted = data.link_status === 'SUBMITTED' || submitSuccess;
  const isEditRequested = data.link_status === 'EDIT_REQUESTED';
  const canEdit = data.link_status === 'PENDING' || data.link_status === 'EDIT_ALLOWED';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '24px 16px 60px'
    }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Top Header Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            <BookOpen size={16} /> {data.course_name}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            {data.campaign_title}
          </h1>
          {data.campaign_description && (
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 14px', lineHeight: '1.5' }}>
              {data.campaign_description}
            </p>
          )}

          {/* Student Info Pill Strip */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '13px'
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Student: </span>
              <strong style={{ color: '#0f172a' }}>{data.student_name}</strong>
            </div>
            {data.batch_name && (
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '12px'
              }}>
                📁 {data.batch_name}
              </span>
            )}
          </div>
        </div>

        {/* State 1: Submitted View (Confirmation + Request Edit Option) */}
        {isLockedSubmitted && !canEdit && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #bbf7d0',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle size={36} color="#10b981" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#065f46', margin: '0 0 8px' }}>
              Your form has been submitted successfully.
            </h2>
            <p style={{ fontSize: '14.5px', color: '#475569', margin: '0 auto 24px', maxWidth: '440px', lineHeight: '1.5' }}>
              Thank you for sharing your feedback. Your responses have been safely recorded by your coordinator.
            </p>

            {/* Request Edit Button */}
            {!showRequestEditForm ? (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Need to update or correct your submitted feedback?
                </p>
                <button
                  type="button"
                  onClick={() => setShowRequestEditForm(true)}
                  style={{
                    padding: '10px 18px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <RotateCcw size={15} /> Request Edit Permission
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestEdit} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Reason for requesting edit (Optional):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. I made a typo in my rating or would like to add more details..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '12px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestEditForm(false)}
                    style={{
                      padding: '8px 14px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requesting}
                    style={{
                      padding: '8px 18px',
                      background: '#4f46e5',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: requesting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {requesting ? 'Sending...' : 'Send Edit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* State 2: Edit Requested View */}
        {isEditRequested && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #fde68a',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <Clock size={32} color="#b45309" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#92400e', margin: '0 0 8px' }}>
              Edit Request Pending Approval
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', margin: '0 auto 16px', maxWidth: '440px', lineHeight: '1.5' }}>
              Your coordinator has received your request to re-edit this feedback. Once approved, you can open this exact link again to modify and resubmit your answers.
            </p>

            <button
              type="button"
              onClick={loadPublicForm}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCcw size={14} /> Check Status Again
            </button>
          </div>
        )}

        {/* State 3: Active Feedback Form (Pending or Edit Allowed) */}
        {canEdit && !isLockedSubmitted && (
          <form onSubmit={handleSubmit}>
            {data.link_status === 'EDIT_ALLOWED' && (
              <div style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#3730a3',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={16} />
                Edit permission has been granted by your coordinator. You may update your answers below and resubmit.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(data.questions || []).map((q, idx) => {
                const cur = answers[q.id] || {};

                return (
                  <div
                    key={q.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '20px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', lineHeight: '1.4' }}>
                      <span style={{ color: '#4f46e5', marginRight: '6px' }}>Q{idx + 1}.</span>
                      {q.question_text}
                      {q.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                    </label>

                    {/* Short Text */}
                    {q.question_type === 'TEXT' && (
                      <input
                        type="text"
                        placeholder="Type your answer here..."
                        value={cur.answerText || ''}
                        onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    )}

                    {/* Long Text */}
                    {q.question_type === 'LONG_TEXT' && (
                      <textarea
                        rows={3}
                        placeholder="Type your detailed response here..."
                        value={cur.answerText || ''}
                        onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    )}

                    {/* Rating (1 to 5) */}
                    {q.question_type === 'RATING' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isSelected = cur.ratingValue === num;
                          return (
                            <button
                              type="button"
                              key={num}
                              onClick={() => handleRatingChange(q.id, num)}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                border: isSelected ? '2px solid #d97706' : '1px solid #cbd5e1',
                                background: isSelected ? '#f59e0b' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#1e293b',
                                fontSize: '16px',
                                fontWeight: '800',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                gap: '2px'
                              }}
                            >
                              <span>{num}</span>
                              <Star size={14} fill={isSelected ? '#ffffff' : 'none'} color={isSelected ? '#ffffff' : '#f59e0b'} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Single Choice Options */}
                    {q.question_type === 'SINGLE_CHOICE' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(q.options || []).map((opt, optIdx) => {
                          const isSelected = cur.answerText === opt;
                          return (
                            <div
                              key={optIdx}
                              onClick={() => handleChoiceChange(q.id, opt)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: isSelected ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                                background: isSelected ? '#eef2ff' : '#ffffff',
                                color: isSelected ? '#3730a3' : '#1e293b',
                                fontWeight: isSelected ? '700' : '500',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.15s'
                              }}
                            >
                              <input
                                type="radio"
                                name={`pub_q_${q.id}`}
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
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <label style={{ display: 'block', fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                  Overall Feedback / Additional Comments
                </label>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 10px' }}>
                  Is there anything else you would like your coordinator to know? (Optional)
                </p>
                <textarea
                  rows={3}
                  placeholder="Share any additional thoughts, difficulties, or suggestions..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit Action Bar */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicFeedbackPage;
