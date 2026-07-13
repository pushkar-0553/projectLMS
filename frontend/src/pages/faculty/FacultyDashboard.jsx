import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyAPI } from '../../services/api';
import {
  Users, Clock, Video, BookOpen, Activity, Award,
  TrendingUp, Calendar, ChevronRight, Target, Star, AlertCircle,
  MessageSquare, BarChart2, BookMarked
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [engagementData, setEngagementData] = useState([
    { day: 'Mon', students: 0 },
    { day: 'Tue', students: 0 },
    { day: 'Wed', students: 0 },
    { day: 'Thu', students: 0 },
    { day: 'Fri', students: 0 },
    { day: 'Sat', students: 0 },
    { day: 'Sun', students: 0 },
  ]);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const safeFetch = async (apiCall, setter) => {
        try { const res = await apiCall; if (res?.data) setter(res.data); }
        catch (e) { console.warn('API call failed:', e); }
      };
      await Promise.all([
        safeFetch(facultyAPI.getDashboardStats(), (data) => setStats({
          totalBatches: data.total_batches || 0,
          activeStudents: data.total_students || 0,
          pendingReviews: data.pending_reviews || 0,
          upcomingInterviews: data.upcoming_interviews || 0
        })),
        // Use mentoring sessions as "Today's Sessions" from faculty's own schedule
        safeFetch(facultyAPI.getMentoringSessions(), (data) =>
          setUpcomingSessions(data.slice(0, 4))
        ),
        // Use faculty interviews list for recent evaluations panel
        safeFetch(facultyAPI.getInterviews(), (data) =>
          setRecentEvaluations(data.filter(i => i.status === 'completed').slice(0, 4))
        ),
        safeFetch(facultyAPI.getEngagementStats(), (data) =>
          setEngagementData(data)
        ),
        safeFetch(facultyAPI.getMyPerformance(), (data) =>
          setPerformanceData(data)
        )
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="faculty-dashboard-page fade-in">
      {/* Page Header */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-content">
          <div className="welcome-text">
            <h1>Faculty Dashboard</h1>
            <p>Welcome back, {user?.name}. You're overseeing {stats?.totalBatches || 0} batches with {stats?.activeStudents || 0} active students.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/faculty/guidance')}>
              <BookOpen size={16} /> Add Guidance
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/faculty/messages')}>
              <MessageSquare size={16} /> Message Hub
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {/* Stats Grid */}
        <section className="stats-section slide-up">
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-info">
                <span className="stat-label">Assigned Batches</span>
                <h3 className="stat-value">{stats?.totalBatches || 0}</h3>
              </div>
              <div className="stat-icon-box"><BarChart2 size={24} /></div>
            </div>
            <div className="stat-card emerald">
              <div className="stat-info">
                <span className="stat-label">Active Students</span>
                <h3 className="stat-value">{stats?.activeStudents || 0}</h3>
              </div>
              <div className="stat-icon-box"><Users size={24} /></div>
            </div>
            <div className="stat-card amber">
              <div className="stat-info">
                <span className="stat-label">Pending Reviews</span>
                <h3 className="stat-value">{stats?.pendingReviews || 0}</h3>
              </div>
              <div className="stat-icon-box"><Clock size={24} /></div>
            </div>
            <div className="stat-card indigo">
              <div className="stat-info">
                <span className="stat-label">Upcoming Interviews</span>
                <h3 className="stat-value">{stats?.upcomingInterviews || 0}</h3>
              </div>
              <div className="stat-icon-box"><Video size={24} /></div>
            </div>
          </div>
        </section>

        {/* Main Dashboard Layout */}
        <div className="dashboard-layout">
          {/* Left column */}
          <div className="secondary-column">

            {/* Engagement Chart */}
            <section className="card chart-card slide-up">
              <div className="card-header-simple">
                <h3><TrendingUp size={20} /> Weekly Student Engagement</h3>
                <span className="badge badge-primary">Live</span>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={engagementData}>
                    <defs>
                      <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="students" stroke="#4f46e5" strokeWidth={3} fill="url(#engGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Upcoming Sessions */}
            <section className="card slide-up">
              <div className="card-header-simple flex-between">
                <h3><Calendar size={20} /> Today's Sessions</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/faculty/sessions')}>View All</button>
              </div>
              <div style={{ padding: '1rem 1.5rem' }}>
                {upcomingSessions.length > 0 ? upcomingSessions.map(session => (
                  <div key={session.id} className="session-item">
                    <div className="session-time-box">
                      <span className="session-time">{session.session_date ? new Date(session.session_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Upcoming'}</span>
                    </div>
                    <div className="session-details">
                      <strong>{session.topic || 'Mentoring Session'}</strong>
                      <span>{session.student_name || 'Student'} • {session.duration_mins || 30} mins</span>
                    </div>
                    <span className="badge badge-primary">Scheduled</span>
                  </div>
                )) : (
                  <p className="empty-text">No mentoring sessions scheduled.</p>
                )}
              </div>
            </section>

            {/* Quick Links */}
            <div className="quick-links-grid slide-up">
              <div className="quick-link-card indigo" onClick={() => navigate('/faculty/student-monitoring')}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <h3>Student Monitoring</h3>
                <p>Track batch performance & attendance</p>
                <ChevronRight size={20} style={{ marginTop: '1rem', opacity: 0.6 }} />
              </div>
              <div className="quick-link-card white" onClick={() => navigate('/faculty/guidance')}>
                <BookOpen size={32} style={{ marginBottom: '1rem', color: '#4f46e5' }} />
                <h3>Guidance Repository</h3>
                <p>Publish learning materials & notes</p>
                <ChevronRight size={20} style={{ marginTop: '1rem', opacity: 0.4 }} />
              </div>
            </div>
          </div>

          {/* Right column */}
          <aside className="primary-column">
            {/* Recent Evaluations */}
            <section className="card slide-up">
              <div className="card-header-simple">
                <h3><Award size={20} /> Recent Evaluations</h3>
              </div>
              <div className="eval-list">
                {recentEvaluations.length > 0 ? recentEvaluations.map(evalItem => (
                  <div key={evalItem.id} className="eval-item">
                    <div className="eval-avatar">{evalItem.student_name?.charAt(0) || 'S'}</div>
                    <div className="eval-info">
                      <strong>{evalItem.student_name || 'Student'}</strong>
                      <span className="eval-feedback">{evalItem.title || evalItem.notes || 'Interview completed'}</span>
                      <span className="eval-date">{evalItem.scheduled_at ? new Date(evalItem.scheduled_at).toLocaleDateString() : ''}</span>
                    </div>
                    <span className="badge badge-success">Done</span>
                  </div>
                )) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Star size={32} style={{ color: '#e2e8f0', margin: '0 auto 0.75rem' }} />
                    <p className="empty-text">No completed interviews yet</p>
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                <button className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/faculty/interviews')}>
                  Manage Interviews <ChevronRight size={14} />
                </button>
              </div>
            </section>

            {/* Recent Activity Feed */}
            <section className="card slide-up">
              <div className="card-header-simple">
                <h3><Activity size={20} /> Recent Activity</h3>
              </div>
              <div className="activity-feed">
                {stats?.recentActivity?.length > 0 ? stats.recentActivity.map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-icon-sm submission"><CheckCircle size={14} /></div>
                    <div className="activity-info">
                      <p><strong>{activity.student_name}</strong> submitted <strong>{activity.project_title}</strong></p>
                      <span className="activity-time">{new Date(activity.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )) : (
                  <p className="empty-text" style={{ padding: '2rem' }}>No recent activity to show.</p>
                )}
              </div>
            </section>

            {/* Performance Index */}
            <section className="card slide-up">
              <div className="card-header-simple">
                <h3><Activity size={20} /> My Performance</h3>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div className="perf-metric">
                  <div className="perf-label">
                    <span>Evaluation Accuracy</span>
                    <span style={{ color: '#4f46e5', fontWeight: 700 }}>{performanceData?.accuracy?.toFixed(0) || 95}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${performanceData?.accuracy || 95}%` }}></div></div>
                </div>
                <div className="perf-metric">
                  <div className="perf-label">
                    <span>Response Velocity</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{performanceData?.velocity?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${performanceData?.velocity || 0}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div></div>
                </div>
                <div className="perf-metric">
                  <div className="perf-label">
                    <span>Student Satisfaction</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{performanceData?.satisfaction || 4.5} / 5</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${(performanceData?.satisfaction * 20) || 90}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}></div></div>
                </div>
                <div className="mentor-rating-box">
                  <Star size={24} style={{ color: '#f59e0b' }} />
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0f172a' }}>{performanceData?.satisfaction || 4.5} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>/ 5 Rating</span></p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <span className="badge badge-primary" title="Total Evaluations"><Award size={10} /> {performanceData?.evaluations || 0}</span>
                      <span className="badge badge-success" title="Total Mentoring"><Clock size={10} /> {performanceData?.sessions || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <style>{`
        .faculty-dashboard-page { min-height: 100vh; background: #f8fafc; }

        .page-header { position: relative; background: #fff; padding: 3rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%); }
        .header-content { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; }
        .welcome-text h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .welcome-text p { color: #64748b; font-size: 1rem; }
        .main-content { padding-bottom: 3rem; }

        .stats-section { margin-bottom: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: #fff; padding: 1.5rem; border-radius: 1rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
        .stat-value { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-top: 0.25rem; }
        .stat-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-card.blue .stat-icon-box { background: #eff6ff; color: #2563eb; }
        .stat-card.amber .stat-icon-box { background: #fffbeb; color: #d97706; }
        .stat-card.emerald .stat-icon-box { background: #ecfdf5; color: #059669; }
        .stat-card.indigo .stat-icon-box { background: #eef2ff; color: #4f46e5; }

        .dashboard-layout { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; }
        .secondary-column { display: flex; flex-direction: column; gap: 2rem; }
        .primary-column { display: flex; flex-direction: column; gap: 2rem; }
        .card-header-simple { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.75rem; }
        .card-header-simple h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; margin: 0; flex: 1; }
        .flex-between { justify-content: space-between; }
        .chart-wrapper { padding: 1.5rem; }

        .session-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 0.75rem; margin-bottom: 0.75rem; }
        .session-time-box { background: #eef2ff; border-radius: 0.5rem; padding: 0.5rem 0.75rem; text-align: center; min-width: 70px; }
        .session-time { font-size: 0.875rem; font-weight: 800; color: #4f46e5; }
        .session-details { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .session-details strong { font-size: 0.9rem; color: #1e293b; }
        .session-details span { font-size: 0.75rem; color: #94a3b8; }

        .quick-links-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .quick-link-card { padding: 2rem; border-radius: 1rem; cursor: pointer; transition: all 0.3s; }
        .quick-link-card:hover { transform: translateY(-4px); }
        .quick-link-card.indigo { background: #4f46e5; color: white; box-shadow: 0 10px 25px -5px rgba(79,70,229,0.3); }
        .quick-link-card.indigo h3 { color: white; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .quick-link-card.indigo p { color: rgba(255,255,255,0.75); font-size: 0.85rem; }
        .quick-link-card.white { background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .quick-link-card.white h3 { color: #1e293b; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .quick-link-card.white p { color: #64748b; font-size: 0.85rem; }

        .eval-list { max-height: 350px; overflow-y: auto; }
        .eval-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
        .eval-item:last-child { border-bottom: none; }
        .eval-avatar { width: 36px; height: 36px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
        .eval-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
        .eval-info strong { font-size: 0.9rem; color: #1e293b; }
        .eval-feedback { font-size: 0.75rem; color: #64748b; font-style: italic; }
        .eval-date { font-size: 0.7rem; color: #94a3b8; }
        .eval-score { font-size: 0.8rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 0.5rem; }
        .eval-score.score-high { background: #dcfce7; color: #166534; }
        .eval-score.score-mid { background: #fef9c3; color: #854d0e; }

        .perf-metric { margin-bottom: 1.25rem; }
        .perf-label { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
        .mentor-rating-box { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: #fefce8; border-radius: 0.75rem; margin-top: 1.5rem; border: 1px solid #fef08a; }

        .activity-feed { padding: 0.5rem 0; }
        .activity-item { display: flex; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; align-items: flex-start; }
        .activity-item:last-child { border-bottom: none; }
        .activity-icon-sm { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .activity-icon-sm.submission { background: #ecfdf5; color: #10b981; }
        .activity-info p { margin: 0; font-size: 0.85rem; color: #475569; line-height: 1.4; }
        .activity-info strong { color: #1e293b; }
        .activity-time { font-size: 0.7rem; color: #94a3b8; }

        .empty-text { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 1rem 0; }

        .fade-in { animation: fadeIn 0.5s ease-out; }
        .slide-up { animation: slideUp 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1100px) {
          .dashboard-layout { grid-template-columns: 1fr; }
          .quick-links-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .quick-links-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FacultyDashboard;
