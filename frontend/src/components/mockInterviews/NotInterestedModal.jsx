import React, { useState } from 'react';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const COMMON_REASONS = [
  'Not available on the scheduled date',
  'Already placed / accepted offer',
  'Personal / family commitment',
  'Needs more preparation time',
  'Not interested in this opportunity'
];

const NotInterestedModal = ({ isOpen, onClose, student, onConfirm, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(student.student_id, reason.trim());
  };

  const handleChipClick = (suggestion) => {
    setReason(suggestion);
  };

  return (
    <div className="mock-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div className="mock-modal-content" style={{ ...styles.modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ ...styles.modalTitle, color: '#b91c1c' }}>
              Mark as Not Interested
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Record candidate response for <strong>{student.student_name}</strong>
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mock-modal-body" style={styles.modalBody}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Reason for not being interested (Optional)
              </label>

              {/* Quick suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {COMMON_REASONS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    style={{
                      background: reason === chip ? '#fee2e2' : '#f1f5f9',
                      color: reason === chip ? '#991b1b' : '#475569',
                      border: reason === chip ? '1px solid #f87171' : '1px solid #e2e8f0',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Type or select a reason above (e.g. Traveling on scheduled date)..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={styles.textarea}
                autoFocus
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
              style={{ background: '#ef4444', color: '#ffffff', padding: '10px 20px', borderRadius: '8px' }}
            >
              {loading ? 'Saving...' : 'Confirm Not Interested'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotInterestedModal;
