import React, { useState, useEffect } from 'react';
import { Layers, Search, BarChart3, TrendingUp, Users, Activity, ChevronRight, Award } from 'lucide-react';
import { facultyAPI } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const FacultyPerformance = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedBatch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [perfRes, batchesRes] = await Promise.all([
        facultyAPI.getStudentPerformance(selectedBatch === 'all' ? null : selectedBatch),
        facultyAPI.getMyBatches()
      ]);
      setPerformanceData(perfRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error) {
      console.error('Fetch performance data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = performanceData.filter(s =>
    !searchTerm ||
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    avgAttendance: (filtered.reduce((acc, s) => acc + (parseFloat(s.attendance_pct) || 0), 0) / (filtered.length || 1)).toFixed(1),
    avgScore: (filtered.reduce((acc, s) => acc + (parseFloat(s.avg_assessment_score) || 0), 0) / (filtered.length || 1)).toFixed(1),
    totalPassed: filtered.filter(s => s.overall_grade && s.overall_grade !== 'F').length
  };

  const chartData = filtered.slice(0, 10).map(s => ({
    name: s.name?.split(' ')[0],
    Score: parseFloat(s.avg_assessment_score) || 0,
    Progress: parseFloat(s.task_completion_pct) || 0
  }));

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  return (
    <div className="faculty-performance-page fade-in">
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-flex">
          <div>
            <div className="badge badge-primary"><Activity size={14} /> Analytics Dashboard</div>
            <h1 className="header-title">Cohort Performance Analytics</h1>
            <p className="header-sub">Metric-driven oversight of student academic trajectories.</p>
          </div>
          <div className="header-actions">
            <select 
              className="form-control" 
              value={selectedBatch} 
              onChange={e => setSelectedBatch(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option value="all">All Assigned Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {/* Analytics Summary */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-box blue"><Users size={20} /></div>
            <div className="stat-details">
              <span>Cohort Size</span>
              <h3>{filtered.length} Students</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box emerald"><TrendingUp size={20} /></div>
            <div className="stat-details">
              <span>Avg. Assessment</span>
              <h3>{stats.avgScore}%</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box indigo"><Activity size={20} /></div>
            <div className="stat-details">
              <span>Avg. Attendance</span>
              <h3>{stats.avgAttendance}%</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box amber"><Award size={20} /></div>
            <div className="stat-details">
              <span>Passing Rate</span>
              <h3>{((stats.totalPassed / (filtered.length || 1)) * 100).toFixed(0)}%</h3>
            </div>
          </div>
        </div>

        <div className="performance-layout">
          {/* Chart Section */}
          <div className="chart-grid">
            <section className="card chart-box">
              <div className="card-header-simple">
                <h3><BarChart3 size={18} /> Performance Overview</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="Score" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card chart-box">
              <div className="card-header-simple">
                <h3><Activity size={18} /> Completion vs Score</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="Score" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4 }} />
                    <Line type="monotone" dataKey="Progress" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Detailed Data Table */}
          <div className="card matrix-card">
            <div className="matrix-toolbar">
              <div className="search-box-simple">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search student benchmarks..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            <div className="matrix-table-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Batch</th>
                    <th>Attendance</th>
                    <th>Task %</th>
                    <th>Avg Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={i}>
                      <td>
                        <div className="student-info">
                          <div className="avatar-small">{s.name?.charAt(0)}</div>
                          <div>
                            <p className="name-bold">{s.name}</p>
                            <p className="email-dim">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="batch-tag">{s.batch_name}</span></td>
                      <td>
                        <div className="progress-mini">
                          <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${s.attendance_pct}%` }}></div></div>
                          <span>{parseFloat(s.attendance_pct || 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="progress-mini">
                          <div className="progress-bar-bg"><div className="progress-bar-fill green" style={{ width: `${s.task_completion_pct}%` }}></div></div>
                          <span>{parseFloat(s.task_completion_pct || 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`score-badge ${parseFloat(s.avg_assessment_score) >= 75 ? 'high' : 'low'}`}>
                          {parseFloat(s.avg_assessment_score || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td><span className="grade-box">{s.overall_grade || 'N/A'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty-state">
                  <Users size={40} />
                  <p>No student performance data found for this selection.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .faculty-performance-page { min-height: 100vh; background: #f8fafc; }
        .page-header { position: relative; background: #fff; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79,70,229,0.05) 0%, rgba(99,102,241,0.05) 100%); }
        .header-flex { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; }
        .header-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; }
        .header-sub { color: #64748b; margin-top: 0.25rem; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; }
        .stat-icon-box { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .stat-icon-box.blue { background: #eff6ff; color: #2563eb; }
        .stat-icon-box.emerald { background: #ecfdf5; color: #059669; }
        .stat-icon-box.indigo { background: #eef2ff; color: #4f46e5; }
        .stat-icon-box.amber { background: #fffbeb; color: #d97706; }
        .stat-details span { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-details h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0; }

        .performance-layout { display: flex; flex-direction: column; gap: 2rem; }
        .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .chart-container { padding: 1.5rem; }

        .matrix-card { padding: 0 !important; overflow: hidden; }
        .matrix-toolbar { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; background: #fafafa; }
        .search-box-simple { display: flex; align-items: center; gap: 0.75rem; color: #94a3b8; }
        .search-box-simple input { border: none; background: transparent; outline: none; flex: 1; font-size: 0.875rem; color: #1e293b; }

        .matrix-table { width: 100%; border-collapse: collapse; text-align: left; }
        .matrix-table th { padding: 1.25rem 1.5rem; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
        .matrix-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; background: white; font-size: 0.9rem; }

        .student-info { display: flex; align-items: center; gap: 1rem; }
        .avatar-small { width: 32px; height: 32px; border-radius: 8px; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .name-bold { font-weight: 700; color: #1e293b; margin: 0; }
        .email-dim { font-size: 0.75rem; color: #94a3b8; margin: 0; }

        .batch-tag { font-size: 0.75rem; font-weight: 700; color: #475569; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 4px; }
        .progress-mini { display: flex; align-items: center; gap: 0.75rem; width: 120px; }
        .progress-bar-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #4f46e5; }
        .progress-bar-fill.green { background: #10b981; }
        .progress-mini span { font-size: 0.8rem; font-weight: 700; color: #475569; width: 35px; }

        .score-badge { padding: 0.25rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 800; }
        .score-badge.high { background: #ecfdf5; color: #059669; }
        .score-badge.low { background: #fff7ed; color: #c2410c; }
        .grade-box { font-weight: 900; color: #4f46e5; }

        .empty-state { padding: 4rem; text-align: center; color: #cbd5e1; }
        .empty-state p { margin-top: 1rem; font-weight: 600; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 1000px) {
          .chart-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FacultyPerformance;
