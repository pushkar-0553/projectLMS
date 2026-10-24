import React, { useMemo, useState } from 'react';
import { Phone, MessageSquare, Edit3, CheckCircle, Share2, Copy, Check, Clock, Unlock } from 'lucide-react';
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

const FeedbackStudentCard = ({
  student,
  feedbackCampaign,
  onGiveFeedback,
  onViewFeedback,
  onAllowEdit
}) => {
  const [copied, setCopied] = useState(false);
  const isCompleted = student.feedback_status === 'COMPLETED' || student.share_status === 'SUBMITTED';
  const isEditRequested = student.share_status === 'EDIT_REQUESTED';
  const isEditAllowed = student.share_status === 'EDIT_ALLOWED';

  // Unique public feedback link for this student
  const shareUrl = useMemo(() => {
    return student.share_token ? feedbackAPI.getPublicShareUrl(student.share_token) : '';
  }, [student.share_token]);

  // WhatsApp share link with unique personalized URL
  const shareWaLink = useMemo(() => {
    if (!student.student_mobile) return '#';
    const phone = normalizePhone(student.student_mobile);
    if (!phone) return '#';

    const message = `Hello ${student.student_name},\n\nPlease submit your feedback for "${feedbackCampaign?.title || 'Course Feedback'}":\n${shareUrl}\n\nThank you!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [student, feedbackCampaign, shareUrl]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      alert(`Link: ${shareUrl}`);
    }
  };

  return (
    <div className="fb-card" style={styles.mobileStudentCard}>
      {/* Top Header: Name and Status */}
      <div style={styles.mobileCardHeader}>
        <div>
          <div style={styles.mobileStudentName}>
            {student.student_name}
          </div>
          <div style={styles.mobileStudentSub}>
            <span style={styles.batchPill}>
              📁 {student.batch_name || 'Unassigned'}
            </span>
            {isEditRequested && (
              <span style={{
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={11} /> Edit Requested
              </span>
            )}
            {isEditAllowed && (
              <span style={{
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Unlock size={11} /> Re-edit Allowed
              </span>
            )}
          </div>
        </div>

        <span
          style={{
            ...styles.badge,
            ...(isCompleted ? styles.completedBadge : { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' })
          }}
        >
          {isCompleted ? '✓ Completed' : 'Pending'}
        </span>
      </div>

      {/* Contact info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12.5px', color: '#64748b' }}>
        {student.student_mobile && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            📱 {student.student_mobile}
          </span>
        )}
        {student.student_email && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ✉️ {student.student_email}
          </span>
        )}
      </div>

      {/* Edit Request Action Strip if student requested permission */}
      {isEditRequested && onAllowEdit && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
            Student requested re-edit permission
          </span>
          <button
            type="button"
            onClick={() => onAllowEdit(student.student_id)}
            style={{
              padding: '4px 10px',
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Grant Edit Access
          </button>
        </div>
      )}

      {/* Communication & Unique Share Actions */}
      <div className="fb-mobile-actions-row">
        {/* Contact buttons row */}
        <div className="fb-mobile-contact-btns">
          {student.student_mobile ? (
            <a href={`tel:${student.student_mobile}`} className="fb-call-btn" title="Call student">
              <Phone size={13} /> Call
            </a>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No Mobile
            </span>
          )}

          {student.student_mobile ? (
            <a
              href={shareWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="fb-wa-btn"
              title="Share unique feedback link on WhatsApp"
            >
              <Share2 size={13} /> Share Link
            </a>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No WhatsApp
            </span>
          )}
        </div>

        {/* Copy Link & Feedback Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: copied ? '#059669' : '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box'
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {isCompleted ? (
            <button
              type="button"
              className="fb-action-btn-view"
              onClick={() => onViewFeedback(student)}
              style={{ justifyContent: 'center', boxSizing: 'border-box' }}
            >
              <CheckCircle size={13} color="#10b981" /> View
            </button>
          ) : (
            <button
              type="button"
              className="fb-action-btn-give"
              onClick={() => onGiveFeedback(student)}
              style={{ justifyContent: 'center', boxSizing: 'border-box' }}
            >
              <Edit3 size={13} /> Form
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackStudentCard;
