import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  Calendar, Plus, Users, Mail, CheckCircle, Clock, 
  ExternalLink, Copy, Check, Shield, Search, Send,
  CheckCheck, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function AssignmentsView({ preselectedPaper = null, onClearPreselectedPaper, courseId, courseSlug }) {
  const [assignments, setAssignments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedPaper);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [copiedOtpId, setCopiedOtpId] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [sendingCandidateId, setSendingCandidateId] = useState(null);

  // Create Assignment form
  const [form, setForm] = useState({
    paperVersionId: preselectedPaper ? preselectedPaper.id : '',
    batchId: '',
    title: preselectedPaper ? `${preselectedPaper.title} - Batch Evaluation` : '',
    durationMinutes: preselectedPaper ? preselectedPaper.duration_minutes : 60,
    totalMarks: preselectedPaper ? preselectedPaper.total_marks : 100,
    passMarks: 40
  });

  const [batchStudentsCount, setBatchStudentsCount] = useState(null);

  useEffect(() => {
    loadData();
  }, [courseId, courseSlug]);

  useEffect(() => {
    if (preselectedPaper) {
      setForm(prev => ({
        ...prev,
        paperVersionId: preselectedPaper.id,
        title: `${preselectedPaper.title} - Assessment`,
        durationMinutes: preselectedPaper.duration_minutes || 60,
        totalMarks: preselectedPaper.total_marks || 100
      }));
      setShowCreateModal(true);
    }
  }, [preselectedPaper]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignList, batchList, paperList] = await Promise.all([
        api.assignments.list({ courseId, courseSlug }),
        api.stage.listBatches({ courseId, courseSlug }),
        api.papers.list({ status: 'READY', courseId })
      ]);
      setAssignments(assignList);
      setBatches(batchList);
      setPapers(paperList);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = async (bId) => {
    setForm(prev => ({ ...prev, batchId: bId }));
    if (!bId) {
      setBatchStudentsCount(null);
      return;
    }
    try {
      const students = await api.stage.listStudentsByBatch(bId);
      setBatchStudentsCount(students.length);
    } catch (e) {
      setBatchStudentsCount(0);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!form.batchId || !form.paperVersionId) {
      alert('Please select both a Paper and a Batch.');
      return;
    }

    try {
      const res = await api.assignments.create(form);
      alert(`Assignment created successfully with ${res.candidateCount} candidate records snapshotted and unique OTPs generated!`);
      setShowCreateModal(false);
      if (onClearPreselectedPaper) onClearPreselectedPaper();
      loadData();
    } catch (err) {
      alert(`Error creating assignment: ${err.message}`);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const details = await api.assignments.getById(id);
      setSelectedAssignment(details);
    } catch (err) {
      alert(`Error loading assignment: ${err.message}`);
    }
  };

  const handleSendExamEmails = async (assignmentId) => {
    if (!confirm('This will queue official exam invitation emails (with unique student OTPs) to all candidates. Proceed?')) return;
    setEmailSending(true);
    try {
      const res = await api.emailQueue.sendExamEmails(assignmentId);
      alert(`Queued ${res.queuedCount} invitation emails for dispatch via SMTP Queue!`);
      // Refresh assignment view
      handleViewDetails(assignmentId);
      loadData();
    } catch (err) {
      alert(`Failed queueing emails: ${err.message}`);
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendIndividualEmail = async (candidateId, candidateName) => {
    setSendingCandidateId(candidateId);
    try {
      await api.emailQueue.sendCandidateEmail(candidateId);
      if (selectedAssignment) {
        const details = await api.assignments.getById(selectedAssignment.id);
        setSelectedAssignment(details);
      }
      alert(`Invitation email queued for ${candidateName}!`);
    } catch (err) {
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setSendingCandidateId(null);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedOtpId(id);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', margin: 0 }}>Exam Assignments</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Reusable papers assigned to Stage DB batches with immutable candidate snapshots
          </span>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ gap: '8px' }}>
          <Plus size={18} />
          Create Exam Assignment
        </button>
      </div>

      {/* Assignments Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No assignments yet. Click "Create Exam Assignment" to bind a paper to a batch.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Assignment Title</th>
                  <th>Paper</th>
                  <th>Stage DB Batch</th>
                  <th>Candidates</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td>
                      <code style={{ color: 'var(--text-accent)', fontWeight: 'bold' }}>{a.assignment_code}</code>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td>{a.paper_title} (v{a.version_number})</td>
                    <td>{a.batch_name}</td>
                    <td>
                      <span className="badge badge-primary">{a.candidate_count || 0} Students</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{a.submitted_count || 0} Submitted</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        a.status === 'ACTIVE' ? 'badge-primary' :
                        a.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleViewDetails(a.id)} className="btn btn-secondary btn-sm">
                          Candidates & Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Assign Question Paper to Batch</h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  if (onClearPreselectedPaper) onClearPreselectedPaper();
                }} 
                className="btn btn-ghost btn-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Assignment Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Python Core Assessment - Batch 25"
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Select Paper Version *</label>
                    <select
                      value={form.paperVersionId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        const p = papers.find(x => x.id === parseInt(pId, 10));
                        setForm(prev => ({
                          ...prev,
                          paperVersionId: pId,
                          durationMinutes: p?.duration_minutes || prev.durationMinutes,
                          totalMarks: p?.total_marks || prev.totalMarks
                        }));
                      }}
                      className="select"
                      required
                    >
                      <option value="">-- Choose Ready Paper --</option>
                      {papers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} (v{p.latest_version || 1})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Select Stage DB Batch *</label>
                    <select
                      value={form.batchId}
                      onChange={(e) => handleBatchSelect(e.target.value)}
                      className="select"
                      required
                    >
                      <option value="">-- Choose Batch --</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.course_name || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {batchStudentsCount !== null && (
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} />
                    <span><strong>{batchStudentsCount}</strong> active students found in this batch will be registered as candidates.</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Duration (Mins)</label>
                    <input
                      type="number"
                      value={form.durationMinutes}
                      onChange={(e) => setForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Total Marks</label>
                    <input
                      type="number"
                      value={form.totalMarks}
                      onChange={(e) => setForm(prev => ({ ...prev, totalMarks: parseFloat(e.target.value) }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Passing Marks</label>
                    <input
                      type="number"
                      value={form.passMarks}
                      onChange={(e) => setForm(prev => ({ ...prev, passMarks: parseFloat(e.target.value) }))}
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateModal(false);
                    if (onClearPreselectedPaper) onClearPreselectedPaper();
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Assignment & Snapshot Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNMENT DETAILS & CANDIDATE ROSTER MODAL */}
      {selectedAssignment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '950px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>{selectedAssignment.title}</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Code: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedAssignment.assignment_code}</code> | Batch: {selectedAssignment.batch_name}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleSendExamEmails(selectedAssignment.id)} 
                  disabled={emailSending}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Send size={15} />
                  {emailSending ? 'Queueing...' : 'Send Mails to All'}
                </button>
                <button onClick={() => setSelectedAssignment(null)} className="btn btn-ghost btn-sm">&times;</button>
              </div>
            </div>

            <div className="modal-body">
              {/* Student exam link */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Common Candidate Exam URL: </span>
                  <a href={`/exam/${selectedAssignment.assignment_code}`} target="_blank" rel="noreferrer" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                    {window.location.origin}/exam/{selectedAssignment.assignment_code}
                  </a>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/exam/${selectedAssignment.assignment_code}`, 'url')} 
                  className="btn btn-secondary btn-sm"
                >
                  {copiedOtpId === 'url' ? 'Copied URL!' : 'Copy URL'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '15px', margin: 0 }}>
                  Candidate Roster ({selectedAssignment.candidates?.length || 0} Students)
                </h4>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Track individual mail reception status & send invitation mail to specific students
                </span>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Email</th>
                      <th>Exam Passcode (OTP)</th>
                      <th>Mail Delivery Status</th>
                      <th>Exam Status</th>
                      <th>Violations</th>
                      <th>Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedAssignment.candidates || []).map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.snapshot_student_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {c.student_id}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.snapshot_student_email}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <code style={{ fontSize: '14px', letterSpacing: '2px', color: 'var(--text-accent)', fontWeight: 'bold' }}>
                              {c.otp || '••••••'}
                            </code>
                            {c.otp && (
                              <button 
                                onClick={() => copyToClipboard(c.otp, c.id)} 
                                className="btn btn-ghost btn-sm"
                                title="Copy OTP for student"
                                style={{ padding: '2px 6px' }}
                              >
                                {copiedOtpId === c.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                        {/* Live Email Delivery Tracking Status */}
                        <td>
                          {c.mail_status === 'OPENED' ? (
                            <div>
                              <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                                <CheckCheck size={13} /> Opened / Read
                              </span>
                              {c.mail_opened_at && (
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                  {new Date(c.mail_opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : c.mail_status === 'REACHED' ? (
                            <div>
                              <span className="badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                                <CheckCircle2 size={13} /> Reached / Delivered
                              </span>
                              {c.mail_sent_at && (
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                  {new Date(c.mail_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          ) : c.mail_status === 'ON_THE_WAY' ? (
                            <div>
                              <span className="badge" style={{ background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
                                <Clock size={13} /> On the way
                              </span>
                              <div style={{ fontSize: '10px', color: '#854d0e', marginTop: '2px' }}>In SMTP Queue</div>
                            </div>
                          ) : c.mail_status === 'FAILED' ? (
                            <div>
                              <span className="badge" title={c.mail_last_error || 'Delivery failed'} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, cursor: 'help' }}>
                                <AlertCircle size={13} /> Not Reached
                              </span>
                              {c.mail_last_error && (
                                <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.mail_last_error}>
                                  {c.mail_last_error}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="badge" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                              <Mail size={12} /> Not Sent
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            c.candidate_status === 'EVALUATED' ? 'badge-success' :
                            c.candidate_status === 'SUBMITTED' ? 'badge-primary' :
                            c.candidate_status === 'AUTO_SUBMITTED' ? 'badge-danger' :
                            c.candidate_status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-muted'
                          }`}>
                            {c.candidate_status}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: c.violation_count > 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                            {c.violation_count || 0} / 3
                          </span>
                        </td>
                        <td>
                          <strong>{c.total_marks_awarded !== null ? `${c.total_marks_awarded} pts` : 'Pending'}</strong>
                        </td>
                        {/* Individual Candidate Mail Send Action */}
                        <td>
                          <button 
                            onClick={() => handleSendIndividualEmail(c.id, c.snapshot_student_name)} 
                            disabled={sendingCandidateId === c.id}
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              padding: '5px 12px', 
                              fontSize: '12px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              whiteSpace: 'nowrap',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            <Mail size={13} color="var(--primary)" />
                            {sendingCandidateId === c.id 
                              ? 'Sending...' 
                              : (['REACHED', 'OPENED', 'FAILED'].includes(c.mail_status) ? 'Resend Mail' : 'Send Mail')
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedAssignment(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
