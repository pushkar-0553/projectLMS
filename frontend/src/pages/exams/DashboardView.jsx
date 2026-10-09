import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  FileText, Calendar, CheckSquare, Mail, Database, 
  ArrowUpRight, Users, Clock, PlusCircle
} from 'lucide-react';

export default function DashboardView({ onNavigate, courseId, courseSlug }) {
  const [stats, setStats] = useState({
    papersCount: 0,
    assignmentsCount: 0,
    pendingEvaluations: 0,
    emailQueueCount: 0,
    activeBatchesCount: 0
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [courseId, courseSlug]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [papers, assignments, batches, queueStatus] = await Promise.all([
        api.papers.list({ courseId }).catch(() => []),
        api.assignments.list({ courseId, courseSlug }).catch(() => []),
        api.stage.listBatches({ courseId, courseSlug }).catch(() => []),
        api.emailQueue.getStatus().catch(() => ({ stats: {} }))
      ]);

      const pendingEvals = assignments.reduce((acc, a) => acc + (a.submitted_count || 0), 0);

      setStats({
        papersCount: papers.length,
        assignmentsCount: assignments.length,
        pendingEvaluations: pendingEvals,
        emailQueueCount: queueStatus.stats?.QUEUED || 0,
        activeBatchesCount: batches.length
      });

      setRecentAssignments(assignments.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading system metrics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Metric Stat Cards (Matching LMS Resume Hub Style) */}
      <div className="grid grid-cols-4 gap-4">
        <div className="exam-stat-card" style={{ borderLeftColor: '#4f46e5' }}>
          <span className="stat-label">Master Papers</span>
          <span className="stat-value">{stats.papersCount}</span>
        </div>

        <div className="exam-stat-card" style={{ borderLeftColor: '#0ea5e9' }}>
          <span className="stat-label">Exam Assignments</span>
          <span className="stat-value">{stats.assignmentsCount}</span>
        </div>

        <div className="exam-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <span className="stat-label">Submissions</span>
          <span className="stat-value">{stats.pendingEvaluations}</span>
        </div>

        <div className="exam-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="stat-label">Course Batches</span>
          <span className="stat-value">{stats.activeBatchesCount}</span>
        </div>
      </div>

      {/* 2. Quick Operations Card */}
      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: '#1e293b' }}>
          Quick Examination Operations
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('papers')} className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            Create Question Paper
          </button>
          <button onClick={() => onNavigate('assignments')} className="btn btn-secondary btn-sm">
            <Calendar size={16} />
            Assign Paper to Batch
          </button>
          <button onClick={() => onNavigate('email-center')} className="btn btn-secondary btn-sm">
            <Mail size={16} />
            Email &amp; SMTP Settings
          </button>
          <button onClick={() => onNavigate('evaluation')} className="btn btn-secondary btn-sm">
            <CheckSquare size={16} />
            Evaluate Candidates
          </button>
        </div>
      </div>

      {/* 3. Recent Assignments Table */}
      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Recent Course Exam Assignments
          </h3>
          <button onClick={() => onNavigate('assignments')} className="btn btn-ghost btn-sm" style={{ gap: '6px' }}>
            <span>View All</span>
            <ArrowUpRight size={15} />
          </button>
        </div>

        {recentAssignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', fontSize: '13px' }}>
            No exam assignments created yet for this course. Click "Assign Paper to Batch" to begin.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Batch</th>
                  <th>Duration</th>
                  <th>Candidates</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map(a => (
                  <tr key={a.id}>
                    <td>
                      <code style={{ color: '#4f46e5', fontWeight: 700, background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {a.assignment_code}
                      </code>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{a.title}</td>
                    <td>{a.batch_name}</td>
                    <td>{a.duration_minutes} Mins</td>
                    <td>{a.candidate_count || 0} Students</td>
                    <td>
                      <span className={`badge ${
                        a.status === 'ACTIVE' ? 'badge-primary' :
                        a.status === 'PUBLISHED' ? 'badge-success' :
                        a.status === 'CLOSED' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => onNavigate('assignments')} 
                        className="btn btn-secondary btn-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
