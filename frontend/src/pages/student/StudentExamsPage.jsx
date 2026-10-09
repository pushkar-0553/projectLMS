import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi as api } from '../../services/examApi';
import { useCourse } from '../../context/CourseContext';
import { 
  Award, Clock, Calendar, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowRight, Play, CheckCircle, ShieldCheck, FileText, Key
} from 'lucide-react';
import '../../styles/examSystem.css';

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const { courseSlug } = useCourse();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ exams: [], summary: {} });
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'
  const [countdownSeconds, setCountdownSeconds] = useState(null);

  useEffect(() => {
    loadStudentExams();
  }, []);

  const loadStudentExams = async () => {
    setLoading(true);
    try {
      const res = await api.student.myExams();
      const payload = res.data || res || { exams: [], summary: {} };
      setData(payload);

      if (payload.summary?.upcoming_exam) {
        setCountdownSeconds(payload.summary.upcoming_exam.startsInSeconds || 0);
      }
    } catch (err) {
      console.error('Failed to load student exams:', err);
    } finally {
      setLoading(false);
    }
  };

  // Live ticking countdown clock
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  const formatCountdown = (totalSec) => {
    if (totalSec <= 0) return '00:00:00';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
  };

  const upcomingExam = data.summary?.upcoming_exam;

  const filteredExams = (data.exams || []).filter(e => {
    if (filter === 'UPCOMING') return !e.is_attended;
    if (filter === 'COMPLETED') return e.is_attended;
    return true;
  });

  return (
    <div className="student-exams-page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ 
            background: '#4f46e5', 
            color: '#ffffff', 
            fontSize: '11px', 
            fontWeight: 800, 
            padding: '2px 8px', 
            borderRadius: '6px'
          }}>
            STUDENT PORTAL
          </span>
          <span className="badge badge-primary">
            <Award size={12} /> Proctored Written Exams
          </span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
          My Batch Examinations
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          View scheduled assessments, live countdown timers, attend exams with your passcode &amp; track evaluated marks
        </p>
      </div>

      {/* 1. Exam Metric Counters (Resume Hub Style) */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '24px' }}>
        <div className="exam-stat-card" style={{ borderLeftColor: '#4f46e5' }}>
          <span className="stat-label">Assigned Exams</span>
          <span className="stat-value">{data.summary?.total_assigned || 0}</span>
        </div>
        <div className="exam-stat-card" style={{ borderLeftColor: '#0ea5e9' }}>
          <span className="stat-label">Attended / Completed</span>
          <span className="stat-value">{data.summary?.attended_count || 0}</span>
        </div>
        <div className="exam-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="stat-label">Evaluated</span>
          <span className="stat-value">{data.summary?.evaluated_count || 0}</span>
        </div>
        <div className="exam-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <span className="stat-label">Average Score</span>
          <span className="stat-value">
            {data.summary?.average_score ? `${data.summary.average_score}%` : '—'}
          </span>
        </div>
      </div>

      {/* 2. LIVE COUNTDOWN CLOCK CARD FOR UPCOMING EXAM */}
      {upcomingExam && (
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)', 
          border: '1px solid #c7d2fe', 
          borderRadius: '16px', 
          padding: '24px 28px', 
          marginBottom: '28px',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`badge ${upcomingExam.isLiveNow || countdownSeconds <= 0 ? 'badge-danger' : 'badge-warning'}`}>
                  {upcomingExam.isLiveNow || countdownSeconds <= 0 ? '🔴 LIVE NOW' : 'UPCOMING ASSESSMENT'}
                </span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Code: <strong>{upcomingExam.assignment_code}</strong>
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
                {upcomingExam.title}
              </h2>
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>Subject: <strong>{upcomingExam.subject || 'General'}</strong></span>
                <span>Duration: <strong>{upcomingExam.duration_minutes} Mins</strong></span>
                <span>Marks: <strong>{upcomingExam.total_marks} Total</strong></span>
              </div>

              {upcomingExam.otp_code && (
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px' }}>
                  <Key size={14} color="#4f46e5" />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Your Exam Passcode:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: '#4f46e5', letterSpacing: '2px' }}>
                    {upcomingExam.otp_code}
                  </strong>
                </div>
              )}
            </div>

            {/* Countdown Clock Display */}
            <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 28px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Clock size={14} color="#4f46e5" />
                {upcomingExam.isLiveNow || countdownSeconds <= 0 ? 'Examination Status' : 'Starts In'}
              </div>

              <div style={{ 
                fontSize: '26px', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: upcomingExam.isLiveNow || countdownSeconds <= 0 ? '#16a34a' : '#4f46e5',
                letterSpacing: '1px',
                margin: '4px 0 12px'
              }}>
                {upcomingExam.isLiveNow || countdownSeconds <= 0 ? 'READY TO START' : formatCountdown(countdownSeconds)}
              </div>

              <button
                onClick={() => navigate(`/exam/${upcomingExam.assignment_code}`)}
                className="btn btn-primary"
                style={{ width: '100%', gap: '8px', padding: '10px 20px', fontSize: '14px' }}
              >
                <Play size={16} fill="white" />
                {upcomingExam.isLiveNow || countdownSeconds <= 0 ? 'Launch Examination' : 'Open Exam Portal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Tabs & Exam List Table */}
      <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            All Assigned Examinations
          </h3>

          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setFilter('ALL')}
              className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            >
              All ({data.exams?.length || 0})
            </button>
            <button
              onClick={() => setFilter('UPCOMING')}
              className={`btn btn-sm ${filter === 'UPCOMING' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Pending ({(data.exams || []).filter(e => !e.is_attended).length})
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              className={`btn btn-sm ${filter === 'COMPLETED' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Attended &amp; Results ({(data.exams || []).filter(e => e.is_attended).length})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading exams...</div>
        ) : filteredExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <Award size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>No Examinations Found</div>
            <div style={{ fontSize: '13px' }}>No exams match the selected filter. Check back once your batch coordinator schedules an assessment.</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Subject</th>
                  <th>Batch</th>
                  <th>Scheduled Time</th>
                  <th>Passcode</th>
                  <th>Status</th>
                  <th>Marks / Score</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map(exam => {
                  return (
                    <tr key={exam.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{exam.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Code: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{exam.assignment_code}</span>
                        </div>
                      </td>
                      <td>{exam.subject || '—'}</td>
                      <td>{exam.batch_name}</td>
                      <td style={{ fontSize: '13px' }}>
                        {exam.scheduled_start ? (
                          <>
                            <div>{new Date(exam.scheduled_start).toLocaleDateString()}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {new Date(exam.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : 'Immediate / Open'}
                      </td>
                      <td>
                        {exam.otp_code ? (
                          <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: '#4f46e5' }}>
                            {exam.otp_code}
                          </code>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sent to email</span>
                        )}
                      </td>
                      <td>
                        {exam.candidate_status === 'EVALUATED' && (
                          <span className="badge badge-success">Evaluated</span>
                        )}
                        {['SUBMITTED', 'AUTO_SUBMITTED'].includes(exam.candidate_status) && (
                          <span className="badge badge-primary">Under Review</span>
                        )}
                        {exam.candidate_status === 'ASSIGNED' && (
                          <span className="badge badge-warning">Scheduled</span>
                        )}
                      </td>
                      <td>
                        {exam.result ? (
                          <div>
                            <strong style={{ color: exam.result.is_passed ? '#15803d' : '#b91c1c' }}>
                              {exam.result.total_marks_awarded} / {exam.total_marks}
                            </strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {exam.result.percentage}% ({exam.result.is_passed ? 'PASSED' : 'NEEDS IMPROVEMENT'})
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pending Grading</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!exam.is_attended ? (
                          <button
                            onClick={() => navigate(`/exam/${exam.assignment_code}`)}
                            className="btn btn-primary btn-sm"
                          >
                            <Play size={13} fill="white" /> Attend Exam
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/exam/${exam.assignment_code}`)}
                            className="btn btn-secondary btn-sm"
                          >
                            View Submission
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
