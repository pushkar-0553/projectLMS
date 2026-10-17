import React, { useState, useEffect } from 'react';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const DROP_OFF_REASONS = [
  'Did not attend / No show',
  'Candidate unavailable for interview',
  'Requested drop-off / cancellation',
  'Already placed / Accepted job offer',
  'Technical or connectivity issues',
  'Needs more preparation time'
];

const ELIGIBLE_REASONS = [
  'Not available on the scheduled date',
  'Already placed / accepted offer',
  'Personal / family commitment',
  'Needs more preparation time',
  'Not interested in this opportunity'
];

const NotInterestedModal = ({ isOpen, onClose, student, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  const isDropOff = Boolean(
    student && ['INTERESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(student.status)
  );

  useEffect(() => {
    if (isOpen) {
      setReason(student?.not_interested_reason || '');
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(student.student_id, reason.trim());
  };

  const handleChipClick = (suggestion) => {
    setReason(suggestion);
  };

  const reasonsList = isDropOff ? DROP_OFF_REASONS : ELIGIBLE_REASONS;

  return (
    <div className="mock-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div className="mock-modal-content" style={{ ...styles.modalContent, maxWidth: '490px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ ...styles.modalTitle, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{isDropOff ? '🚫' : '❌'}</span>
              <span>{isDropOff ? 'Candidate Drop-Off' : 'Mark as Not Interested'}</span>
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              {isDropOff
                ? `Record drop-off reason for ${student.student_name}. The candidate will be removed from slots and moved to the Declined tab.`
                : `Record candidate response for ${student.student_name}.`}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mock-modal-body" style={styles.modalBody}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                {isDropOff
                  ? 'Reason for dropping off / not attending (Optional):'
                  : 'Reason for not being interested (Optional):'}
              </label>

              {/* Quick suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {reasonsList.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    style={{
                      background: reason === chip ? '#fee2e2' : '#f1f5f9',
                      color: reason === chip ? '#991b1b' : '#475569',
                      border: reason === chip ? '1px solid #f87171' : '1px solid #cbd5e1',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                placeholder={isDropOff ? "Enter drop-off reason (e.g. No show for scheduled slot)..." : "Type or select a reason above..."}
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={styles.textarea}
                autoFocus
                rows={3}
              />
            </div>
          </div>

          <div className="mock-modal-footer" style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mock-btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="mock-status-btn"
              style={{ background: '#ef4444', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontWeight: '700' }}
            >
              {loading ? 'Saving...' : (isDropOff ? 'Confirm Drop-Off' : 'Confirm Not Interested')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotInterestedModal;
