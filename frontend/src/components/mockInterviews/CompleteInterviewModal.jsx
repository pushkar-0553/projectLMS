import React, { useState, useEffect } from 'react';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const CompleteInterviewModal = ({ isOpen, onClose, student, onConfirm, loading }) => {
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');
  const [feedback, setFeedback] = useState('');

  // Helper to format ISO to datetime-local string (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (student) {
      const now = new Date();
      // If student already had actual_start recorded, use it; else default to 20 mins ago or scheduled
      if (student.actual_start) {
        setActualStart(formatDateTimeLocal(student.actual_start));
      } else {
        const startEstimate = new Date(now.getTime() - 20 * 60 * 1000);
        setActualStart(formatDateTimeLocal(startEstimate));
      }
      setActualEnd(formatDateTimeLocal(now));
      setFeedback(student.feedback_notes || '');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  // Calculate live duration & delay
  let calculatedDurationMins = 0;
  let delayMins = 0;
  if (actualStart && actualEnd) {
    const startMs = new Date(actualStart).getTime();
    const endMs = new Date(actualEnd).getTime();
    if (endMs >= startMs) {
      calculatedDurationMins = Math.round((endMs - startMs) / (1000 * 60));
    }
  }

  // Calculate delay from planned scheduled_start
  if (student.scheduled_start && actualStart) {
    const actStartDate = new Date(actualStart);
    const [schedH, schedM] = student.scheduled_start.split(':').map(Number);
    const plannedMinutes = schedH * 60 + schedM;
    const actualMinutes = actStartDate.getHours() * 60 + actStartDate.getMinutes();
    delayMins = actualMinutes - plannedMinutes;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(student.student_id, {
      actual_start: new Date(actualStart).toISOString(),
      actual_end: new Date(actualEnd).toISOString(),
      feedback_notes: feedback.trim() || null
    });
  };

  return (
    <div className="mock-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div className="mock-modal-content" style={{ ...styles.modalContent, maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={{ ...styles.modalTitle, color: '#059669' }}>
              ✓ Mark Interview Completed
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Candidate: <strong>{student.student_name}</strong>
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mock-modal-body" style={styles.modalBody}>
            {/* Planned Slot Comparison Strip */}
            {student.scheduled_start && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Scheduled Plan
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>
                    🕒 {student.scheduled_start} – {student.scheduled_end}
                  </div>
                </div>
                {delayMins !== 0 && (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: delayMins > 0 ? '#fef3c7' : '#ecfdf5',
                    color: delayMins > 0 ? '#92400e' : '#047857'
                  }}>
                    {delayMins > 0 ? `+${delayMins}m late` : `${Math.abs(delayMins)}m early`}
                  </div>
                )}
              </div>
            )}

            {/* Actual Timings Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Actual Start Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={actualStart}
                  onChange={e => setActualStart(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Actual End Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={actualEnd}
                  onChange={e => setActualEnd(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Duration metrics card */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
                Actual Conducted Duration:
              </span>
              <strong style={{ fontSize: '15px', color: '#1d4ed8' }}>
                ⏱️ {calculatedDurationMins} minutes
              </strong>
            </div>

            {/* Optional Mentor / Coordinator Notes */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Interview Notes / Assessment Feedback (Optional)</label>
              <textarea
                placeholder="e.g. Strong in Python OOP & React Hooks. Needs improvement in SQL indexing queries."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                style={styles.textarea}
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
              style={{ background: '#10b981', color: '#ffffff', padding: '10px 20px', borderRadius: '8px' }}
            >
              {loading ? 'Recording...' : 'Mark Completed & Record Timings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteInterviewModal;
