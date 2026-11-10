import React, { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, History, X, Smartphone } from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';

export default function DeviceManagementTab() {
  const [devices, setDevices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Reset Modal
  const [resetTarget, setResetTarget] = useState(null);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);

  // History Modal
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendancePortalAPI.getDevices({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 25
      });
      setDevices(res.data?.devices || []);
      setPagination(res.data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load registered devices.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    const t = setTimeout(loadDevices, 180);
    return () => clearTimeout(t);
  }, [loadDevices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setNotice('');
    try {
      const res = await attendancePortalAPI.resetDevice(
        resetTarget.id,
        resetReason.trim() || 'Admin authorized device reset'
      );
      setNotice(res.data?.message || 'Device reset successfully.');
      setResetTarget(null);
      setResetReason('');
      loadDevices();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset device.');
    } finally {
      setResetting(false);
    }
  };

  const handleViewHistory = async (device) => {
    setHistoryLoading(true);
    setHistoryData({ loading: true, target: device });
    try {
      const res = await attendancePortalAPI.getDeviceHistory(device.id);
      setHistoryData(res.data?.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load device history.');
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="att-panel">
      <div className="att-panel-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Smartphone size={18} color="#4f46e5" /> Browser Device Registrations
        </span>
      </div>

      <div className="att-status-banner info" style={{ marginBottom: 14 }}>
        <span>
          <strong>Note:</strong> Device bindings use random UUIDs persisted in the student&apos;s
          browser <code>localStorage</code> (not permanent hardware IDs). Resetting a device
          preserves the full historical registration record while allowing the student to register a
          new browser installation.
        </span>
      </div>

      {notice && <div className="att-status-banner verified">{notice}</div>}
      {error && <div className="att-status-banner unverified">{error}</div>}

      <div className="att-filter-row">
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
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
            placeholder="Search student, device UUID, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="att-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Registrations</option>
          <option value="ACTIVE">Active Bindings Only</option>
          <option value="RESET">Reset History Only</option>
        </select>
      </div>

      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th>Device UUID</th>
              <th>Bound Student</th>
              <th>Batch</th>
              <th>Registered (IST)</th>
              <th>Last Activity (IST)</th>
              <th>Last IP</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Loading devices...
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No device registrations found.
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id}>
                  <td className="att-mono" title={d.device_uuid}>
                    {d.device_uuid}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{d.student_name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{d.student_email}</div>
                  </td>
                  <td>{d.batch_name || 'Unassigned'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{d.registered_at_ist}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{d.last_activity_at_ist}</td>
                  <td className="att-mono">{d.last_ip || d.registered_ip || '—'}</td>
                  <td>
                    {d.is_active ? (
                      <span className="att-badge att-badge-green">ACTIVE</span>
                    ) : (
                      <div>
                        <span className="att-badge att-badge-slate">RESET</span>
                        {d.reset_at_ist && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {d.reset_at_ist}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="att-btn att-btn-secondary att-btn-sm"
                        onClick={() => handleViewHistory(d)}
                      >
                        <History size={13} /> History
                      </button>
                      {d.is_active && (
                        <button
                          type="button"
                          className="att-btn att-btn-danger att-btn-sm"
                          onClick={() => {
                            setResetTarget(d);
                            setResetReason('');
                          }}
                        >
                          <RotateCcw size={13} /> Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="att-pagination">
        <span>
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
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

      {/* Reset Device Confirmation Modal */}
      {resetTarget && (
        <div className="att-modal-backdrop" onClick={() => setResetTarget(null)}>
          <div className="att-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800 }}>
              Reset Student Device Binding
            </h3>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px' }}>
              This will deactivate the current browser binding for{' '}
              <strong>{resetTarget.student_name}</strong> (UUID:{' '}
              <span className="att-mono">{resetTarget.device_uuid}</span>) while preserving its
              audit history.
            </p>
            <form onSubmit={handleConfirmReset}>
              <div className="att-field">
                <label className="att-label" htmlFor="reset-reason-input">
                  Reset Reason
                </label>
                <input
                  id="reset-reason-input"
                  type="text"
                  className="att-input"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Student switched phone / cleared browser storage"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="att-btn att-btn-secondary"
                  onClick={() => setResetTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="att-btn att-btn-danger" disabled={resetting}>
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device History Modal */}
      {historyData && (
        <div className="att-modal-backdrop" onClick={() => setHistoryData(null)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                Device &amp; Student Binding History
              </h3>
              <button
                type="button"
                onClick={() => setHistoryData(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                Loading device history...
              </div>
            ) : (
              <div>
                <h4 style={{ fontSize: 14, margin: '0 0 8px' }}>Registration Timeline</h4>
                <div className="att-table-wrap" style={{ marginBottom: 16 }}>
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th>Device UUID</th>
                        <th>Student</th>
                        <th>Registered</th>
                        <th>Status</th>
                        <th>Reset By / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyData.registrations || []).map((reg) => (
                        <tr key={reg.id}>
                          <td className="att-mono">{reg.device_uuid.slice(0, 13)}…</td>
                          <td>{reg.student_name}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{reg.registered_at_ist}</td>
                          <td>
                            <span className={`att-badge ${reg.is_active ? 'att-badge-green' : 'att-badge-slate'}`}>
                              {reg.is_active ? 'ACTIVE' : 'RESET'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {reg.is_active
                              ? '—'
                              : `${reg.reset_by_name || 'Admin'}: ${reg.reset_reason || 'Reset'}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ fontSize: 14, margin: '0 0 8px' }}>Recent Submissions</h4>
                <div className="att-table-wrap">
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th>Date (IST)</th>
                        <th>Time (IST)</th>
                        <th>Mode</th>
                        <th>Status</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyData.recentSubmissions || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                            No recorded submissions yet.
                          </td>
                        </tr>
                      ) : (
                        historyData.recentSubmissions.map((s) => (
                          <tr key={s.id}>
                            <td>{s.attendance_date}</td>
                            <td>{s.submitted_at_ist}</td>
                            <td>{s.attendance_mode}</td>
                            <td>{s.status}</td>
                            <td className="att-mono">{s.ip_address || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

