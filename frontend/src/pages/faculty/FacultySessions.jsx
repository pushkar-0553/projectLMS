import React, { useState, useEffect } from 'react';
import { Calendar, Video, Clock, Users, Play, Search, Link as LinkIcon, Radio, AlertCircle, CheckCircle, BookOpen, UserCheck } from 'lucide-react';
import { facultyAPI } from '../../services/api';

const FacultySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getMentoringSessions();
      setSessions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return { cls: 'badge-primary', label: 'Scheduled' };
      case 'completed': return { cls: 'badge-success', label: 'Completed' };
      case 'cancelled': return { cls: 'badge-warning', label: 'Cancelled' };
      default: return { cls: 'badge-primary', label: status || 'Upcoming' };
    }
  };

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  const filtered = sessions.filter(s =>
    !searchTerm || s.title?.toLowerCase().includes(searchTerm.toLowerCase()) || s.batch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="faculty-sessions-page fade-in">
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}><Radio size={12} /> Live Broadcasts</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>Session Schedule</h1>
            <p style={{ color: '#64748b' }}>Manage and host your upcoming academic live sessions.</p>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={18} />
            <input
              type="text" placeholder="Search sessions..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', outline: 'none', fontSize: '0.875rem', background: 'white', width: '300px' }}
            />
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '3rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <Calendar size={48} style={{ color: '#e2e8f0', margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>No Mentoring Sessions</h3>
            <p style={{ color: '#64748b' }}>No mentoring sessions scheduled yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(session => {
              const { cls, label } = getStatusBadge(session.status || 'scheduled');
              return (
                <div key={session.id} className="card session-row">
                  {/* Date box */}
                  <div className="session-date-box">
                    <span className="session-month">{session.session_date ? new Date(session.session_date).toLocaleDateString(undefined, { month: 'short' }) : '—'}</span>
                    <span className="session-day">{session.session_date ? new Date(session.session_date).getDate() : '?'}</span>
                    <span className="session-dow">{session.session_date ? new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'short' }) : ''}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${cls}`}>{label}</span>
                      {session.student_name && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <UserCheck size={12} /> {session.student_name}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', margin: '0 0 0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.topic || 'Mentoring Session'}
                    </h3>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={14} /> {session.duration_mins || 30} mins
                      </span>
                      {session.summary && (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <BookOpen size={14} /> {session.summary.substring(0, 50)}{session.summary.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    <span className={`badge ${cls}`} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        .faculty-sessions-page { min-height: 100vh; background: #f8fafc; }
        .page-header { position: relative; background: #fff; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79,70,229,0.05) 0%, rgba(99,102,241,0.05) 100%); }
        .session-row { display: flex; align-items: center; gap: 1.5rem; padding: 1.25rem 1.5rem; transition: all 0.2s; }
        .session-row:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .session-live { border-left: 4px solid #ef4444; background: linear-gradient(90deg, #fef2f2, #fff); }
        .session-date-box { display: flex; flex-direction: column; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.75rem 1rem; min-width: 70px; flex-shrink: 0; }
        .session-month { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .session-day { font-size: 1.75rem; font-weight: 800; color: #4f46e5; line-height: 1; }
        .session-dow { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .session-row { flex-wrap: wrap; }
          .session-date-box { min-width: 60px; }
        }
      `}</style>
    </div>
  );
};

export default FacultySessions;
