import React, { useState } from 'react';
import { Phone, Share2, Edit3, CheckCircle, Copy, Check, Clock, Unlock } from 'lucide-react';
import styles from '../../pages/feedback/Feedback.styles';
import { feedbackAPI } from '../../services/api';

const normalizePhone = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

const FeedbackStudentTable = ({
  students = [],
  feedbackCampaign,
  onGiveFeedback,
  onViewFeedback,
  onAllowEdit
}) => {
  const [copiedId, setCopiedId] = useState(null);

  if (students.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '14px' }}>
        No students found matching the selected filter.
      </div>
    );
  }

  const handleCopy = async (studentId, shareUrl) => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(studentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert(`Link: ${shareUrl}`);
    }
  };

  return (
    <div className="fb-table-container">
      <table className="fb-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Batch</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Unique Share Link</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const isCompleted = student.feedback_status === 'COMPLETED' || student.share_status === 'SUBMITTED';
            const isEditRequested = student.share_status === 'EDIT_REQUESTED';
            const isEditAllowed = student.share_status === 'EDIT_ALLOWED';
            const phone = normalizePhone(student.student_mobile);
            const shareUrl = student.share_token ? feedbackAPI.getPublicShareUrl(student.share_token) : '';

            const shareMessage = `Hello ${student.student_name},\n\nPlease submit your feedback for "${feedbackCampaign?.title || 'Course Feedback'}":\n${shareUrl}\n\nThank you!`;
            const waShareLink = phone && shareUrl ? `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}` : '#';

            return (
              <tr key={student.student_id}>
                {/* Student Name */}
                <td>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>
                    {student.student_name}
                  </div>
                  {student.college && (
                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      {student.college}
                    </div>
                  )}
                </td>

                {/* Batch */}
                <td>
                  <span style={styles.batchPill}>
                    {student.batch_name || 'Unassigned'}
                  </span>
                </td>

                {/* Mobile & Email */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {student.student_mobile ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: '600' }}>
                        {student.student_mobile}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>No mobile</span>
                    )}
                    {student.student_email && (
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {student.student_email}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(isCompleted ? styles.completedBadge : { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' })
                      }}
                    >
                      {isCompleted ? '✓ Completed' : 'Pending'}
                    </span>

                    {isEditRequested && (
                      <span style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Clock size={11} /> Edit Requested
                      </span>
                    )}

                    {isEditAllowed && (
                      <span style={{
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Unlock size={11} /> Re-edit Allowed
                      </span>
                    )}
                  </div>
                </td>

                {/* Share Link Column */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {student.student_mobile && shareUrl && (
                      <a
                        href={waShareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fb-wa-btn"
                        title="Send personalized feedback link on WhatsApp"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                      >
                        <Share2 size={12} /> WhatsApp
                      </a>
                    )}

                    {shareUrl && (
                      <button
                        type="button"
                        onClick={() => handleCopy(student.student_id, shareUrl)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px 9px',
                          fontSize: '11.5px',
                          color: copiedId === student.student_id ? '#059669' : '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Copy student unique feedback link"
                      >
                        {copiedId === student.student_id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === student.student_id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                    {student.student_mobile && (
                      <a href={`tel:${student.student_mobile}`} className="fb-call-btn" title="Call student" style={{ padding: '6px 10px', fontSize: '12px' }}>
                        <Phone size={12} /> Call
                      </a>
                    )}

                    {isEditRequested && onAllowEdit && (
                      <button
                        type="button"
                        onClick={() => onAllowEdit(student.student_id)}
                        style={{
                          padding: '6px 10px',
                          background: '#b45309',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        title="Allow student to re-edit feedback"
                      >
                        Grant Edit
                      </button>
                    )}

                    {isCompleted ? (
                      <button
                        type="button"
                        className="fb-action-btn-view"
                        onClick={() => onViewFeedback(student)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <CheckCircle size={12} color="#10b981" /> View
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="fb-action-btn-give"
                        onClick={() => onGiveFeedback(student)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <Edit3 size={12} /> Record
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FeedbackStudentTable;
