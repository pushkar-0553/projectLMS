import React, { useMemo } from 'react';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'INTERESTED':
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', label: 'Interested' };
    case 'SCHEDULED':
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', label: 'Scheduled' };
    case 'IN_PROGRESS':
      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', label: 'In Progress' };
    case 'COMPLETED':
      return { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', label: 'Completed' };
    case 'NOT_INTERESTED':
      return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', label: 'Not Interested' };
    default:
      return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', label: 'Eligible' };
  }
};

const MockStudentCard = ({
  student,
  mockEvent,
  onMarkInterested,
  onOpenNotInterestedModal,
  onStartInterview,
  onOpenCompleteModal
}) => {
  const badgeConfig = getStatusBadgeStyle(student.status);

  // Memoized WhatsApp prefilled message
  const waLink = useMemo(() => {
    if (!student.student_mobile) return '#';
    const cleanPhone = student.student_mobile.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const slotInfo = student.scheduled_start
      ? `Scheduled Slot: ${student.scheduled_start} to ${student.scheduled_end}`
      : 'Interview details will be shared shortly.';
    const meetInfo = mockEvent?.meet_link ? `\nMeet Link: ${mockEvent.meet_link}` : '';

    const text = encodeURIComponent(
      `Hello ${student.student_name},\n\nRegarding your upcoming mock interview for "${mockEvent?.title || 'Mock Interview'}" on ${mockEvent?.interview_date || 'the scheduled date'}:\n\n${slotInfo}${meetInfo}\n\nPlease be prepared on time. Best regards!`
    );

    return `https://wa.me/${phoneWithCountry}?text=${text}`;
  }, [student.student_mobile, student.student_name, student.scheduled_start, student.scheduled_end, mockEvent?.title, mockEvent?.interview_date, mockEvent?.meet_link]);

  // Memoized timing delay calculation
  const delayMinutes = useMemo(() => {
    if (!student.scheduled_start || !student.actual_start) return null;
    try {
      const actDate = new Date(student.actual_start);
      if (isNaN(actDate.getTime())) return null;
      const parts = student.scheduled_start.split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      const plannedMins = parts[0] * 60 + parts[1];
      const actualMins = actDate.getHours() * 60 + actDate.getMinutes();
      return actualMins - plannedMins;
    } catch {
      return null;
    }
  }, [student.scheduled_start, student.actual_start]);

  return (
    <div className="mock-student-card" style={styles.mobileStudentCard}>
      {/* Top Header: Name and Status */}
      <div style={styles.mobileCardHeader}>
        <div>
          <div style={styles.mobileStudentName}>
            {student.student_name}
          </div>
          <div style={styles.mobileStudentSub}>
            {student.is_assigned ? (
              <span style={styles.batchPill}>📁 {student.batch_name}</span>
            ) : (
              <span style={styles.unassignedPill}>⚠️ Unassigned</span>
            )}
            {student.slot_order && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5', background: '#e0e7ff', padding: '1px 6px', borderRadius: '4px' }}>
                Slot #{student.slot_order}
              </span>
            )}
          </div>
        </div>

        <span style={{ ...styles.statusBadge, ...badgeConfig }}>
          {badgeConfig.label}
        </span>
      </div>

      {/* Contact info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#64748b' }}>
        {student.student_mobile && <span>📱 {student.student_mobile}</span>}
        {student.student_email && <span>✉️ {student.student_email}</span>}
      </div>

      {/* Planned Slot & Actual Timings representation */}
      {student.scheduled_start && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.slotBadge}>
              🕒 Slot: {student.scheduled_start} – {student.scheduled_end}
            </span>
            {delayMinutes !== null && delayMinutes !== 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: delayMinutes > 0 ? '#b45309' : '#047857'
              }}>
                {delayMinutes > 0 ? `+${delayMinutes}m delay` : `${Math.abs(delayMinutes)}m early`}
              </span>
            )}
          </div>

          {/* Actual Interview Conducted Details */}
          {student.actual_start && (
            <div style={styles.actualTimingBox}>
              <div>
                <strong>Actual:</strong> {new Date(student.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {student.actual_end && ` – ${new Date(student.actual_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                {student.actual_duration_mins ? ` (${student.actual_duration_mins} mins)` : ''}
              </div>
              {student.feedback_notes && (
                <div style={{ fontStyle: 'italic', color: '#334155', marginTop: '2px' }}>
                  💬 "{student.feedback_notes}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Not Interested Reason display */}
      {student.status === 'NOT_INTERESTED' && student.not_interested_reason && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#991b1b' }}>
          <strong>Reason:</strong> {student.not_interested_reason}
        </div>
      )}

      {/* Communication & Operations Action Row */}
      <div className="mock-student-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
        {/* Contact buttons */}
        <div className="mock-student-contact-btns" style={{ display: 'flex', gap: '8px' }}>
          {student.student_mobile && (
            <a href={`tel:${student.student_mobile}`} className="mock-call-btn" title="Call student">
              📞 Call
            </a>
          )}
          {student.student_mobile && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mock-wa-btn"
              title="Open WhatsApp chat"
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        {/* Operational state buttons */}
        <div className="mock-student-state-btns" style={{ display: 'flex', gap: '8px' }}>
          {student.status === 'ELIGIBLE' && (
            <>
              <button
                onClick={() => onMarkInterested(student.student_id)}
                className="mock-status-btn"
                style={{ background: '#10b981', color: '#ffffff' }}
              >
                Interested
              </button>
              <button
                onClick={() => onOpenNotInterestedModal(student)}
                className="mock-status-btn"
                style={{ background: '#ef4444', color: '#ffffff' }}
              >
                Not Interested
              </button>
            </>
          )}

          {student.status === 'NOT_INTERESTED' && (
            <button
              onClick={() => onMarkInterested(student.student_id)}
              className="mock-status-btn"
              style={{ background: '#10b981', color: '#ffffff', padding: '6px 12px', fontSize: '12px' }}
            >
              Change to Interested
            </button>
          )}

          {(student.status === 'INTERESTED' || student.status === 'SCHEDULED') && (
            <>
              <button
                onClick={() => onStartInterview(student.student_id)}
                className="mock-status-btn"
                style={{ background: '#3b82f6', color: '#ffffff' }}
              >
                ▶ Start Interview
              </button>
              <button
                onClick={() => onOpenCompleteModal(student)}
                className="mock-status-btn"
                style={{ background: '#10b981', color: '#ffffff' }}
              >
                ✓ Mark Completed
              </button>
            </>
          )}

          {student.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onOpenCompleteModal(student)}
              className="mock-status-btn"
              style={{ background: '#10b981', color: '#ffffff' }}
            >
              ✓ Finish & Complete
            </button>
          )}

          {student.status === 'COMPLETED' && (
            <button
              onClick={() => onOpenCompleteModal(student)}
              className="mock-status-btn mock-btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Adjust actual timings or notes"
            >
              ✏️ Adjust Timing
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockStudentCard;
