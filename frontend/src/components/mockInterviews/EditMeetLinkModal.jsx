import React, { useState, useEffect } from 'react';
import { mockInterviewAPI } from '../../services/api';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const EditMeetLinkModal = ({ isOpen, onClose, mockId, currentMeetLink, onSuccess }) => {
  const [meetLink, setMeetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMeetLink(currentMeetLink || '');
    setError('');
  }, [currentMeetLink, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await mockInterviewAPI.updateMeetLink(mockId, meetLink.trim());
      onSuccess(meetLink.trim());
      onClose();
    } catch (err) {
      console.error('Failed to update Google Meet link:', err);
      setError(err.response?.data?.message || 'Failed to update Google Meet link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mock-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div className="mock-modal-content" style={{ ...styles.modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>📹 Update Google Meet Link</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Updates the live room URL for all participating students in this mock interview.
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mock-modal-body" style={styles.modalBody}>
            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
                {error}
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Google Meet URL</label>
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                style={styles.input}
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
              className="mock-btn-primary"
              style={{ padding: '8px 18px' }}
            >
              {loading ? 'Saving...' : 'Update Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMeetLinkModal;
