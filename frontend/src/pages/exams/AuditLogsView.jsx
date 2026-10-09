import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { History, Shield, RefreshCw, Search } from 'lucide-react';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.audit.getLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.actor_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or entity..."
            className="input"
            style={{ paddingLeft: '38px' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
        </div>

        <button onClick={loadLogs} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
          <RefreshCw size={15} />
          Refresh Audit Trail
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading immutable audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No audit log entries found.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action Triggered</th>
                  <th>Target Entity</th>
                  <th>IP Address</th>
                  <th>Audit Payload</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        l.actor_type === 'ADMIN' ? 'badge-primary' :
                        l.actor_type === 'STUDENT' ? 'badge-success' : 'badge-muted'
                      }`} style={{ fontSize: '10px' }}>
                        {l.actor_type}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-accent)' }}>
                        {l.action}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{l.entity_type}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <pre style={{ fontSize: '11px', margin: 0, padding: '4px 8px', background: 'var(--bg-main)', borderRadius: '4px', overflowX: 'auto', color: 'var(--text-secondary)' }}>
                        {typeof l.payload_json === 'object' ? JSON.stringify(l.payload_json) : l.payload_json || '{}'}
                      </pre>
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
