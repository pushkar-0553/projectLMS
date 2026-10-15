import React from 'react';
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

const MockStudentTable = ({
  students = [],
  mockEvent,
  onMarkInterested,
  onOpenNotInterestedModal,
  onStartInterview,
  onOpenCompleteModal
}) => {
  if (students.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={{ fontSize: '32px' }}>👥</span>
        <strong>No students found matching your filters</strong>
        <p style={{ margin: 0, fontSize: '13px' }}>Try adjusting your search query or batch filter.</p>
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Student Name</th>
            <th style={styles.th}>Batch / Assignment</th>
            <th style={styles.th}>Contact</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Planned Slot</th>
            <th style={styles.th}>Actual Conducted Time</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const badge = getStatusBadgeStyle(s.status);

            // WhatsApp link
            let waLink = '#';
            if (s.student_mobile) {
              const cleanPhone = s.student_mobile.replace(/\D/g, '');
              const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
              const slotInfo = s.scheduled_start ? `Slot: ${s.scheduled_start} to ${s.scheduled_end}` : '';
              const meetInfo = mockEvent?.meet_link ? `\nMeet: ${mockEvent.meet_link}` : '';
              const msg = encodeURIComponent(
                `Hello ${s.student_name},\nRegarding "${mockEvent?.title || 'Mock Interview'}" on ${mockEvent?.interview_date || 'scheduled date'}:\n${slotInfo}${meetInfo}\nPlease be available!`
              );
              waLink = `https://wa.me/${phoneWithCountry}?text=${msg}`;
            }

            // Delay calculation (safe)
            let delayMinutes = null;
            if (s.scheduled_start && s.actual_start) {
              try {
                const actDate = new Date(s.actual_start);
                if (!isNaN(actDate.getTime())) {
                  const parts = s.scheduled_start.split(':').map(Number);
                  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const plannedMins = parts[0] * 60 + parts[1];
                    const actualMins = actDate.getHours() * 60 + actDate.getMinutes();
                    delayMinutes = actualMins - plannedMins;
                  }
                }
              } catch {
                delayMinutes = null;
              }
            }

            return (
              <tr key={s.student_id} style={styles.tr}>
                {/* Student Name */}
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '14px' }}>{s.student_name}</strong>
                    {s.student_email && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{s.student_email}</span>
                    )}
                  </div>
                </td>

                {/* Batch */}
                <td style={styles.td}>
                  {s.is_assigned ? (
                    <span style={styles.batchPill}>📁 {s.batch_name}</span>
                  ) : (
                    <span style={styles.unassignedPill}>⚠️ Unassigned</span>
                  )}
                </td>

                {/* Contact: Phone & WhatsApp */}
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {s.student_mobile ? (
                      <>
                        <a href={`tel:${s.student_mobile}`} style={styles.callBtn} title={`Call ${s.student_mobile}`}>
                          📞 {s.student_mobile}
                        </a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.waBtn} title="Message on WhatsApp">
                          💬
                        </a>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No phone</span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...styles.statusBadge, ...badge }}>
                      {badge.label}
                    </span>
                    {s.status === 'NOT_INTERESTED' && s.not_interested_reason && (
                      <span style={{ fontSize: '11px', color: '#991b1b', maxWidth: '220px', lineHeight: '1.3' }}>
                        Note: {s.not_interested_reason}
                      </span>
                    )}
                  </div>
                </td>

                {/* Planned Slot */}
                <td style={styles.td}>
                  {s.scheduled_start ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={styles.slotBadge}>
                        🕒 {s.scheduled_start} – {s.scheduled_end}
                      </span>
                      {s.slot_order && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          (#{s.slot_order})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                      Not slotted
                    </span>
                  )}
                </td>

                {/* Actual Timing & Variance */}
                <td style={styles.td}>
                  {s.actual_start ? (
                    <div style={styles.actualTimingBox}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>
                        {new Date(s.actual_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {s.actual_end ? ` – ${new Date(s.actual_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Ongoing)'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        {s.actual_duration_mins && (
                          <span style={{ color: '#059669', fontWeight: '700' }}>
                            {s.actual_duration_mins}m
                          </span>
                        )}
                        {delayMinutes !== null && delayMinutes !== 0 && (
                          <span style={{
                            fontWeight: '700',
                            color: delayMinutes > 0 ? '#b45309' : '#047857'
                          }}>
                            {delayMinutes > 0 ? `+${delayMinutes}m delay` : `${Math.abs(delayMinutes)}m early`}
                          </span>
                        )}
                      </div>
                      {s.feedback_notes && (
                        <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', maxWidth: '220px' }}>
                          "{s.feedback_notes}"
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                  )}
                </td>

                {/* Action Buttons */}
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <div style={{ ...styles.actionBtnGroup, justifyContent: 'flex-end' }}>
                    {s.status === 'ELIGIBLE' && (
                      <>
                        <button
                          onClick={() => onMarkInterested(s.student_id)}
                          style={styles.interestedBtn}
                        >
                          Interested
                        </button>
                        <button
                          onClick={() => onOpenNotInterestedModal(s)}
                          style={styles.notInterestedBtn}
                        >
                          Not Interested
                        </button>
                      </>
                    )}

                    {s.status === 'NOT_INTERESTED' && (
                      <button
                        onClick={() => onMarkInterested(s.student_id)}
                        style={{ ...styles.interestedBtn, padding: '4px 10px', fontSize: '11px' }}
                      >
                        Change to Interested
                      </button>
                    )}

                    {(s.status === 'INTERESTED' || s.status === 'SCHEDULED') && (
                      <>
                        <button
                          onClick={() => onStartInterview(s.student_id)}
                          style={styles.startBtn}
                        >
                          Start
                        </button>
                        <button
                          onClick={() => onOpenCompleteModal(s)}
                          style={styles.completeBtn}
                        >
                          Complete
                        </button>
                      </>
                    )}

                    {s.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => onOpenCompleteModal(s)}
                        style={styles.completeBtn}
                      >
                        Finish & Complete
                      </button>
                    )}

                    {s.status === 'COMPLETED' && (
                      <button
                        onClick={() => onOpenCompleteModal(s)}
                        style={{ ...styles.secondaryBtn, padding: '4px 8px', fontSize: '11px' }}
                        title="Adjust actual timings"
                      >
                        ✏️ Adjust
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

export default MockStudentTable;
