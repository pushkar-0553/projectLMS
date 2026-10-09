import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  BarChart3, Download, ShieldAlert, Award, 
  TrendingUp, Users, CheckCircle, XCircle
} from 'lucide-react';

export default function ReportsView({ courseId, courseSlug }) {
  const [activeTab, setActiveTab] = useState('ASSIGNMENT_REPORT'); // 'ASSIGNMENT_REPORT' | 'SECURITY_REPORT'
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [securityData, setSecurityData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [courseId, courseSlug]);

  useEffect(() => {
    if (selectedAssignmentId && activeTab === 'ASSIGNMENT_REPORT') {
      loadAssignmentReport(selectedAssignmentId);
    }
    if (activeTab === 'SECURITY_REPORT') {
      loadSecurityViolations();
    }
  }, [selectedAssignmentId, activeTab]);

  const loadAssignments = async () => {
    try {
      const list = await api.assignments.list({ courseId, courseSlug });
      setAssignments(list);
      if (list.length > 0) {
        setSelectedAssignmentId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  const loadAssignmentReport = async (id) => {
    setLoading(true);
    try {
      const data = await api.reports.getAssignmentReport(id);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load assignment report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityViolations = async () => {
    setLoading(true);
    try {
      const data = await api.reports.getSecurityViolations();
      setSecurityData(data);
    } catch (err) {
      console.error('Failed to load security violations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('ASSIGNMENT_REPORT')} 
            className={`btn ${activeTab === 'ASSIGNMENT_REPORT' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BarChart3 size={16} />
            Exam Results Report
          </button>
          <button 
            onClick={() => setActiveTab('SECURITY_REPORT')} 
            className={`btn ${activeTab === 'SECURITY_REPORT' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ShieldAlert size={16} />
            Security Violations Audit
          </button>
        </div>

        {activeTab === 'ASSIGNMENT_REPORT' && selectedAssignmentId && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="select"
              style={{ width: '260px' }}
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.batch_name})
                </option>
              ))}
            </select>

            <a 
              href={api.reports.getCsvUrl(selectedAssignmentId)} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary"
              style={{ gap: '6px' }}
            >
              <Download size={16} />
              Export CSV
            </a>
          </div>
        )}
      </div>

      {/* 1. EXAM ASSIGNMENT REPORT TAB */}
      {activeTab === 'ASSIGNMENT_REPORT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Computing statistics...</div>
          ) : reportData ? (
            <>
              {/* Analytics KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card" style={{ padding: '18px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Score</span>
                  <h3 style={{ fontSize: '26px', color: 'var(--primary)', marginTop: '4px' }}>
                    {reportData.stats?.avgScore} pts
                  </h3>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pass Rate</span>
                  <h3 style={{ fontSize: '26px', color: 'var(--success)', marginTop: '4px' }}>
                    {reportData.stats?.passRate}%
                  </h3>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Highest Score</span>
                  <h3 style={{ fontSize: '26px', color: 'var(--secondary)', marginTop: '4px' }}>
                    {reportData.stats?.highestScore} pts
                  </h3>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Evaluated</span>
                  <h3 style={{ fontSize: '26px', color: 'var(--warning)', marginTop: '4px' }}>
                    {reportData.stats?.evaluatedCount} / {reportData.stats?.totalCandidates}
                  </h3>
                </div>
              </div>

              {/* Candidates Ranked Table */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px' }}>Performance Roster</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ranked by percentage
                  </span>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Score Awarded</th>
                        <th>Percentage</th>
                        <th>Result</th>
                        <th>Violations</th>
                        <th>Submission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.candidates || []).map((c, idx) => (
                        <tr key={c.candidate_id}>
                          <td>
                            <strong>#{idx + 1}</strong>
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.student_name}</td>
                          <td>{c.student_email}</td>
                          <td>
                            <strong>{c.total_marks_awarded !== null ? `${c.total_marks_awarded} / ${c.total_marks_possible}` : 'Pending'}</strong>
                          </td>
                          <td>
                            <span style={{ fontWeight: 'bold', color: c.percentage >= 60 ? 'var(--success)' : 'var(--text-primary)' }}>
                              {c.percentage !== null ? `${c.percentage}%` : '—'}
                            </span>
                          </td>
                          <td>
                            {c.total_marks_awarded !== null ? (
                              <span className={`badge ${c.is_passed ? 'badge-success' : 'badge-danger'}`}>
                                {c.is_passed ? 'PASSED' : 'FAILED'}
                              </span>
                            ) : (
                              <span className="badge badge-muted">UNGRADED</span>
                            )}
                          </td>
                          <td>
                            <span style={{ color: c.violation_count > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {c.violation_count || 0}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {c.submission_type || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Select an exam assignment to view reports.
            </div>
          )}
        </div>
      )}

      {/* 2. SECURITY VIOLATIONS AUDIT TAB */}
      {activeTab === 'SECURITY_REPORT' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px' }}>Security Violations Log</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time audit of fullscreen exits, tab switches, and auto-submissions
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading security records...</div>
          ) : securityData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No security violations recorded across all active sessions.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Candidate</th>
                    <th>Assignment</th>
                    <th>Violation Type</th>
                    <th>Sequence</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {securityData.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(v.recorded_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{v.student_name}</td>
                      <td>{v.assignment_title}</td>
                      <td>
                        <span className="badge badge-danger">{v.violation_type}</span>
                      </td>
                      <td>
                        <strong>{v.violation_sequence} of 3</strong>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {v.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
