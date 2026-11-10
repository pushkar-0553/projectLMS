import React, { useState, useEffect, useCallback } from 'react';
import { Download, FileSpreadsheet, Search, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { attendancePortalAPI } from '../../services/api';

export default function HistoryAttendanceTab({ scope, batches }) {
  const [preset, setPreset] = useState('last7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchId, setBatchId] = useState('');
  const [mode, setMode] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [evidenceModal, setEvidenceModal] = useState(null);

  const buildQueryParams = useCallback(() => {
    const params = {
      scope,
      preset,
      batchId: batchId || undefined,
      mode,
      status,
      search: search.trim() || undefined,
      page,
      limit: 25
    };
    if (preset === 'custom' && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    return params;
  }, [scope, preset, startDate, endDate, batchId, mode, status, search, page]);

  const loadHistory = useCallback(async () => {
    if (preset === 'custom' && (!startDate || !endDate)) return;
    setLoading(true);
    setError('');
    try {
      const res = await attendancePortalAPI.getHistory(buildQueryParams());
      setRecords(res.data?.records || []);
      setDateRange(res.data?.dateRange || {});
      setPagination(res.data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, preset, startDate, endDate]);

  useEffect(() => {
    const t = setTimeout(loadHistory, 180);
    return () => clearTimeout(t);
  }, [loadHistory]);

  useEffect(() => {
    setPage(1);
  }, [scope, preset, startDate, endDate, batchId, mode, status, search]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = buildQueryParams();
      delete params.page;
      delete params.limit;
      const res = await attendancePortalAPI.exportHistoryCsv(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${dateRange.startDate || 'export'}_to_${dateRange.endDate || 'export'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = buildQueryParams();
      delete params.page;
      delete params.limit;
      const res = await attendancePortalAPI.exportHistoryJson(params);
      const rows = res.data?.rows || [];
      const sheetRows = rows.map((r, idx) => ({
        'S.No': idx + 1,
        'Student Name': r.studentName,
        Email: r.studentEmail,
        Batch: r.batchName,
        'Date (IST)': r.attendanceDate,
        'Time (IST)': r.attendanceTimeIst,
        Mode: r.attendanceMode,
        Status: r.status,
        Source: r.source,
        'Device ID': r.deviceUuid,
        'IP Address': r.ipAddress,
        'Session Code': r.sessionCode,
        'Manually Adjusted': r.manuallyAdjusted,
        'Admin Name': r.markedByAdmin,
        'Correction Reason': r.correctionReason
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance History');
      XLSX.writeFile(
        wb,
        `attendance_${res.data?.dateRange?.startDate || 'history'}_to_${res.data?.dateRange?.endDate || 'history'}.xlsx`
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="att-panel">
      <div className="att-panel-title">
        <span>
          Attendance History{' '}
          {dateRange.startDate && (
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#64748b' }}>
              ({dateRange.startDate} to {dateRange.endDate})
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="att-btn att-btn-secondary att-btn-sm"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            className="att-btn att-btn-primary att-btn-sm"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Date Presets */}
      <div className="att-filter-row" style={{ marginBottom: 10 }}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'last7days', label: 'Last 7 Days' },
          { id: 'custom', label: 'Custom Range' }
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            className={`att-btn att-btn-sm ${preset === p.id ? 'att-btn-primary' : 'att-btn-secondary'}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}

        {preset === 'custom' && (
          <>
            <input
              type="date"
              className="att-filter-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: 12.5, color: '#64748b' }}>to</span>
            <input
              type="date"
              className="att-filter-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </>
        )}
      </div>

      {/* Filters */}
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
            placeholder="Search student, email, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="att-filter-select" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select className="att-filter-select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="ALL">All Modes</option>
          <option value="OFFLINE">Offline</option>
          <option value="ONLINE">Online</option>
        </select>

        <select className="att-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late</option>
          <option value="EXCUSED">Excused</option>
          <option value="ABSENT">Absent</option>
        </select>
      </div>

      {error && <div className="att-status-banner unverified">{error}</div>}

      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th>Date (IST)</th>
              <th>Time (IST)</th>
              <th>Student</th>
              <th>Batch</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Device ID</th>
              <th>IP Address</th>
              <th>Audit / Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  Loading history...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No attendance records match the selected filters.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.attendance_date}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.submitted_time_ist || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.student_name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{r.student_email}</div>
                  </td>
                  <td>{r.batch_name || 'Unassigned'}</td>
                  <td>
                    <span
                      className={`att-badge ${
                        r.attendance_mode === 'OFFLINE' ? 'att-badge-amber' : 'att-badge-blue'
                      }`}
                    >
                      {r.attendance_mode}
                    </span>
                    {r.session_code && (
                      <div className="att-mono" style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {r.session_code}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`att-badge ${
                        r.status === 'PRESENT'
                          ? 'att-badge-green'
                          : r.status === 'ABSENT'
                          ? 'att-badge-red'
                          : 'att-badge-amber'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="att-mono" title={r.device_uuid || ''}>
                    {r.device_uuid ? `${r.device_uuid.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="att-mono">{r.ip_address || '—'}</td>
                  <td>
                    {Boolean(r.is_manually_adjusted) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="att-badge att-badge-indigo">
                          {r.source === 'ADMIN_MANUAL' ? 'Manual Entry' : 'Adjusted'}
                        </span>
                        <button
                          type="button"
                          className="att-btn att-btn-secondary att-btn-sm"
                          onClick={() => setEvidenceModal(r)}
                          title="View correction details and preserved original evidence"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="att-badge att-badge-slate">Self Portal</span>
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
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
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

      {evidenceModal && (
        <div className="att-modal-backdrop" onClick={() => setEvidenceModal(null)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                Adjustment Details &amp; Original Evidence
              </h3>
              <button
                type="button"
                onClick={() => setEvidenceModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              <p>
                <strong>Student:</strong> {evidenceModal.student_name} ({evidenceModal.attendance_date})
              </p>
              <p>
                <strong>Adjusted By:</strong> {evidenceModal.marked_by_admin_name || 'Admin'} at{' '}
                {evidenceModal.adjusted_datetime_ist || evidenceModal.submitted_datetime_ist}
              </p>
              <p>
                <strong>Reason:</strong> {evidenceModal.correction_reason}
              </p>
              <div style={{ marginTop: 12 }}>
                <strong>Preserved Original Evidence:</strong>
                <pre
                  className="att-mono"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 6,
                    overflowX: 'auto'
                  }}
                >
                  {JSON.stringify(
                    evidenceModal.original_evidence || { note: 'Created manually (no prior self-submission)' },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

