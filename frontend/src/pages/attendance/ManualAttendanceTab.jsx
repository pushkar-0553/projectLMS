import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardEdit, ShieldAlert, Search } from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';

function getTodayIst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export default function ManualAttendanceTab({ scope }) {
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => getTodayIst());
  const [attendanceMode, setAttendanceMode] = useState('OFFLINE');
  const [status, setStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [logsActionFilter, setLogsActionFilter] = useState('ALL');
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    attendancePortalAPI
      .getAdminStudents({ scope, limit: 250 })
      .then((res) => setStudents(res.data?.students || []))
      .catch(() => {});
  }, [scope]);

  const loadAuditLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await attendancePortalAPI.getAuditLogs({
        actionType: logsActionFilter,
        limit: 50
      });
      setAuditLogs(res.data?.logs || []);
    } catch {
      // keep silent
    } finally {
      setLogsLoading(false);
    }
  }, [logsActionFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q));
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (!selectedStudentId) {
      setNotice({ type: 'error', text: 'Please select a student.' });
      return;
    }
    if (correctionReason.trim().length < 3) {
      setNotice({ type: 'error', text: 'Please enter a correction reason (at least 3 characters).' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await attendancePortalAPI.markManual({
        studentId: Number(selectedStudentId),
        attendanceDate,
        attendanceMode,
        status,
        correctionReason: correctionReason.trim()
      });
      setNotice({ type: 'success', text: res.data?.message || 'Manual attendance saved.' });
      setCorrectionReason('');
      loadAuditLogs();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save manual attendance.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="att-grid-2">
      <form className="att-panel" onSubmit={handleSubmit}>
        <div className="att-panel-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardEdit size={18} color="#4f46e5" /> Manual Attendance &amp; Corrections
          </span>
        </div>

        <div className="att-status-banner info" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Manual changes never overwrite original student submission evidence. If a record already
              exists, its original timestamp, IP, device UUID, and mode are preserved in{' '}
              <code>original_evidence</code> and logged in <code>attendance_audit_logs</code>.
            </span>
          </div>
        </div>

        {notice && (
          <div
            className={`att-status-banner ${notice.type === 'success' ? 'verified' : 'unverified'}`}
            style={{ marginBottom: 14 }}
          >
            <span>{notice.text}</span>
          </div>
        )}

        <div className="att-field">
          <label className="att-label" htmlFor="manual-student-search">
            Filter Student List
          </label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              id="manual-student-search"
              type="text"
              className="att-input"
              style={{ paddingLeft: 30 }}
              placeholder="Type student name or email..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <label className="att-label" htmlFor="manual-student-select">
            Student
          </label>
          <select
            id="manual-student-select"
            className="att-input"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            required
          >
            <option value="">-- Select Student --</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.batch_name || 'Unassigned'})
              </option>
            ))}
          </select>
        </div>

        <div className="att-grid-2" style={{ gap: 12 }}>
          <div className="att-field">
            <label className="att-label" htmlFor="manual-date">
              Attendance Date (IST)
            </label>
            <input
              id="manual-date"
              type="date"
              className="att-input"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
            />
          </div>

          <div className="att-field">
            <label className="att-label" htmlFor="manual-mode">
              Attendance Mode
            </label>
            <select
              id="manual-mode"
              className="att-input"
              value={attendanceMode}
              onChange={(e) => setAttendanceMode(e.target.value)}
            >
              <option value="OFFLINE">OFFLINE</option>
              <option value="ONLINE">ONLINE</option>
            </select>
          </div>
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="manual-status">
            Status
          </label>
          <select
            id="manual-status"
            className="att-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="EXCUSED">EXCUSED</option>
            <option value="ABSENT">ABSENT</option>
          </select>
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="manual-reason">
            Correction Reason (Mandatory)
          </label>
          <textarea
            id="manual-reason"
            rows={3}
            className="att-input"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder="e.g. Student attended offline class; campus Wi-Fi router restarted during check-in."
            required
          />
        </div>

        <button type="submit" className="att-btn att-btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Manual Attendance'}
        </button>
      </form>

      {/* Audit Logs */}
      <div className="att-panel">
        <div className="att-panel-title">
          <span>Attendance Audit Trail</span>
          <select
            className="att-filter-select"
            value={logsActionFilter}
            onChange={(e) => setLogsActionFilter(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="MANUAL_MARK">Manual Mark</option>
            <option value="MANUAL_ADJUST">Manual Adjust</option>
            <option value="DEVICE_RESET">Device Reset</option>
            <option value="WIFI_SETTINGS_UPDATE">Wi-Fi Settings</option>
            <option value="SESSION_CREATE">Session Create</option>
            <option value="SESSION_TOGGLE">Session Toggle</option>
            <option value="PIN_SET">PIN Set</option>
            <option value="PIN_BULK_GENERATE">Bulk PIN Gen</option>
          </select>
        </div>

        <div className="att-table-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="att-table">
            <thead>
              <tr>
                <th>Time (IST)</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Student</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{log.created_at_ist}</td>
                    <td>
                      <span className="att-badge att-badge-indigo">{log.action_type}</span>
                    </td>
                    <td>{log.actor_admin_name || 'System'}</td>
                    <td>{log.target_student_name || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{log.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

