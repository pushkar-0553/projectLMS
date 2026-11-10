import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, CheckCircle2, XCircle, Globe, Wifi } from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';

export default function TodayAttendanceTab({ scope, batches }) {
  const [summary, setSummary] = useState({
    date: '',
    totalStudents: 0,
    present: 0,
    absent: 0,
    online: 0,
    offline: 0
  });
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [batchId, setBatchId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [mode, setMode] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendancePortalAPI.getToday({
        scope,
        batchId: batchId || undefined,
        status,
        mode,
        search: search.trim() || undefined,
        page,
        limit: 25
      });
      setSummary(res.data?.summary || {});
      setRecords(res.data?.records || []);
      setPagination(res.data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load today attendance.');
    } finally {
      setLoading(false);
    }
  }, [scope, batchId, status, mode, search, page]);

  useEffect(() => {
    const timer = setTimeout(loadToday, 180);
    return () => clearTimeout(timer);
  }, [loadToday]);

  useEffect(() => {
    setPage(1);
  }, [scope, batchId, status, mode, search]);

  return (
    <div>
      {/* KPI Cards */}
      <div className="att-kpi-grid">
        <div className="att-kpi-card">
          <div className="att-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Students</span>
            <Users size={15} color="#4f46e5" />
          </div>
          <div className="att-kpi-value">{summary.totalStudents ?? 0}</div>
        </div>

        <div className="att-kpi-card green">
          <div className="att-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Present Today</span>
            <CheckCircle2 size={15} color="#10b981" />
          </div>
          <div className="att-kpi-value">{summary.present ?? 0}</div>
        </div>

        <div className="att-kpi-card red">
          <div className="att-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Absent</span>
            <XCircle size={15} color="#ef4444" />
          </div>
          <div className="att-kpi-value">{summary.absent ?? 0}</div>
        </div>

        <div className="att-kpi-card blue">
          <div className="att-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Online</span>
            <Globe size={15} color="#0ea5e9" />
          </div>
          <div className="att-kpi-value">{summary.online ?? 0}</div>
        </div>

        <div className="att-kpi-card amber">
          <div className="att-kpi-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Offline (Wi-Fi)</span>
            <Wifi size={15} color="#f59e0b" />
          </div>
          <div className="att-kpi-value">{summary.offline ?? 0}</div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="att-panel">
        <div className="att-panel-title">
          <span>Today&apos;s Attendance Roster ({summary.date || 'IST'})</span>
          <button type="button" className="att-btn att-btn-secondary att-btn-sm" onClick={loadToday}>
            Refresh
          </button>
        </div>

        <div className="att-filter-row">
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              className="att-filter-input"
              style={{ width: '100%', paddingLeft: 32 }}
              placeholder="Search student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="att-filter-select"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="att-filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="EXCUSED">Excused</option>
          </select>

          <select
            className="att-filter-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ALL">All Modes</option>
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
          </select>
        </div>

        {error && (
          <div className="att-status-banner unverified" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div className="att-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Batch</th>
                <th>Attendance Time (IST)</th>
                <th>Mode</th>
                <th>Device ID</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    Loading today&apos;s attendance...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No matching students found for today.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.student_name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>{row.student_email}</div>
                    </td>
                    <td>{row.batch_name || 'Unassigned'}</td>
                    <td>{row.submitted_time_ist || '—'}</td>
                    <td>
                      {row.attendance_mode ? (
                        <span
                          className={`att-badge ${
                            row.attendance_mode === 'OFFLINE' ? 'att-badge-amber' : 'att-badge-blue'
                          }`}
                        >
                          {row.attendance_mode}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="att-mono" title={row.device_uuid || ''}>
                      {row.device_uuid ? `${row.device_uuid.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="att-mono">{row.ip_address || '—'}</td>
                    <td>
                      <span
                        className={`att-badge ${
                          row.status === 'PRESENT'
                            ? 'att-badge-green'
                            : row.status === 'ABSENT'
                            ? 'att-badge-red'
                            : 'att-badge-amber'
                        }`}
                      >
                        {row.status}
                      </span>
                      {Boolean(row.is_manually_adjusted) && (
                        <span
                          className="att-badge att-badge-indigo"
                          style={{ marginLeft: 6 }}
                          title={row.correction_reason || 'Manually adjusted'}
                        >
                          Manual
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="att-pagination">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="att-btn att-btn-secondary att-btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="att-btn att-btn-secondary att-btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

