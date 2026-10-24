import React, { useState, useEffect } from 'react';
import { X, Star, Calendar, User, CheckCircle, Edit3, Phone } from 'lucide-react';
import { feedbackAPI } from '../../services/api';

const ViewFeedbackModal = ({
  isOpen,
  onClose,
  feedbackCampaign,
  student,
  onEdit
}) => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !feedbackCampaign || !student) return;

    setLoading(true);
    setError('');
    feedbackAPI.getStudentResponse(feedbackCampaign.id, student.student_id)
      .then(res => {
        setResponse(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch student feedback response:', err);
        setError('Failed to load feedback response.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, feedbackCampaign, student]);

  if (!isOpen || !student) return null;

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal-content" style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="fb-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} color="#10b981" />
              <h3 className="fb-modal-title">Submitted Feedback</h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {feedbackCampaign?.title}
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

        {/* Student summary banner */}
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
            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <span className="fb-batch-chip" style={{ padding: '2px 8px', fontSize: '11px' }}>
                📁 {student.batch_name || 'Unassigned'}
              </span>
              {student.student_mobile && <span>📱 {student.student_mobile}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {student.student_mobile && (
              <a href={`tel:${student.student_mobile}`} className="fb-call-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <Phone size={13} /> Call
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#e0e7ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={13} /> Edit Response
            </button>
          </div>
        </div>

        {/* Response Content */}
        <div className="fb-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '30px', fontSize: '13.5px' }}>
              Loading response details...
            </div>
          ) : error ? (
            <div style={{ color: '#dc2626', padding: '16px', textAlign: 'center' }}>{error}</div>
          ) : !response ? (
            <div style={{ color: '#64748b', padding: '16px', textAlign: 'center' }}>No response data found.</div>
          ) : (
            <>
              {/* Submission metadata */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: '#f1f5f9',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#475569'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} />
                  Submitted: {response.submitted_at ? new Date(response.submitted_at).toLocaleString() : 'N/A'}
                </span>
                {response.submitted_by_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} />
                    Recorded by: <strong>{response.submitted_by_name}</strong>
                  </span>
                )}
              </div>

              {/* Answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                {(response.answers || []).map((a, idx) => (
                  <div key={a.answer_id || idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Question {a.question_order || idx + 1}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      {a.question_text}
                    </div>

                    {/* Answer rendering */}
                    {a.rating_value !== null && a.rating_value !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          color: '#b45309',
                          fontWeight: '800',
                          fontSize: '13px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {a.rating_value} / 5
                          <Star size={13} fill="#b45309" color="#b45309" />
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13.5px',
                        color: '#1e293b',
                        lineHeight: '1.5'
                      }}>
                        {a.answer_text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No answer provided</span>}
                      </div>
                    )}
                  </div>
                ))}

                {/* Overall Feedback */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Overall Feedback
                  </div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '13.5px',
                    color: '#166534',
                    lineHeight: '1.5'
                  }}>
                    {response.overall_feedback || <span style={{ color: '#86efac', fontStyle: 'italic' }}>No overall feedback notes added.</span>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="fb-modal-footer">
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewFeedbackModal;
