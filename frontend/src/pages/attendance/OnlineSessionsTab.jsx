import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Copy, Check, Power } from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';

function getTodayIst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export default function OnlineSessionsTab({ scope, batches }) {
  const [batchId, setBatchId] = useState('');
  const [sessionDate, setSessionDate] = useState(() => getTodayIst());
  const [title, setTitle] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(30);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (batches.length > 0 && !batchId) {
      setBatchId(String(batches[0].id));
    }
  }, [batches, batchId]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendancePortalAPI.getSessions({ scope, limit: 50 });
      setSessions(res.data?.sessions || []);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to load sessions.' });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (!batchId) {
      setNotice({ type: 'error', text: 'Please select a batch.' });
      return;
    }

    setCreating(true);
    try {
      const res = await attendancePortalAPI.createSession({
        batchId: Number(batchId),
        sessionDate,
        title: title.trim() || undefined,
        expiresInMinutes: Number(expiresInMinutes)
      });
      const created = res.data?.data;
      setNotice({
        type: 'success',
        text: `Session created! Share code ${created?.session_code} with ${created?.batch_name}.`
      });
      setTitle('');
      loadSessions();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create online session.'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (session) => {
    try {
      await attendancePortalAPI.toggleSession(session.id, !session.is_active);
      loadSessions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle session status.');
    }
  };

  const handleCopyCode = async (session) => {
    try {
      await navigator.clipboard.writeText(session.session_code);
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="att-grid-2">
      <form className="att-panel" onSubmit={handleCreate}>
        <div className="att-panel-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="#4f46e5" /> Create Online Attendance Session
          </span>
        </div>

        <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
          Generate a time-limited random attendance code for remote/online students in a specific
          batch. Students must enter their PIN and this code before expiration.
        </p>

        {notice && (
          <div
            className={`att-status-banner ${notice.type === 'success' ? 'verified' : 'unverified'}`}
            style={{ marginBottom: 14 }}
          >
            <span>{notice.text}</span>
          </div>
        )}

        <div className="att-field">
          <label className="att-label" htmlFor="sess-batch">
            Target Batch
          </label>
          <select
            id="sess-batch"
            className="att-input"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
          >
            <option value="">-- Select Batch --</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.student_count ?? 0} students)
              </option>
            ))}
          </select>
        </div>

        <div className="att-grid-2" style={{ gap: 12 }}>
          <div className="att-field">
            <label className="att-label" htmlFor="sess-date">
              Session Date (IST)
            </label>
            <input
              id="sess-date"
              type="date"
              className="att-input"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          <div className="att-field">
            <label className="att-label" htmlFor="sess-exp">
              Expiration Duration
            </label>
            <select
              id="sess-exp"
              className="att-input"
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(Number(e.target.value))}
            >
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={240}>4 Hours</option>
              <option value={480}>8 Hours</option>
            </select>
          </div>
        </div>

        <div className="att-field">
          <label className="att-label" htmlFor="sess-title">
            Session Topic / Title (Optional)
          </label>
          <input
            id="sess-title"
            type="text"
            className="att-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Live React Hooks Workshop"
          />
        </div>

        <button type="submit" className="att-btn att-btn-primary" disabled={creating}>
          <Plus size={15} /> {creating ? 'Generating Code...' : 'Generate Attendance Code'}
        </button>
      </form>

      <div className="att-panel">
        <div className="att-panel-title">
          <span>Online Sessions</span>
          <button type="button" className="att-btn att-btn-secondary att-btn-sm" onClick={loadSessions}>
            Refresh
          </button>
        </div>

        <div className="att-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Batch / Topic</th>
                <th>Date (IST)</th>
                <th>Expires (IST)</th>
                <th>Marked</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    Loading online sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No online sessions created yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="att-mono" style={{ fontWeight: 800, fontSize: 13.5 }}>
                          {s.session_code}
                        </span>
                        <button
                          type="button"
                          className="att-btn att-btn-secondary att-btn-sm"
                          style={{ padding: '3px 6px' }}
                          onClick={() => handleCopyCode(s)}
                          title="Copy session code"
                        >
                          {copiedId === s.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.batch_name}</div>
                      {s.title && <div style={{ fontSize: 11.5, color: '#64748b' }}>{s.title}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.session_date}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{s.expires_at_ist}</td>
                    <td>{s.attendance_count ?? 0}</td>
                    <td>
                      <span
                        className={`att-badge ${
                          s.effective_status === 'ACTIVE'
                            ? 'att-badge-green'
                            : s.effective_status === 'EXPIRED'
                            ? 'att-badge-amber'
                            : 'att-badge-slate'
                        }`}
                      >
                        {s.effective_status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`att-btn att-btn-sm ${
                          s.is_active ? 'att-btn-secondary' : 'att-btn-primary'
                        }`}
                        onClick={() => handleToggle(s)}
                      >
                        <Power size={13} /> {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
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

