import React, { useState, useEffect } from 'react'
import { attendanceAPI } from '../../services/api'
import {
  Calendar, Save, History, ArrowLeft, Users,
  CheckCircle2, AlertCircle, ClipboardList, BookOpen
} from 'lucide-react'
import Button from '../../components/common/Button'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused']

const STATUS_META = {
  present: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'Present' },
  absent:  { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'Absent' },
  late:    { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: 'Late' },
  excused: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', label: 'Excused' },
}

export default function AttendancePage() {
  const [view, setView]                   = useState('daily')
  const [batches, setBatches]             = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [todayData, setTodayData]         = useState(null)
  const [topicInput, setTopicInput]       = useState('')
  const [notesInput, setNotesInput]       = useState('')
  const [attendance, setAttendance]       = useState({})
  const [saving, setSaving]               = useState(false)
  const [notice, setNotice]               = useState(null)

  const [history, setHistory]                 = useState([])
  const [historyFilter, setHistoryFilter]     = useState('month')
  const [customStart, setCustomStart]         = useState('')
  const [customEnd, setCustomEnd]             = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [sessionDetail, setSessionDetail]     = useState(null)

  const [unassigned, setUnassigned]           = useState([])
  const [showUnassigned, setShowUnassigned]   = useState(false)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      attendanceAPI.getBatches(),
      attendanceAPI.getUnassigned(),
    ]).then(([bRes, uRes]) => {
      setBatches(bRes.data)
      setUnassigned(uRes.data)
      if (bRes.data.length > 0) setSelectedBatch(bRes.data[0])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedBatch) return
    attendanceAPI.getToday(selectedBatch.id).then(r => {
      setTodayData(r.data)
      setTopicInput(r.data.session?.topic_covered || '')
      setNotesInput(r.data.session?.notes || '')
      const init = {}
      r.data.records.forEach(rec => {
        init[rec.student_id] = { status: rec.status || 'absent', remarks: rec.remarks || '' }
      })
      setAttendance(init)
    })
  }, [selectedBatch])

  useEffect(() => {
    if (view !== 'history' || !selectedBatch) return
    const { start, end } = getDateRange()
    attendanceAPI.getHistory(selectedBatch.id, start, end).then(r => setHistory(r.data))
  }, [view, selectedBatch, historyFilter, customStart, customEnd])

  const getDateRange = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (historyFilter === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7)
      return { start: d.toISOString().slice(0, 10), end: today }
    }
    if (historyFilter === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd }
    }
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return { start: d.toISOString().slice(0, 10), end: today }
  }

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
  }

  const handleRemarksChange = (studentId, remarks) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
  }

  const markAll = (status) => {
    const updated = {}
    todayData.records.forEach(rec => {
      updated[rec.student_id] = { ...attendance[rec.student_id], status }
    })
    setAttendance(updated)
  }

  const summary = (todayData?.records || []).reduce((acc, rec) => {
    const s = attendance[rec.student_id]?.status || 'absent'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, { present: 0, absent: 0, late: 0, excused: 0 })

  const totalVisible = todayData?.records?.length || 0
  const attendancePct = totalVisible > 0
    ? Math.round(((summary.present + summary.late) / totalVisible) * 100)
    : 0

  const handleSave = async () => {
    if (!selectedBatch) return
    setSaving(true)
    setNotice(null)
    try {
      const sessionRes = await attendanceAPI.upsertSession(selectedBatch.id, topicInput, notesInput)
      const sessionId = sessionRes.data.id
      const records = Object.entries(attendance).map(([studentId, data]) => ({
        studentId: parseInt(studentId),
        status: data.status,
        remarks: data.remarks || ''
      }))
      await attendanceAPI.markAttendance(sessionId, records)
      setNotice({ type: 'success', text: 'Attendance saved successfully.' })
      const refreshed = await attendanceAPI.getToday(selectedBatch.id)
      setTodayData(refreshed.data)
    } catch (err) {
      setNotice({ type: 'error', text: 'Failed to save attendance. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const loadSessionDetail = async (sessionId) => {
    setSelectedSessionId(sessionId)
    const res = await attendanceAPI.getSessionDetail(sessionId)
    setSessionDetail(res.data)
  }

  const handleAssignStudent = async (studentId, batchId) => {
    await attendanceAPI.assignStudent(studentId, batchId)
    const [uRes, tRes] = await Promise.all([
      attendanceAPI.getUnassigned(),
      attendanceAPI.getToday(selectedBatch.id),
    ])
    setUnassigned(uRes.data)
    setTodayData(tRes.data)
  }

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  /* ─── RENDER ─── */
  return (
    <div className="attendance-page fade-in">

      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="container header-row">
          <div>
            <span className="badge badge-primary">Attendance Control</span>
            <h1>Daily Attendance &amp; Register</h1>
            <p>Mark attendance, record class topics, and view historical session data.</p>
          </div>
        </div>
      </header>

      {/* ── Batch Tab Nav ── */}
      <nav className="tab-nav">
        <div className="container tab-nav-inner">
          {batches.map(b => (
            <button
              key={b.id}
              className={`tab-btn ${selectedBatch?.id === b.id && view === 'daily' ? 'active' : ''}`}
              onClick={() => { setSelectedBatch(b); setView('daily') }}
            >
              <Users size={15} />
              <span>{b.name}</span>
              <span className="tab-count">{b.student_count}</span>
            </button>
          ))}
          <button
            className={`tab-btn ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
          >
            <History size={15} />
            <span>History</span>
          </button>
          {unassigned.length > 0 && (
            <button
              className={`tab-btn warn ${showUnassigned ? 'active-warn' : ''}`}
              onClick={() => setShowUnassigned(v => !v)}
            >
              <AlertCircle size={15} />
              <span>{unassigned.length} Unassigned</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="container ops-content">

        {/* Notice */}
        {notice && (
          <div className={`notice ${notice.type}`}>
            {notice.type === 'success'
              ? <CheckCircle2 size={17} />
              : <AlertCircle size={17} />}
            <span>{notice.text}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading attendance data…</div>
        ) : (
          <>
            {/* ── Unassigned Panel ── */}
            {showUnassigned && (
              <div className="card tab-panel">
                <h2 className="section-title">
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Unassigned Students
                </h2>
                <p className="section-sub">These students are not in any batch. Assign them to track their attendance.</p>
                <div className="table-wrapper">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Assign to Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassigned.map(s => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <span>{s.email}</span>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              style={{ maxWidth: 260 }}
                              onChange={e => e.target.value && handleAssignStudent(s.id, parseInt(e.target.value))}
                            >
                              <option value="">Select batch…</option>
                              {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                DAILY VIEW
            ══════════════════════════════════════ */}
            {view === 'daily' && selectedBatch && (
              <div className="tab-panel">

                {/* Session Setup Card */}
                <div className="card form-card">
                  <h2 className="section-title">
                    <Calendar size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Session Details — {todayStr}
                  </h2>
                  <p className="section-sub">Record what was covered today before marking attendance.</p>
                  <div className="form-grid">
                    <div className="field-group">
                      <label className="field-label">Topic / class covered today</label>
                      <input
                        className="form-control"
                        placeholder="e.g. React Hooks — useState and useEffect"
                        value={topicInput}
                        onChange={e => setTopicInput(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Additional notes (optional)</label>
                      <input
                        className="form-control"
                        placeholder="Any notes for this session…"
                        value={notesInput}
                        onChange={e => setNotesInput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Attendance Register Card */}
                <div className="card">
                  <div className="register-header">
                    <div>
                      <h2 className="section-title">
                        <ClipboardList size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Attendance Register — {selectedBatch.name}
                      </h2>
                      <p className="section-sub">
                        Default status is absent. Mark each student individually or use bulk actions.
                      </p>
                    </div>
                    <div className="bulk-actions">
                      <span className="field-label" style={{ marginBottom: 0, alignSelf: 'center' }}>Mark all:</span>
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          className="quick-action-btn"
                          style={{
                            background: STATUS_META[s].bg,
                            color: STATUS_META[s].text,
                            borderColor: STATUS_META[s].border,
                          }}
                          onClick={() => markAll(s)}
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Table */}
                  {totalVisible === 0 ? (
                    <div className="empty-class-state">
                      No students assigned to this batch yet.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}>#</th>
                            <th>Student</th>
                            <th style={{ width: 220 }}>Status</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(todayData?.records || []).map((rec, idx) => {
                            const cur = attendance[rec.student_id] || { status: 'absent', remarks: '' }
                            const meta = STATUS_META[cur.status]
                            return (
                              <tr key={rec.student_id}>
                                <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                                <td>
                                  <strong>{rec.name}</strong>
                                  <span>{rec.email}</span>
                                </td>
                                <td>
                                  <div className="status-btn-group">
                                    {STATUS_OPTIONS.map(s => (
                                      <button
                                        key={s}
                                        className={`status-btn ${cur.status === s ? 'active' : ''}`}
                                        style={cur.status === s ? {
                                          background: STATUS_META[s].bg,
                                          color: STATUS_META[s].text,
                                          borderColor: STATUS_META[s].border,
                                        } : {}}
                                        onClick={() => handleStatusChange(rec.student_id, s)}
                                      >
                                        {STATUS_META[s].label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <input
                                    className="form-control"
                                    placeholder="Optional"
                                    value={cur.remarks}
                                    onChange={e => handleRemarksChange(rec.student_id, e.target.value)}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Footer */}
                  {totalVisible > 0 && (
                    <div className="attendance-footer">
                      <div className="attendance-counts">
                        <span className="count-pill present">Present {summary.present}</span>
                        <span className="count-pill absent">Absent {summary.absent}</span>
                        <span className="count-pill late">Late {summary.late}</span>
                        <span className="count-pill excused">Excused {summary.excused}</span>
                        <span className="count-pill percentage">{attendancePct}% Attendance</span>
                      </div>
                      <div className="attendance-actions">
                        <Button
                          onClick={handleSave}
                          disabled={saving || totalVisible === 0}
                          className="btn-success"
                        >
                          <Save size={15} />
                          {saving ? 'Saving…' : 'Save Attendance'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                HISTORY VIEW
            ══════════════════════════════════════ */}
            {view === 'history' && (
              <div className="tab-panel">
                <div className="card">
                  <div className="register-header">
                    <div>
                      <h2 className="section-title">
                        <BookOpen size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Attendance History
                      </h2>
                      <p className="section-sub">
                        {selectedBatch ? `Showing records for ${selectedBatch.name}` : 'Select a batch from the tabs above.'}
                      </p>
                    </div>
                    <div className="register-controls">
                      <div className="date-filter-controls">
                        {['week', 'month', 'custom'].map(f => (
                          <button
                            key={f}
                            className={`filter-btn ${historyFilter === f ? 'active' : ''}`}
                            onClick={() => setHistoryFilter(f)}
                          >
                            {f === 'week' ? 'This week' : f === 'month' ? 'This month' : 'Custom'}
                          </button>
                        ))}
                        {historyFilter === 'custom' && (
                          <>
                            <input
                              type="date"
                              className="form-control"
                              style={{ width: 150 }}
                              value={customStart}
                              onChange={e => setCustomStart(e.target.value)}
                            />
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>to</span>
                            <input
                              type="date"
                              className="form-control"
                              style={{ width: 150 }}
                              value={customEnd}
                              onChange={e => setCustomEnd(e.target.value)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Session Detail drill-down */}
                  {selectedSessionId && sessionDetail ? (
                    <div>
                      <button
                        className="btn btn-secondary"
                        style={{ marginBottom: '1rem' }}
                        onClick={() => { setSelectedSessionId(null); setSessionDetail(null) }}
                      >
                        <ArrowLeft size={14} /> Back to history
                      </button>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                          {new Date(sessionDetail.session.session_date).toLocaleDateString('en-IN', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </strong>
                        {sessionDetail.session.topic_covered && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Topic: {sessionDetail.session.topic_covered}
                          </p>
                        )}
                      </div>
                      <div className="table-wrapper">
                        <table className="modern-table">
                          <thead>
                            <tr><th>Student</th><th>Status</th><th>Remarks</th></tr>
                          </thead>
                          <tbody>
                            {sessionDetail.records.map((r, i) => {
                              const meta = STATUS_META[r.status] || { bg: '#f3f4f6', text: '#6b7280', label: r.status }
                              return (
                                <tr key={r.student_id}>
                                  <td><strong>{r.name}</strong><span>{r.email}</span></td>
                                  <td>
                                    <span className="count-pill" style={{
                                      background: meta.bg,
                                      color: meta.text,
                                      fontWeight: 700,
                                    }}>
                                      {meta.label}
                                    </span>
                                  </td>
                                  <td><span>{r.remarks || '—'}</span></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* History list */
                    <>
                      {history.length === 0 ? (
                        <div className="empty-class-state">No records found for this period.</div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="modern-table history-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Topic</th>
                                <th style={{ width: 80, textAlign: 'center' }}>Present</th>
                                <th style={{ width: 80, textAlign: 'center' }}>Absent</th>
                                <th style={{ width: 80, textAlign: 'center' }}>Late</th>
                                <th style={{ width: 90, textAlign: 'center' }}>Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.map(h => {
                                const total = h.total_students || 1
                                const pct = Math.round((h.present_count / total) * 100)
                                return (
                                  <tr
                                    key={h.session_id}
                                    className="clickable-row"
                                    onClick={() => loadSessionDetail(h.session_id)}
                                  >
                                    <td>
                                      <strong>
                                        {new Date(h.session_date).toLocaleDateString('en-IN', {
                                          weekday: 'short', month: 'short', day: 'numeric'
                                        })}
                                      </strong>
                                    </td>
                                    <td>
                                      <span style={{ color: h.topic_covered ? '#0f172a' : '#94a3b8' }}>
                                        {h.topic_covered || 'No topic recorded'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="count-pill present">{h.present_count}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="count-pill absent">{h.absent_count}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="count-pill late">{h.late_count}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span
                                        className="count-pill percentage"
                                        style={{
                                          color: pct >= 75 ? '#166534' : '#991b1b',
                                          background: pct >= 75 ? '#dcfce7' : '#fee2e2',
                                        }}
                                      >
                                        {pct}%
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        /* ── Base ── */
        .attendance-page { min-height: 100vh; background: #f8fafc; padding-bottom: 4rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        /* ── Header ── */
        .page-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 2.5rem 0 1.5rem; }
        .header-row { display: flex; align-items: flex-start; gap: 1rem; }
        .page-header h1 { font-size: 1.75rem; color: #0f172a; margin: 0.4rem 0 0.3rem; font-weight: 800; }
        .page-header p { color: #64748b; margin: 0; font-size: 0.9rem; }
        .badge { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge-primary { background: #ede9fe; color: #6d28d9; }

        /* ── Tab Nav ── */
        .tab-nav { background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 20; }
        .tab-nav-inner { display: flex; align-items: stretch; overflow-x: auto; }
        .tab-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.9rem 1.1rem; border: none; background: transparent; color: #64748b; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s; }
        .tab-btn:hover { color: #0f172a; background: #f8fafc; }
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; }
        .tab-btn.warn { color: #92400e; }
        .tab-btn.active-warn { color: #92400e; border-bottom-color: #f59e0b; background: #fffbeb; }
        .tab-count { background: #f1f5f9; color: #475569; border-radius: 999px; font-size: 0.7rem; padding: 0.1rem 0.5rem; font-weight: 700; }
        .tab-btn.active .tab-count { background: #eef2ff; color: #4f46e5; }

        /* ── Content ── */
        .ops-content { padding-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .tab-panel { display: flex; flex-direction: column; gap: 1.25rem; }
        .loading-state { text-align: center; padding: 3rem; color: #64748b; font-size: 0.95rem; }

        /* ── Notice ── */
        .notice { display: flex; align-items: center; gap: 0.75rem; border-radius: 8px; padding: 0.85rem 1rem; font-weight: 700; font-size: 0.875rem; }
        .notice.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .notice.error   { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

        /* ── Cards ── */
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; }
        .form-card { max-width: 860px; }
        .section-title { font-size: 1.05rem; color: #0f172a; margin: 0 0 0.25rem; font-weight: 700; }
        .section-sub { color: #64748b; font-size: 0.85rem; margin: 0 0 1.25rem; }

        /* ── Form grid ── */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .field-label { font-size: 0.78rem; font-weight: 700; color: #475569; letter-spacing: 0.01em; }
        .form-control { border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.55rem 0.75rem; font-size: 0.875rem; background: #fff; width: 100%; box-sizing: border-box; color: #0f172a; }
        .form-control:focus { outline: none; border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

        /* ── Register header ── */
        .register-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .register-controls { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
        .bulk-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

        /* ── Quick action buttons (bulk mark) ── */
        .quick-action-btn { display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: opacity 0.12s; }
        .quick-action-btn:hover { opacity: 0.8; }

        /* ── Table ── */
        .table-wrapper { overflow-x: auto; max-height: 520px; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; background: #f8fafc; color: #64748b; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.75rem 1rem; position: sticky; top: 0; font-weight: 700; }
        .modern-table td { border-top: 1px solid #eef2f7; padding: 0.65rem 1rem; vertical-align: middle; }
        .modern-table td strong { display: block; font-size: 0.875rem; color: #0f172a; font-weight: 700; }
        .modern-table td span { display: block; color: #64748b; font-size: 0.78rem; }
        .clickable-row { cursor: pointer; transition: background 0.1s; }
        .clickable-row:hover { background: #f8fafc; }

        /* ── Status button group (inline toggle) ── */
        .status-btn-group { display: flex; gap: 3px; }
        .status-btn { padding: 0.28rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 0.72rem; font-weight: 700; cursor: pointer; background: #f8fafc; color: #64748b; transition: all 0.1s; white-space: nowrap; }
        .status-btn:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .status-btn.active { font-weight: 800; }

        /* ── Attendance footer ── */
        .attendance-footer { border-top: 1px solid #eef2f7; padding-top: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; }
        .attendance-counts { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
        .attendance-actions { display: flex; gap: 0.5rem; }

        /* ── Count pills ── */
        .count-pill { border-radius: 999px; padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 900; display: inline-block; }
        .count-pill.present  { background: #dcfce7; color: #166534; }
        .count-pill.absent   { background: #fee2e2; color: #991b1b; }
        .count-pill.late     { background: #fef3c7; color: #92400e; }
        .count-pill.excused  { background: #e0f2fe; color: #075985; }
        .count-pill.percentage { background: #f3f4f6; color: #374151; border: 2px solid #d1d5db; }

        /* ── Date filter row ── */
        .date-filter-controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .filter-btn { padding: 0.4rem 0.85rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; color: #334155; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .filter-btn:hover { background: #eef2ff; border-color: #a5b4fc; color: #4f46e5; }
        .filter-btn.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }

        /* ── Empty state ── */
        .empty-class-state { min-height: 180px; display: flex; align-items: center; justify-content: center; text-align: center; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 2rem; font-size: 0.875rem; }

        /* ── Buttons ── */
        .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; border: none; }
        .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
        .btn-secondary:hover { background: #e2e8f0; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .form-grid { grid-template-columns: 1fr; }
          .register-header { flex-direction: column; }
          .register-controls { align-items: flex-start; width: 100%; }
          .attendance-footer { flex-direction: column; align-items: flex-start; }
          .bulk-actions { flex-wrap: wrap; }
        }
        @media (max-width: 640px) {
          .tab-btn span { display: none; }
          .tab-btn { padding: 0.9rem 0.75rem; }
          .page-header h1 { font-size: 1.35rem; }
          .status-btn-group { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}