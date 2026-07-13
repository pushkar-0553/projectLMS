import React, { useState, useEffect } from 'react';
import {
  Users, Search, CheckCircle, Clock, ChevronDown, ChevronUp,
  User, Calendar, ArrowRight, Target, Layout, Activity
} from 'lucide-react';
import { facultyAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const StudentMonitoring = () => {
  const navigate = useNavigate();
  const [monitoringData, setMonitoringData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBatches, setExpandedBatches] = useState({});

  useEffect(() => { fetchMonitoringData(); }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getStudents();
      const data = response.data || {};
      setMonitoringData(data);
      const initialExpanded = {};
      Object.keys(data).forEach(batch => { initialExpanded[batch] = true; });
      setExpandedBatches(initialExpanded);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = (batchName) => {
    setExpandedBatches(prev => ({ ...prev, [batchName]: !prev[batchName] }));
  };

  if (loading) {
    return <div className="loader-container"><div className="spinner"></div></div>;
  }

  const filteredBatches = Object.entries(monitoringData).filter(([batchName, subBatches]) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    // Check if batch name matches
    if (batchName.toLowerCase().includes(lower)) return true;
    // Check if any student's name, email or mobile matches
    return Object.values(subBatches).some(students =>
      students.some(s =>
        s.name?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower) ||
        (s.mobile && s.mobile.toLowerCase().includes(lower))
      )
    );
  });

  return (
    <div className="student-monitoring-page fade-in">
      {/* Header */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="badge badge-primary" style={{ marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={14} /> Academic Insight
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>Student Performance Hub</h1>
              <p style={{ color: '#64748b' }}>Detailed overview of student progress, tasks, and attendance.</p>
            </div>
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search students, email or batch..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '3rem' }}>
        {filteredBatches.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <Users size={48} style={{ color: '#e2e8f0', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>No monitoring data available</h3>
            <p style={{ color: '#64748b' }}>No batches or students match your search criteria.</p>
          </div>
        ) : (
          <div className="batches-list">
            {filteredBatches.map(([batchName, subBatches]) => (
              <div key={batchName} className="batch-block card">
                {/* Batch Header */}
                <div className="batch-header" onClick={() => toggleBatch(batchName)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="batch-icon-box">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{batchName}</h2>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                          {Object.keys(subBatches).length} Sub-batches
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                          {Object.values(subBatches).flat().length} Students
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`chevron-btn ${expandedBatches[batchName] ? 'active' : ''}`}>
                    <ChevronDown size={20} />
                  </div>
                </div>

                {/* Sub-batches */}
                {expandedBatches[batchName] && (
                  <div className="sub-batches-area">
                    {Object.entries(subBatches).map(([subBatchName, students]) => (
                      <div key={subBatchName} style={{ marginBottom: '2rem' }}>
                        <div className="sub-batch-label">
                          <div style={{ height: '1px', flex: 1, background: '#e2e8f0' }}></div>
                          <div className="sub-batch-pill">
                            <span style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sub-batch</span>
                            <strong style={{ fontSize: '0.85rem' }}>{subBatchName}</strong>
                          </div>
                          <div style={{ height: '1px', flex: 1, background: '#e2e8f0' }}></div>
                        </div>

                        <div className="students-grid">
                          {students.map(student => {
                            const taskPct = student.total_submissions > 0
                              ? Math.round((student.completed_tasks / student.total_submissions) * 100) : 0;
                            const attPct = student.total_sessions > 0
                              ? Math.round((student.present_days / student.total_sessions) * 100) : 0;
                            return (
                              <div
                                key={student.id}
                                className="student-card"
                                onClick={() => navigate(`/faculty/student/${student.id}`)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                  <div className="student-avatar">{student.name?.charAt(0)}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</h4>
                                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</p>
                                    {student.mobile && (
                                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>{student.mobile}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Task completion */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle size={12} style={{ color: '#10b981' }} /> Completion</span>
                                    <span>{student.completed_tasks}/{student.total_submissions}</span>
                                  </div>
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${taskPct}%` }}></div>
                                  </div>
                                </div>

                                {/* Attendance */}
                                <div style={{ marginBottom: '1rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} style={{ color: '#4f46e5' }} /> Attendance</span>
                                    <span>{attPct}%</span>
                                  </div>
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${attPct}%`, background: 'linear-gradient(90deg, #4f46e5, #818cf8)' }}></div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div className={`status-dot ${student.total_submissions > 5 ? 'active' : ''}`}></div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {student.total_submissions > 5 ? 'High Activity' : 'Stable'}
                                    </span>
                                  </div>
                                  <button
                                    className="analyze-btn"
                                    onClick={e => { e.stopPropagation(); navigate(`/faculty/student/${student.id}`); }}
                                  >
                                    Analyze <ArrowRight size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .student-monitoring-page { min-height: 100vh; background: #f8fafc; }
        .page-header { position: relative; background: #fff; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%); }

        .search-box { position: relative; }
        .search-box input { padding: 0.75rem 1rem 0.75rem 2.75rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; font-size: 0.875rem; background: #f8fafc; width: 360px; transition: all 0.2s; }
        .search-box input:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

        .batches-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .batch-block { padding: 0; overflow: hidden; }
        .batch-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; cursor: pointer; background: #f8fafc; transition: background 0.2s; border-bottom: 1px solid #f1f5f9; }
        .batch-header:hover { background: #f1f5f9; }
        .batch-icon-box { width: 52px; height: 52px; background: #4f46e5; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 6px -1px rgba(79,70,229,0.3); }
        .chevron-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; color: #94a3b8; transition: all 0.2s; }
        .chevron-btn.active { background: #4f46e5; border-color: #4f46e5; color: white; transform: rotate(180deg); }

        .sub-batches-area { padding: 1.5rem; }
        .sub-batch-label { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .sub-batch-pill { background: #0f172a; color: white; padding: 0.4rem 1rem; border-radius: 2rem; display: flex; flex-direction: column; align-items: center; }

        .students-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }
        .student-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; cursor: pointer; transition: all 0.25s; }
        .student-card:hover { border-color: #4f46e5; box-shadow: 0 10px 25px -5px rgba(79,70,229,0.15); transform: translateY(-3px); }
        .student-avatar { width: 40px; height: 40px; border-radius: 0.625rem; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; }
        .status-dot.active { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
        .analyze-btn { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; color: #4f46e5; background: none; border: none; cursor: pointer; padding: 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .analyze-btn:hover { color: #4338ca; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 768px) {
          .search-box input { width: 100%; }
          .students-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default StudentMonitoring;
