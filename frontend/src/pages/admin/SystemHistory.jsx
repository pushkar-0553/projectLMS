import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { History, Clock, User, Tag, Activity, Calendar, Filter, Search, RefreshCw, ChevronRight } from 'lucide-react';
import Button from '../../components/common/Button';

const SystemHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getHistory();
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'badge-success';
    if (action.includes('DELETE')) return 'badge-danger';
    if (action.includes('ASSIGN')) return 'badge-primary';
    if (action.includes('REVIEW')) return 'badge-info';
    return 'badge-warning';
  };

  const filteredHistory = history.filter(log => {
    const description = log.description || '';
    const matchesSearch = description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || log.entity_type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="system-history-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>System Audit Logs</h1>
              <p>Complete historical registry of all operations across the institutional platform.</p>
            </div>
            <div className="header-actions">
              <Button 
                onClick={fetchHistory}
                className="btn-glass"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh Registry
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {/* Controls Card */}
        <div className="controls-card card slide-up">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Filter by description, user, or entity ID..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <Filter size={16} className="text-muted" />
            <span className="filter-label">Entity Type:</span>
            <div className="filter-chips">
              {['all', 'batch', 'subbatch', 'task', 'submission', 'user'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`filter-chip ${filter === type ? 'active' : ''}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="table-card card fade-in">
          <div className="table-wrapper">
            <table className="modern-table history-table">
              <thead>
                <tr>
                  <th>Occurred At</th>
                  <th>System Actor</th>
                  <th>Action performed</th>
                  <th>Operational Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td colSpan="4">
                        <div className="skeleton-bar"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="empty-state-inner">
                        <div className="empty-icon-wrapper">
                          <History size={48} />
                        </div>
                        <h3>No matches found</h3>
                        <p>Adjust your filters or search terms to find specific activity logs.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((log) => (
                    <tr key={log.id} className="table-row">
                      <td className="timestamp-cell">
                        <div className="flex-column">
                          <span className="date-str">{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="time-str">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="actor-cell">
                        <div className="actor-info">
                          <div className={`actor-avatar ${log.role}`}>
                            {log.user_name.charAt(0)}
                          </div>
                          <div className="actor-text">
                            <span className="actor-name">{log.user_name}</span>
                            <span className="actor-role-tag">{log.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="action-cell">
                        <span className={`badge ${getActionColor(log.action_type)}`}>
                          {log.action_type.split('_').join(' ')}
                        </span>
                      </td>
                      <td className="details-cell">
                        <div className="details-content">
                          <Activity size={14} className="details-icon" />
                          <p className="description-text">{log.description}</p>
                          <span className="entity-id-ref">#{log.entity_id}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        .system-history-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 3rem 0;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%);
          z-index: 0;
        }

        .header-container {
          position: relative;
          z-index: 1;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .welcome-text h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }

        .welcome-text p {
          color: #64748b;
          font-size: 1.1rem;
        }

        .main-content {
          padding-bottom: 5rem;
        }

        .controls-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .search-wrapper {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3.25rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          background: white;
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-chip {
          padding: 0.5rem 1rem;
          background: #f1f5f9;
          border: 1px solid transparent;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-chip:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .filter-chip.active {
          background: #4f46e5;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }

        .history-table th {
          background: #fafaf9;
        }

        .timestamp-cell {
          width: 180px;
        }

        .date-str {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .time-str {
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .actor-cell {
          width: 240px;
        }

        .actor-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .actor-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          font-size: 0.875rem;
        }

        .actor-avatar.admin { background: linear-gradient(135deg, #ef4444, #991b1b); }
        .actor-avatar.coordinator { background: linear-gradient(135deg, #f59e0b, #b45309); }
        .actor-avatar.student { background: linear-gradient(135deg, #4f46e5, #3730a3); }

        .actor-text {
          display: flex;
          flex-direction: column;
        }

        .actor-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.875rem;
        }

        .actor-role-tag {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .action-cell {
          width: 180px;
        }

        .details-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .details-icon {
          color: #cbd5e1;
          flex-shrink: 0;
        }

        .description-text {
          font-size: 0.875rem;
          color: #475569;
          margin: 0;
        }

        .entity-id-ref {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.7rem;
          color: #94a3b8;
          padding: 0.25rem 0.5rem;
          background: #f8fafc;
          border-radius: 0.375rem;
          border: 1px solid #f1f5f9;
        }

        .empty-state-inner {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .skeleton-row {
          height: 80px;
        }

        .skeleton-bar {
          height: 20px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 10px;
          margin: 1.5rem 0;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          .timestamp-cell, .actor-cell, .action-cell {
            min-width: 140px;
          }
        }
      `}</style>
    </div>
  );
};

export default SystemHistory;

