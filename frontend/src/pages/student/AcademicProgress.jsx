import React, { useEffect, useState } from 'react';
import { academicAPI } from '../../services/api';
import { CalendarCheck, ClipboardCheck, TrendingUp } from 'lucide-react';

const AcademicProgress = () => {
  const [data, setData] = useState({ attendance: [], assessments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await academicAPI.getMyAcademics();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load academic progress', error);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = data.attendance.filter((item) => item.status === 'present').length;
  const attendanceRate = data.attendance.length ? Math.round((presentCount / data.attendance.length) * 100) : 0;
  const averageMarks = data.assessments.length
    ? Math.round(data.assessments.reduce((sum, item) => sum + Number(item.marks_obtained || 0), 0) / data.assessments.length)
    : 0;

  if (loading) {
    return <div className="loader-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="academic-progress-page fade-in">
      <header className="page-header">
        <div className="container">
          <span className="badge badge-primary">Academic Progress</span>
          <h1>Attendance, Weekly Exams & Mocks</h1>
          <p>Track your classroom consistency and assessment performance alongside project work.</p>
        </div>
      </header>

      <main className="container progress-content">
        <section className="stats-grid">
          <div className="stat-card"><CalendarCheck /><strong>{attendanceRate}%</strong><span>Attendance</span></div>
          <div className="stat-card"><ClipboardCheck /><strong>{data.assessments.length}</strong><span>Assessments</span></div>
          <div className="stat-card"><TrendingUp /><strong>{averageMarks}</strong><span>Average marks</span></div>
        </section>

        <section className="content-grid">
          <div className="card panel-card">
            <h2>Attendance History</h2>
            {data.attendance.length === 0 ? (
              <div className="empty-state">No attendance records yet.</div>
            ) : (
              <div className="timeline-list">
                {data.attendance.map((item) => (
                  <div key={item.id} className="timeline-item">
                    <span className={`status-dot ${item.status}`}></span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{new Date(item.session_date).toLocaleDateString()} {item.batch_name ? `- ${item.batch_name}` : ''}</p>
                    </div>
                    <span className={`pill ${item.status}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card panel-card">
            <h2>Exam & Mock Results</h2>
            {data.assessments.length === 0 ? (
              <div className="empty-state">No weekly exams or mock results recorded yet.</div>
            ) : (
              <div className="result-list">
                {data.assessments.map((item) => {
                  const percent = item.max_marks ? Math.round((Number(item.marks_obtained) / Number(item.max_marks)) * 100) : 0;
                  return (
                    <div key={item.id} className="result-card">
                      <div className="result-top">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.assessment_type} - {new Date(item.assessment_date).toLocaleDateString()}</p>
                        </div>
                        <span className={`pill ${item.status}`}>{item.status.replace('_', ' ')}</span>
                      </div>
                      <div className="score-line">
                        <span>{item.marks_obtained}/{item.max_marks}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${percent}%` }}></div></div>
                      {item.feedback && <p className="feedback">{item.feedback}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .academic-progress-page { min-height: 100vh; background: #f8fafc; padding-bottom: 4rem; }
        .page-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 3rem 0; margin-bottom: 2rem; }
        .page-header h1 { font-size: 2rem; color: #0f172a; margin: 0.5rem 0; }
        .page-header p { color: #64748b; }
        .progress-content { display: flex; flex-direction: column; gap: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
        .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .stat-card svg { color: #4f46e5; }
        .stat-card strong { color: #0f172a; font-size: 2rem; }
        .stat-card span { color: #64748b; font-weight: 700; }
        .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
        .panel-card { border-radius: 8px; }
        .panel-card h2 { color: #0f172a; font-size: 1.15rem; margin-bottom: 1rem; }
        .empty-state { padding: 2rem; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; text-align: center; }
        .timeline-list, .result-list { display: flex; flex-direction: column; gap: 1rem; }
        .timeline-item { display: grid; grid-template-columns: 12px 1fr auto; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid #eef2f7; border-radius: 8px; background: #fff; }
        .timeline-item p, .result-top p, .feedback { color: #64748b; margin: 0.25rem 0 0; font-size: 0.85rem; }
        .status-dot { width: 10px; height: 10px; border-radius: 999px; background: #94a3b8; }
        .status-dot.present { background: #10b981; }
        .status-dot.absent { background: #ef4444; }
        .status-dot.late { background: #f59e0b; }
        .pill { border-radius: 999px; padding: 0.3rem 0.65rem; font-size: 0.75rem; font-weight: 800; text-transform: capitalize; background: #eef2ff; color: #4338ca; }
        .pill.present, .pill.passed { background: #dcfce7; color: #166534; }
        .pill.absent, .pill.needs_improvement { background: #fee2e2; color: #991b1b; }
        .pill.late { background: #fef3c7; color: #92400e; }
        .result-card { padding: 1rem; border: 1px solid #eef2f7; border-radius: 8px; background: #fff; }
        .result-top, .score-line { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
        .score-line { margin: 1rem 0 0.5rem; font-weight: 800; color: #0f172a; }
        @media (max-width: 1000px) { .content-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default AcademicProgress;
