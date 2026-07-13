import React, { useEffect, useMemo, useState } from 'react';
import { academicAPI, adminAPI } from '../../services/api';
import Button from '../../components/common/Button';
import {
  AlertCircle, CalendarCheck, CheckCircle2, ClipboardCheck,
  ExternalLink, FileBarChart, MonitorPlay, MoreVertical,
  Pencil, Save, Trash2, Users
} from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

const TABS = [
  { id: 'overview', label: 'Overview', icon: <FileBarChart size={16} /> },
  { id: 'attendance', label: 'Attendance Setup', icon: <CalendarCheck size={16} /> },
  { id: 'online', label: 'Online Class', icon: <MonitorPlay size={16} /> },
  { id: 'register', label: 'Attendance Register', icon: <ClipboardCheck size={16} /> },
  { id: 'assessment', label: 'Assessments', icon: <FileBarChart size={16} /> },
  { id: 'scores', label: 'Exam Scores', icon: <Users size={16} /> },
];

const AcademicOperations = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceForm, setAttendanceForm] = useState({ title: 'Daily Attendance', session_date: today, batch_id: '', sub_batch_id: '', notes: '' });
  const [assessmentForm, setAssessmentForm] = useState({ title: '', assessment_type: 'weekly', assessment_date: today, max_marks: 100, syllabus: '' });
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [resultRecords, setResultRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [notice, setNotice] = useState(null);
  const [classLinkDraft, setClassLinkDraft] = useState('');
  const [classLinkName, setClassLinkName] = useState('');
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [classLinks, setClassLinks] = useState([]);
  const [activeClassUrl, setActiveClassUrl] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [liveRosterText, setLiveRosterText] = useState('');
  const [matchedNames, setMatchedNames] = useState([]);
  const [unmatchedNames, setUnmatchedNames] = useState([]);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { loadSessionRecords(); }, [selectedSessionId]);
  useEffect(() => { fetchClassLinks(); }, [attendanceForm.batch_id, attendanceForm.sub_batch_id]);
  useEffect(() => { fetchData(); }, [dateFilter]);

  useEffect(() => {
    if (students.length === 0) return;
    setAttendanceRecords((current) => {
      const next = { ...current };
      students.forEach((student) => {
        if (!next[student.id]) next[student.id] = { status: 'absent', remarks: '' };
      });
      return next;
    });
  }, [students]);

  useEffect(() => {
    if (classLinks.length > 0) {
      setActiveClassUrl(classLinks[0].url);
    } else {
      setActiveClassUrl(legacyClassLink || '');
    }
  }, [classLinks, attendanceForm.batch_id, attendanceForm.sub_batch_id, batches]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (dateFilter.startDate) queryParams.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) queryParams.append('endDate', dateFilter.endDate);
      const [studentsRes, batchesRes, sessionsRes, assessmentsRes, overviewRes] = await Promise.all([
        adminAPI.getStudents(),
        adminAPI.getBatches(),
        academicAPI.getAttendanceSessions(`?${queryParams.toString()}`),
        academicAPI.getAssessments(),
        academicAPI.getOverview()
      ]);
      setStudents(studentsRes.data);
      setBatches(batchesRes.data);
      setSessions(sessionsRes.data);
      setAssessments(assessmentsRes.data);
      setOverview(overviewRes.data);
      if (!selectedSessionId && sessionsRes.data[0]) setSelectedSessionId(String(sessionsRes.data[0].id));
      if (!selectedAssessmentId && assessmentsRes.data[0]) setSelectedAssessmentId(String(assessmentsRes.data[0].id));
    } catch (error) {
      console.error('Failed to load academic operations', error);
      setNotice({ type: 'error', text: error.response?.data?.message || 'Attendance page could not load. Please confirm the academics migration is deployed.' });
    } finally {
      setLoading(false);
    }
  };

  const subBatchOptions = useMemo(() => {
    const batch = batches.find((item) => String(item.id) === String(attendanceForm.batch_id));
    return batch?.subBatches || [];
  }, [batches, attendanceForm.batch_id]);

  const selectedBatch = useMemo(
    () => batches.find((item) => String(item.id) === String(attendanceForm.batch_id)),
    [batches, attendanceForm.batch_id]
  );

  const selectedSubBatch = useMemo(
    () => subBatchOptions.find((item) => String(item.id) === String(attendanceForm.sub_batch_id)),
    [subBatchOptions, attendanceForm.sub_batch_id]
  );

  const legacyClassLink = selectedSubBatch?.class_link || selectedBatch?.class_link || '';

  const visibleStudents = useMemo(() => {
    if (attendanceForm.sub_batch_id) return students.filter((s) => String(s.sub_batch_id) === String(attendanceForm.sub_batch_id));
    if (attendanceForm.batch_id) return students.filter((s) => String(s.batch_id) === String(attendanceForm.batch_id));
    return students;
  }, [students, attendanceForm.batch_id, attendanceForm.sub_batch_id]);

  const attendanceSummary = useMemo(() => {
    return visibleStudents.reduce((summary, student) => {
      const status = attendanceRecords[student.id]?.status || 'absent';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    }, { present: 0, absent: 0, late: 0, excused: 0 });
  }, [visibleStudents, attendanceRecords]);

  const createAttendanceSession = async (event) => {
    event.preventDefault();
    try {
      const response = await academicAPI.createAttendanceSession({
        ...attendanceForm,
        title: attendanceForm.title || 'Daily Attendance',
        batch_id: attendanceForm.batch_id || null,
        sub_batch_id: attendanceForm.sub_batch_id || null
      });
      setSelectedSessionId(String(response.data.sessionId));
      setNotice({ type: 'success', text: 'Attendance session created.' });
      await fetchData();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to create attendance session.' });
    }
  };

  const loadSessionRecords = async () => {
    if (!selectedSessionId) return;
    try {
      const response = await academicAPI.getAttendanceRecords(selectedSessionId);
      setAttendanceRecords(() => {
        const next = {};
        students.forEach((s) => { next[s.id] = { status: 'absent', remarks: '' }; });
        response.data.forEach((record) => {
          next[record.student_id] = { status: record.status || 'absent', remarks: record.remarks || '' };
        });
        return next;
      });
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to load saved attendance records.' });
    }
  };

  const fetchClassLinks = async () => {
    try {
      const response = await academicAPI.getClassLinks({
        batchId: attendanceForm.batch_id || undefined,
        subBatchId: attendanceForm.sub_batch_id || undefined
      });
      setClassLinks(response.data);
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to load class links.' });
    }
  };

  const saveClassLink = async () => {
    try {
      if (!classLinkName.trim() || !classLinkDraft.trim()) {
        setNotice({ type: 'error', text: 'Enter both class name and class link.' });
        return;
      }
      const payload = {
        name: classLinkName.trim(),
        url: classLinkDraft.trim(),
        batch_id: attendanceForm.batch_id || null,
        sub_batch_id: attendanceForm.sub_batch_id || null
      };
      if (editingLinkId) {
        await academicAPI.updateClassLink(editingLinkId, payload);
      } else {
        await academicAPI.createClassLink(payload);
      }
      setNotice({ type: 'success', text: editingLinkId ? 'Class link updated.' : 'Class link saved.' });
      setClassLinkName('');
      setClassLinkDraft('');
      setEditingLinkId(null);
      await fetchClassLinks();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to save class link.' });
    }
  };

  const editClassLink = (link) => {
    setClassLinkName(link.name);
    setClassLinkDraft(link.url);
    setEditingLinkId(link.id);
    setOpenMenuId(null);
  };

  const deleteClassLink = async (linkId) => {
    try {
      await academicAPI.deleteClassLink(linkId);
      setNotice({ type: 'success', text: 'Class link deleted.' });
      if (String(editingLinkId) === String(linkId)) {
        setClassLinkName('');
        setClassLinkDraft('');
        setEditingLinkId(null);
      }
      setOpenMenuId(null);
      await fetchClassLinks();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to delete class link.' });
    }
  };

  const saveAttendance = async () => {
    try {
      setSavingAttendance(true);
      setNotice(null);
      let sessionId = selectedSessionId;
      if (!sessionId) {
        const response = await academicAPI.createAttendanceSession({
          ...attendanceForm,
          title: attendanceForm.title || 'Daily Attendance',
          batch_id: attendanceForm.batch_id || null,
          sub_batch_id: attendanceForm.sub_batch_id || null
        });
        sessionId = String(response.data.sessionId);
        setSelectedSessionId(sessionId);
      }
      const records = visibleStudents.map((student) => ({
        student_id: student.id,
        status: attendanceRecords[student.id]?.status || 'absent',
        remarks: attendanceRecords[student.id]?.remarks || ''
      }));
      await academicAPI.markAttendance(sessionId, records);
      setNotice({ type: 'success', text: 'Attendance saved.' });
      await fetchData();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Failed to save attendance.' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const normalizeName = (value) =>
    value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const applyLiveRoster = () => {
    if (!liveRosterText.trim()) return;
    const names = liveRosterText
      .split(/\r?\n|,/)
      .map((name) => {
        let cleanName = name.trim();
        cleanName = cleanName.replace(/^(You|Me)\s+/i, '');
        cleanName = cleanName.replace(/\s+\(host\)$/i, '');
        cleanName = cleanName.replace(/\s+\(you\)$/i, '');
        cleanName = cleanName.replace(/^\d+\.\s*/, '');
        cleanName = cleanName.replace(/^-\s*/, '');
        return cleanName;
      })
      .filter(Boolean);

    const matched = [];
    const unmatched = [];
    const nextRecords = { ...attendanceRecords };

    names.forEach((name) => {
      const normalized = normalizeName(name);
      const student = visibleStudents.find((item) => {
        const studentName = normalizeName(item.name);
        const emailName = normalizeName((item.email || '').split('@')[0]);
        return (
          studentName === normalized ||
          studentName.includes(normalized) ||
          normalized.includes(studentName) ||
          emailName === normalized ||
          (studentName.split(' ')[0] === normalized.split(' ')[0] && studentName.split(' ').length >= 2)
        );
      });
      if (student) {
        matched.push(student.name);
        nextRecords[student.id] = {
          ...nextRecords[student.id],
          status: 'present',
          remarks: `Auto-marked from Meet participants at ${new Date().toLocaleTimeString()}`
        };
      } else {
        unmatched.push(name);
      }
    });

    setAttendanceRecords(nextRecords);
    setMatchedNames([...new Set(matched)]);
    setUnmatchedNames([...new Set(unmatched)]);
    setNotice({
      type: matched.length > 0 ? 'success' : 'warning',
      text: matched.length > 0
        ? `✅ Marked ${matched.length} students present${unmatched.length > 0 ? ` (${unmatched.length} unmatched)` : ''}`
        : 'No matching students found in the participant list'
    });
  };

  const createAssessment = async (event) => {
    event.preventDefault();
    await academicAPI.createAssessment(assessmentForm);
    setAssessmentForm({ title: '', assessment_type: 'weekly', assessment_date: today, max_marks: 100, syllabus: '' });
    await fetchData();
  };

  const saveResults = async () => {
    if (!selectedAssessmentId) return;
    const assessment = assessments.find((item) => String(item.id) === String(selectedAssessmentId));
    const maxMarks = Number(assessment?.max_marks || 100);
    const results = students.map((student) => {
      const marks = Number(resultRecords[student.id]?.marks_obtained || 0);
      return {
        student_id: student.id,
        marks_obtained: marks,
        status: resultRecords[student.id]?.status || (marks >= maxMarks * 0.5 ? 'passed' : 'needs_improvement'),
        feedback: resultRecords[student.id]?.feedback || ''
      };
    });
    await academicAPI.recordAssessmentResults(selectedAssessmentId, results);
    await fetchData();
  };

  const attendanceRate = overview?.attendance?.total_marks
    ? Math.round((Number(overview.attendance.present_marks || 0) / Number(overview.attendance.total_marks)) * 100)
    : 0;

  /* ─── Tab Panels ─────────────────────────────────────────── */

  const renderOverview = () => (
    <div className="tab-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <CalendarCheck size={28} />
          <div><strong>{sessions.length}</strong><span>Attendance Sessions</span></div>
        </div>
        <div className="stat-card">
          <ClipboardCheck size={28} />
          <div><strong>{attendanceRate}%</strong><span>Attendance Rate</span></div>
        </div>
        <div className="stat-card">
          <FileBarChart size={28} />
          <div><strong>{assessments.length}</strong><span>Exams & Mocks</span></div>
        </div>
        <div className="stat-card">
          <Users size={28} />
          <div><strong>{students.length}</strong><span>Students Tracked</span></div>
        </div>
      </div>

      <div className="overview-cards">
        <div className="card info-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            {TABS.filter(t => t.id !== 'overview').map(tab => (
              <button key={tab.id} className="quick-action-btn" onClick={() => setActiveTab(tab.id)}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card info-card">
          <h3>Recent Sessions</h3>
          {sessions.length === 0 ? (
            <p className="empty-msg">No sessions yet.</p>
          ) : (
            <ul className="recent-list">
              {sessions.slice(0, 5).map(session => (
                <li key={session.id} className="recent-item">
                  <span className="recent-title">{session.title}</span>
                  <span className="recent-meta">{new Date(session.session_date).toLocaleDateString()} · {session.attendance_percentage || 0}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card info-card">
          <h3>Recent Assessments</h3>
          {assessments.length === 0 ? (
            <p className="empty-msg">No assessments yet.</p>
          ) : (
            <ul className="recent-list">
              {assessments.slice(0, 5).map(a => (
                <li key={a.id} className="recent-item">
                  <span className="recent-title">{a.title}</span>
                  <span className="recent-meta">{a.assessment_type} · {new Date(a.assessment_date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderAttendanceSetup = () => (
    <div className="tab-panel">
      <div className="form-card card">
        <h2 className="section-title">Today's Attendance Setup</h2>
        <p className="section-sub">Create a new session or select an existing one before marking attendance.</p>
        <form onSubmit={createAttendanceSession} className="form-grid">
          <div className="field-group">
            <label className="field-label">Session Title</label>
            <input className="form-control" required placeholder="e.g. Daily Attendance" value={attendanceForm.title} onChange={(e) => setAttendanceForm({ ...attendanceForm, title: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">Date</label>
            <input className="form-control" type="date" required value={attendanceForm.session_date} onChange={(e) => setAttendanceForm({ ...attendanceForm, session_date: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">Batch</label>
            <select className="form-control" value={attendanceForm.batch_id} onChange={(e) => setAttendanceForm({ ...attendanceForm, batch_id: e.target.value, sub_batch_id: '' })}>
              <option value="">All students / no batch filter</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Sub-batch</label>
            <select className="form-control" value={attendanceForm.sub_batch_id} onChange={(e) => setAttendanceForm({ ...attendanceForm, sub_batch_id: e.target.value })}>
              <option value="">Whole batch</option>
              {subBatchOptions.map((subBatch) => <option key={subBatch.id} value={subBatch.id}>{subBatch.name}</option>)}
            </select>
          </div>
          <div className="field-group full-width">
            <label className="field-label">Notes</label>
            <textarea className="form-control" rows="3" placeholder="Optional notes" value={attendanceForm.notes} onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })} />
          </div>
          <div className="form-actions full-width">
            <Button type="submit" className="btn-primary">Create Session</Button>
            <Button type="button" className="btn-secondary" onClick={() => setActiveTab('register')}>Go to Register →</Button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderOnlineClass = () => (
    <div className="tab-panel">
      <div className="card">
        <div className="panel-heading">
          <div>
            <h2 className="section-title"><MonitorPlay size={18} style={{ display: 'inline', marginRight: '0.4rem' }} />Online Class</h2>
            <p className="section-sub">Save class links as bookmarks, then click one to open.</p>
          </div>
          {activeClassUrl && (
            <a className="open-link-btn" href={activeClassUrl} target="_blank" rel="noopener noreferrer">
              Open <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div className="class-link-manager">
          <div className="class-link-form">
            <div className="field-group">
              <label className="field-label">Class Name</label>
              <input className="form-control" placeholder="e.g. React Morning" value={classLinkName} onChange={(e) => setClassLinkName(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Class Link</label>
              <input className="form-control" placeholder="Google Meet / class URL" value={classLinkDraft} onChange={(e) => setClassLinkDraft(e.target.value)} />
            </div>
            <div className="field-group link-btn-group">
              <label className="field-label">&nbsp;</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="button" className="btn-primary" onClick={saveClassLink}>{editingLinkId ? 'Update' : 'Save'}</Button>
                {editingLinkId && <Button type="button" className="btn-secondary" onClick={() => { setEditingLinkId(null); setClassLinkName(''); setClassLinkDraft(''); }}>Cancel</Button>}
              </div>
            </div>
          </div>

          <div className="class-bookmarks">
            {classLinks.map((link) => (
              <div key={link.id} className={`meet-bookmark ${activeClassUrl === link.url ? 'active' : ''}`}>
                <button type="button" className="meet-bookmark-main" onClick={() => setActiveClassUrl(link.url)}>
                  <span className="meet-logo" aria-hidden="true"><span className="meet-camera"></span></span>
                  <span className="meet-bookmark-name">{link.name}</span>
                </button>
                <button type="button" className="bookmark-menu-trigger" onClick={() => setOpenMenuId(openMenuId === link.id ? null : link.id)}>
                  <MoreVertical size={16} />
                </button>
                {openMenuId === link.id && (
                  <div className="bookmark-menu">
                    <button type="button" onClick={() => editClassLink(link)}><Pencil size={14} /> Update</button>
                    <button type="button" className="danger" onClick={() => deleteClassLink(link.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                )}
              </div>
            ))}
            {classLinks.length === 0 && legacyClassLink && (
              <div className={`meet-bookmark ${activeClassUrl === legacyClassLink ? 'active' : ''}`}>
                <button type="button" className="meet-bookmark-main" onClick={() => setActiveClassUrl(legacyClassLink)}>
                  <span className="meet-logo" aria-hidden="true"><span className="meet-camera"></span></span>
                  <span className="meet-bookmark-name">Saved batch link</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {activeClassUrl ? (
          <div className="meet-frame-wrap">
            <div className="meet-embed-warning">
              <div className="warning-content">
                <AlertCircle size={24} color="#f59e0b" />
                <h3>External Meeting Platform</h3>
                <p>Google Meet cannot be embedded due to security restrictions. Choose an option below:</p>
                <div className="meet-actions">
                  <a href={activeClassUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary large">
                    <ExternalLink size={18} /> Open Meeting in New Tab
                  </a>
                  <button onClick={() => window.open(activeClassUrl, '_blank', 'width=1200,height=700')} className="btn btn-secondary">
                    <MonitorPlay size={18} /> Open in Popup Window
                  </button>
                  <button onClick={() => { const proxyUrl = `/api/academic/proxy-meet?url=${encodeURIComponent(activeClassUrl)}`; window.open(proxyUrl, '_blank', 'width=1200,height=800'); }} className="btn btn-outline">
                    <ExternalLink size={18} /> Try Embedded View
                  </button>
                </div>
                <div className="meet-help">
                  <p><strong>Tip:</strong> Opening in a new tab gives the best experience.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-class-state">
            Select a batch/sub-batch, save a class bookmark, then click its Meet button.
          </div>
        )}
      </div>
    </div>
  );

  const renderRegister = () => (
    <div className="tab-panel">
      <div className="card">
        <div className="register-header">
          <div>
            <h2 className="section-title">Daily Attendance Register</h2>
            <p className="section-sub">Date: {new Date(attendanceForm.session_date).toLocaleDateString()} · Default status is absent.</p>
          </div>
          <div className="register-controls">
            <div className="date-filter-controls">
              <input type="date" className="form-control" value={dateFilter.startDate} onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })} />
              <input type="date" className="form-control" value={dateFilter.endDate} onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })} />
              <button type="button" className="btn btn-secondary" onClick={() => setDateFilter({ startDate: '', endDate: '' })}>Clear</button>
            </div>
            <select className="form-control" value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
              <option value="">New session for selected date</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title} - {new Date(session.session_date).toLocaleDateString()} ({session.attendance_percentage || 0}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="modern-table">
            <thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.name}</strong><span>{student.email}</span></td>
                  <td><span className="batch-cell">{student.sub_batch_name || student.batch_name || student.batch || 'Not assigned'}</span></td>
                  <td>
                    <select className={`attendance-select ${attendanceRecords[student.id]?.status || 'absent'}`} value={attendanceRecords[student.id]?.status || 'absent'} onChange={(e) => setAttendanceRecords({ ...attendanceRecords, [student.id]: { ...attendanceRecords[student.id], status: e.target.value } })}>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </td>
                  <td><input placeholder="Optional" value={attendanceRecords[student.id]?.remarks || ''} onChange={(e) => setAttendanceRecords({ ...attendanceRecords, [student.id]: { ...attendanceRecords[student.id], remarks: e.target.value } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="attendance-footer">
          <div className="attendance-counts">
            <span className="count-pill present">Present {attendanceSummary.present || 0}</span>
            <span className="count-pill absent">Absent {attendanceSummary.absent || 0}</span>
            <span className="count-pill late">Late {attendanceSummary.late || 0}</span>
            <span className="count-pill excused">Excused {attendanceSummary.excused || 0}</span>
            <span className="count-pill percentage">
              {visibleStudents.length > 0
                ? Math.round(((attendanceSummary.present || 0) + (attendanceSummary.late || 0)) / visibleStudents.length * 100)
                : 0}% Attendance
            </span>
          </div>
          <div className="attendance-actions">
            <Button onClick={() => { const next = {}; visibleStudents.forEach((s) => { next[s.id] = { status: 'present', remarks: attendanceRecords[s.id]?.remarks || '' }; }); setAttendanceRecords(next); }} className="btn-secondary">Mark All Present</Button>
            <Button onClick={() => { const next = {}; visibleStudents.forEach((s) => { next[s.id] = { status: 'absent', remarks: attendanceRecords[s.id]?.remarks || '' }; }); setAttendanceRecords(next); }} className="btn-secondary">Reset All Absent</Button>
            <Button onClick={saveAttendance} disabled={savingAttendance || loading || visibleStudents.length === 0} className="btn-success">
              <Save size={16} /> {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        {/* Live Roster Tool */}
        <div className="live-roster-tool">
          <h3>Extract Meet Participants Automatically</h3>
          <p>Use one of the methods below to get participant names from Google Meet, then paste them here.</p>
          <div className="meet-extraction-methods">
            <div className="method-card">
              <h4>Method 1: Bookmarklet (Recommended)</h4>
              <div className="method-steps">
                <ol>
                  <li>Create a bookmark named "Meet Extractor"</li>
                  <li>Copy code from <code>meetBookmarklet.js</code></li>
                  <li>Open Google Meet and click the bookmark</li>
                  <li>Click "Start Extraction" to monitor participants</li>
                  <li>Click "Stop &amp; Copy" when done, then paste below</li>
                </ol>
                <div className="bookmarklet-info">
                  <p><strong>File:</strong> <code>frontend/src/utils/meetBookmarklet.js</code></p>
                </div>
              </div>
            </div>
            <div className="method-card">
              <h4>Method 2: Browser Console</h4>
              <div className="method-steps">
                <ol>
                  <li>Open Google Meet and press F12</li>
                  <li>Go to the Console tab and paste this script:</li>
                </ol>
                <div className="console-code">
                  <code>{`const participants = new Set();
const interval = setInterval(() => {
  document.querySelectorAll('[data-participant-id], .zWfAib').forEach(el => {
    const name = el.textContent?.trim();
    if (name && name.length > 2) participants.add(name);
  });
  console.log('Found:', Array.from(participants));
}, 2000);
// Stop: clearInterval(interval);`}
                  </code>
                </div>
                <ol start="3">
                  <li>Run <code>clearInterval(interval)</code> to stop</li>
                  <li>Copy the output and paste below</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="roster-input-section">
            <textarea className="form-control" rows="5" placeholder="Paste extracted participant names here..." value={liveRosterText} onChange={(e) => setLiveRosterText(e.target.value)} />
            <div className="roster-actions">
              <Button className="btn-primary" onClick={applyLiveRoster} disabled={!liveRosterText.trim()}>
                <Users size={16} /> Mark Students Present
              </Button>
              <Button className="btn-secondary" onClick={() => { setLiveRosterText(''); setMatchedNames([]); setUnmatchedNames([]); }}>Clear</Button>
            </div>
          </div>
          {(matchedNames.length > 0 || unmatchedNames.length > 0) && (
            <div className="match-results">
              <div className="result-section">
                <h4>✅ Matched Students ({matchedNames.length})</h4>
                <div className="matched-list">{matchedNames.map((name, i) => <span key={i} className="matched-name">{name}</span>)}</div>
              </div>
              {unmatchedNames.length > 0 && (
                <div className="result-section">
                  <h4>⚠️ Unmatched Names ({unmatchedNames.length})</h4>
                  <div className="unmatched-list">{unmatchedNames.map((name, i) => <span key={i} className="unmatched-name">{name}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAssessments = () => (
    <div className="tab-panel">
      <div className="form-card card">
        <h2 className="section-title">Create Weekly Exam / Mock</h2>
        <p className="section-sub">Add a new assessment that is not tied to any single batch.</p>
        <form onSubmit={createAssessment} className="form-grid">
          <div className="field-group full-width">
            <label className="field-label">Assessment Title</label>
            <input className="form-control" required placeholder="e.g. Week 3 JavaScript Test" value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">Type</label>
            <select className="form-control" value={assessmentForm.assessment_type} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })}>
              <option value="weekly">Weekly Exam</option>
              <option value="mock">Mock Interview / Test</option>
              <option value="practice">Practice Test</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Date</label>
            <input className="form-control" type="date" required value={assessmentForm.assessment_date} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })} />
          </div>
          <div className="field-group">
            <label className="field-label">Max Marks</label>
            <input className="form-control" type="number" min="1" value={assessmentForm.max_marks} onChange={(e) => setAssessmentForm({ ...assessmentForm, max_marks: e.target.value })} />
          </div>
          <div className="field-group full-width">
            <label className="field-label">Syllabus / Focus Areas</label>
            <textarea className="form-control" rows="3" placeholder="Topics covered..." value={assessmentForm.syllabus} onChange={(e) => setAssessmentForm({ ...assessmentForm, syllabus: e.target.value })} />
          </div>
          <div className="form-actions full-width">
            <Button type="submit" className="btn-primary">Create Assessment</Button>
          </div>
        </form>

        {assessments.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '0.75rem' }}>All Assessments</h3>
            <div className="table-wrapper">
              <table className="modern-table">
                <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Max Marks</th></tr></thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong></td>
                      <td><span>{a.assessment_type}</span></td>
                      <td><span>{new Date(a.assessment_date).toLocaleDateString()}</span></td>
                      <td><span>{a.max_marks}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderScores = () => (
    <div className="tab-panel">
      <div className="card">
        <div className="panel-heading">
          <div>
            <h2 className="section-title">Record Exam Scores</h2>
            <p className="section-sub">Select an assessment and enter marks for each student.</p>
          </div>
          <select className="form-control" style={{ maxWidth: '320px' }} value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)}>
            <option value="">Select assessment</option>
            {assessments.map((a) => <option key={a.id} value={a.id}>{a.title} - {a.assessment_type}</option>)}
          </select>
        </div>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead><tr><th>Student</th><th>Marks</th><th>Status</th><th>Feedback</th></tr></thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.name}</strong><span>{student.email}</span></td>
                  <td><input type="number" min="0" value={resultRecords[student.id]?.marks_obtained || ''} onChange={(e) => setResultRecords({ ...resultRecords, [student.id]: { ...resultRecords[student.id], marks_obtained: e.target.value } })} /></td>
                  <td>
                    <select value={resultRecords[student.id]?.status || 'needs_improvement'} onChange={(e) => setResultRecords({ ...resultRecords, [student.id]: { ...resultRecords[student.id], status: e.target.value } })}>
                      <option value="passed">Passed</option>
                      <option value="needs_improvement">Needs Improvement</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                  <td><input placeholder="Optional feedback" value={resultRecords[student.id]?.feedback || ''} onChange={(e) => setResultRecords({ ...resultRecords, [student.id]: { ...resultRecords[student.id], feedback: e.target.value } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Button onClick={saveResults} disabled={!selectedAssessmentId || loading} className="btn-success">
            <Save size={16} /> Save Scores
          </Button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'attendance': return renderAttendanceSetup();
      case 'online': return renderOnlineClass();
      case 'register': return renderRegister();
      case 'assessment': return renderAssessments();
      case 'scores': return renderScores();
      default: return renderOverview();
    }
  };

  return (
    <div className="academic-ops-page fade-in">
      {/* Page Header */}
      <header className="page-header">
        <div className="container header-row">
          <div>
            <span className="badge badge-primary">Academic Control</span>
            <h1>Attendance &amp; Weekly Assessments</h1>
            <p>Manage batches, attendance, weekly exams, and mock performance all in one place.</p>
          </div>
        </div>
      </header>

      {/* Tab Navbar */}
      <nav className="tab-nav">
        <div className="container tab-nav-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container ops-content">
        {notice && (
          <div className={`notice ${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
          </div>
        )}
        {loading ? (
          <div className="loading-state">Loading academic data…</div>
        ) : (
          renderTabContent()
        )}
      </main>

      <style>{`
        /* ── Base ── */
        .academic-ops-page { min-height: 100vh; background: #f8fafc; padding-bottom: 4rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }

        /* ── Header ── */
        .page-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 2.5rem 0 1.5rem; }
        .header-row { display: flex; align-items: flex-start; gap: 1rem; }
        .page-header h1 { font-size: 1.75rem; color: #0f172a; margin: 0.4rem 0 0.3rem; }
        .page-header p { color: #64748b; margin: 0; max-width: 680px; font-size: 0.9rem; }
        .badge { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #ede9fe; color: #6d28d9; }

        /* ── Tab Nav ── */
        .tab-nav { background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 20; }
        .tab-nav-inner { display: flex; align-items: stretch; gap: 0; overflow-x: auto; }
        .tab-btn { display: flex; align-items: center; gap: 0.45rem; padding: 0.9rem 1.1rem; border: none; background: transparent; color: #64748b; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s; }
        .tab-btn:hover { color: #0f172a; background: #f8fafc; }
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; background: transparent; }
        .tab-btn svg { flex-shrink: 0; }

        /* ── Content Area ── */
        .ops-content { padding-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .tab-panel { display: flex; flex-direction: column; gap: 1.25rem; }
        .loading-state { text-align: center; padding: 3rem; color: #64748b; font-size: 0.95rem; }

        /* ── Notice ── */
        .notice { display: flex; align-items: center; gap: 0.75rem; border-radius: 8px; padding: 0.85rem 1rem; font-weight: 700; }
        .notice.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .notice.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .notice.warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

        /* ── Cards ── */
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.5rem; }
        .form-card { max-width: 760px; }
        .section-title { font-size: 1.1rem; color: #0f172a; margin: 0 0 0.25rem; font-weight: 700; }
        .section-sub { color: #64748b; font-size: 0.85rem; margin: 0 0 1.25rem; }

        /* ── Stats Grid ── */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
        .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem 1rem; display: flex; gap: 0.85rem; align-items: center; }
        .stat-card svg { color: #4f46e5; flex-shrink: 0; }
        .stat-card strong { display: block; font-size: 1.4rem; color: #0f172a; font-weight: 800; }
        .stat-card span { color: #64748b; font-size: 0.8rem; }

        /* ── Overview ── */
        .overview-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .info-card h3 { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 0.75rem; }
        .quick-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .quick-action-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; color: #334155; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background 0.12s; }
        .quick-action-btn:hover { background: #ede9fe; border-color: #a5b4fc; color: #4f46e5; }
        .recent-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .recent-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 6px; gap: 1rem; }
        .recent-title { font-size: 0.85rem; color: #0f172a; font-weight: 600; }
        .recent-meta { font-size: 0.75rem; color: #64748b; white-space: nowrap; }
        .empty-msg { color: #94a3b8; font-size: 0.85rem; margin: 0; }

        /* ── Form Grid ── */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .field-group.full-width { grid-column: 1 / -1; }
        .field-label { font-size: 0.8rem; font-weight: 700; color: #475569; }
        .form-control { border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.55rem 0.75rem; font-size: 0.875rem; background: #fff; width: 100%; box-sizing: border-box; }
        .form-control:focus { outline: none; border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-actions { display: flex; gap: 0.75rem; }

        /* ── Panel Heading ── */
        .panel-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }

        /* ── Register ── */
        .register-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .register-controls { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
        .date-filter-controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

        /* ── Table ── */
        .table-wrapper { overflow-x: auto; max-height: 460px; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; background: #f8fafc; color: #64748b; font-size: 0.75rem; text-transform: uppercase; padding: 0.75rem 1rem; position: sticky; top: 0; }
        .modern-table td { border-top: 1px solid #eef2f7; padding: 0.7rem 1rem; vertical-align: middle; }
        .modern-table td span { display: block; color: #64748b; font-size: 0.75rem; }
        .modern-table select, .modern-table input { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.45rem 0.5rem; background: #fff; }
        .batch-cell { color: #475569 !important; font-weight: 700; }
        .attendance-select.absent { border-color: #fecaca; background: #fef2f2; color: #991b1b; font-weight: 800; }
        .attendance-select.present { border-color: #bbf7d0; background: #f0fdf4; color: #166534; font-weight: 800; }
        .attendance-select.late { border-color: #fde68a; background: #fffbeb; color: #92400e; font-weight: 800; }

        /* ── Attendance Footer ── */
        .attendance-footer { border-top: 1px solid #eef2f7; padding-top: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; }
        .attendance-counts { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .count-pill { border-radius: 999px; padding: 0.35rem 0.7rem; font-size: 0.8rem; font-weight: 900; }
        .count-pill.present { background: #dcfce7; color: #166534; }
        .count-pill.absent { background: #fee2e2; color: #991b1b; }
        .count-pill.late { background: #fef3c7; color: #92400e; }
        .count-pill.excused { background: #e0f2fe; color: #075985; }
        .count-pill.percentage { background: #f3f4f6; color: #374151; border: 2px solid #d1d5db; }
        .attendance-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }

        /* ── Live Roster ── */
        .live-roster-tool { margin-top: 1.5rem; border-top: 1px solid #eef2f7; padding-top: 1.25rem; }
        .live-roster-tool h3 { font-size: 1rem; color: #0f172a; margin: 0 0 0.25rem; font-weight: 700; }
        .live-roster-tool p { color: #64748b; font-size: 0.85rem; margin: 0 0 1rem; }
        .meet-extraction-methods { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        .method-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; }
        .method-card h4 { margin: 0 0 0.5rem; color: #1e293b; font-size: 0.875rem; font-weight: 700; }
        .method-steps ol { margin: 0.5rem 0; padding-left: 1.2rem; color: #64748b; font-size: 0.82rem; line-height: 1.5; }
        .method-steps li { margin-bottom: 0.3rem; }
        .bookmarklet-info { background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 6px; padding: 0.6rem 0.75rem; margin-top: 0.5rem; }
        .bookmarklet-info p { margin: 0; color: #0c4a6e; font-size: 0.8rem; }
        .bookmarklet-info code, .method-steps code { background: #f0f9ff; padding: 2px 5px; border-radius: 3px; color: #075985; font-size: 0.78rem; }
        .console-code { background: #1e293b; color: #e2e8f0; padding: 0.75rem; border-radius: 6px; margin: 0.5rem 0; font-size: 0.75rem; font-family: 'Courier New', monospace; word-break: break-all; max-height: 130px; overflow-y: auto; white-space: pre; }
        .console-code code { color: #10b981; }
        .roster-input-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; }
        .roster-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
        .match-results { margin-top: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
        .result-section { margin-bottom: 0.75rem; }
        .result-section:last-child { margin-bottom: 0; }
        .result-section h4 { margin: 0 0 0.6rem; color: #374151; font-size: 0.9rem; font-weight: 600; }
        .matched-list, .unmatched-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .matched-name { background: #dcfce7; color: #166534; padding: 0.3rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
        .unmatched-name { background: #fef3c7; color: #92400e; padding: 0.3rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }

        /* ── Online Class ── */
        .open-link-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.85rem; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #0f172a; font-weight: 800; background: #fff; font-size: 0.85rem; }
        .class-link-manager { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem; }
        .class-link-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.75rem; align-items: end; }
        .link-btn-group { }
        .class-bookmarks { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .meet-bookmark { position: relative; width: 110px; min-height: 95px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,0.05); }
        .meet-bookmark.active { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.12); }
        .meet-bookmark-main { width: 100%; min-height: 93px; border: 0; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 0.5rem; color: #0f172a; }
        .meet-logo { width: 38px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #10b981 0 50%, #f59e0b 50% 100%); position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .meet-logo::before { content: ''; position: absolute; left: 5px; top: 6px; width: 20px; height: 16px; border-radius: 4px; background: #fff; }
        .meet-logo::after { content: ''; position: absolute; right: -6px; top: 8px; border-left: 10px solid #3b82f6; border-top: 6px solid transparent; border-bottom: 6px solid transparent; }
        .meet-camera { position: absolute; left: 10px; top: 10px; width: 10px; height: 7px; border-radius: 2px; background: #22c55e; z-index: 1; }
        .meet-bookmark-name { width: 100%; color: #334155; font-size: 0.75rem; font-weight: 900; line-height: 1.1; text-align: center; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .bookmark-menu-trigger { position: absolute; top: 0.25rem; right: 0.25rem; width: 22px; height: 22px; border: 0; border-radius: 4px; background: rgba(248,250,252,0.92); color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .bookmark-menu-trigger:hover { background: #e2e8f0; }
        .bookmark-menu { position: absolute; top: 1.5rem; right: 0.25rem; min-width: 110px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 8px 16px rgba(15,23,42,0.12); padding: 0.25rem; z-index: 10; }
        .bookmark-menu button { width: 100%; border: 0; background: transparent; color: #334155; display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.5rem; border-radius: 4px; cursor: pointer; font-weight: 800; font-size: 0.75rem; }
        .bookmark-menu button:hover { background: #f1f5f9; }
        .bookmark-menu button.danger { color: #b91c1c; }
        .meet-frame-wrap { height: 340px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; }
        .meet-embed-warning { height: 100%; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .warning-content { text-align: center; max-width: 360px; }
        .warning-content h3 { margin: 0.75rem 0 0.5rem; color: #0f172a; font-size: 1rem; }
        .warning-content p { color: #64748b; margin-bottom: 1rem; line-height: 1.5; font-size: 0.875rem; }
        .meet-actions { display: flex; flex-direction: column; gap: 0.5rem; }
        .meet-actions .btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
        .meet-actions .btn.large { font-size: 0.95rem; }
        .meet-actions .btn-outline { background: transparent; border: 2px solid #d1d5db; color: #374151; }
        .meet-actions .btn-outline:hover { background: #f9fafb; }
        .meet-help { margin-top: 0.75rem; padding: 0.6rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; }
        .meet-help p { margin: 0; color: #0c4a6e; font-size: 0.8rem; line-height: 1.4; }
        .empty-class-state { min-height: 200px; display: flex; align-items: center; justify-content: center; text-align: center; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 2rem; font-size: 0.875rem; }

        /* ── Buttons (used outside Button component) ── */
        .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; border: none; }
        .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
        .btn-secondary:hover { background: #e2e8f0; }

        /* ── Animations ── */
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .form-grid { grid-template-columns: 1fr; }
          .field-group.full-width { grid-column: 1; }
          .class-link-form { grid-template-columns: 1fr; }
          .meet-extraction-methods { grid-template-columns: 1fr; }
          .overview-cards { grid-template-columns: 1fr; }
          .register-header { flex-direction: column; }
          .register-controls { align-items: flex-start; width: 100%; }
          .attendance-footer { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 640px) {
          .tab-btn span { display: none; }
          .tab-btn { padding: 0.9rem 0.85rem; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .page-header h1 { font-size: 1.35rem; }
        }
      `}</style>
    </div>
  );
};

export default AcademicOperations;