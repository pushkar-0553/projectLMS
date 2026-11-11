import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { attendancePortalAPI } from '../../services/api';
import './Attendance.css';

const DEVICE_UUID_STORAGE_KEY = 'vcube_attendance_device_uuid';

function generateBrowserUuid() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOrCreateDeviceUuid() {
  try {
    const existing = localStorage.getItem(DEVICE_UUID_STORAGE_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
    const created = generateBrowserUuid();
    localStorage.setItem(DEVICE_UUID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateBrowserUuid();
  }
}

export default function PublicAttendancePortal() {
  const [deviceUuid] = useState(() => getOrCreateDeviceUuid());

  const [statusLoading, setStatusLoading] = useState(true);
  const [coldStartHint, setColdStartHint] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [networkStatus, setNetworkStatus] = useState(null);

  const [students, setStudents] = useState([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const studentPickerRef = useRef(null);

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (evt) => {
      if (studentPickerRef.current && !studentPickerRef.current.contains(evt.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    setStatusError('');
    setColdStartHint(false);
    const coldTimer = setTimeout(() => setColdStartHint(true), 2200);

    try {
      const res = await attendancePortalAPI.getPublicStatus();
      setNetworkStatus(res.data?.data || null);
    } catch (err) {
      setStatusError(
        err.response?.data?.message ||
        'Unable to reach attendance server. If the server was sleeping, please retry in a few seconds.'
      );
    } finally {
      clearTimeout(coldTimer);
      setColdStartHint(false);
      setStatusLoading(false);
    }
  };

  const fetchStudents = async (query = '') => {
    setStudentsLoading(true);
    try {
      const res = await attendancePortalAPI.getPublicStudents({
        search: query,
        limit: 250
      });
      setStudents(res.data?.students || []);
      setStudentsTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load student roster:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStudents('');
  }, []);

  // Re-verify network eligibility immediately if the student switches Wi-Fi <-> Mobile Data or returns to the tab
  useEffect(() => {
    const handleRecheck = () => {
      if (document.visibilityState === 'hidden' || confirmation) return;
      fetchStatus();
    };

    window.addEventListener('focus', handleRecheck);
    window.addEventListener('online', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);

    const conn =
      typeof navigator !== 'undefined'
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
        : null;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', handleRecheck);
    }

    return () => {
      window.removeEventListener('focus', handleRecheck);
      window.removeEventListener('online', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('change', handleRecheck);
      }
    };
  }, [confirmation]);

  useEffect(() => {
    if (studentsTotal <= 250) return;
    const handle = setTimeout(() => {
      fetchStudents(searchQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, studentsTotal]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.batch_name && s.batch_name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setDropdownOpen(false);
    setSubmitError('');
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSearchQuery('');
    setDropdownOpen(true);
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedStudent) {
      setSubmitError('Please search and select your name from the student list.');
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setSubmitError('Please enter your 4-digit PIN (last 4 digits of your registered mobile number).');
      return;
    }

    setSubmitting(true);
    try {
      const response = await attendancePortalAPI.submitOffline({
        studentId: selectedStudent.id,
        pin: pin.trim(),
        deviceUuid
      });

      setConfirmation(response.data?.data);
      setPin('');
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
        'Could not submit attendance. Please check your details and try again.'
      );
      if (err.response?.data?.code === 'NETWORK_NOT_VERIFIED') {
        fetchStatus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetView = () => {
    setConfirmation(null);
    setSubmitError('');
    setPin('');
    fetchStatus();
  };

  const offlineReady = Boolean(networkStatus?.offlineEligible);
  const isLoopback = networkStatus?.clientIp === '127.0.0.1' || networkStatus?.clientIp === '::1';
  const canSubmit = !submitting && offlineReady && Boolean(selectedStudent) && /^\d{4}$/.test(pin.trim());

  return (
    <div className="att-public-page">
      <div className="att-public-shell">
        <div className="att-brand-bar">
          <div className="att-brand-title">
            <div className="att-brand-icon">
              <UserCheck size={20} />
            </div>
            <div>
              <h1>Student Attendance</h1>
              <p>Institute Wi-Fi Check-In • VCUBE LMS</p>
            </div>
          </div>

          {networkStatus && (
            <div className="att-ist-chip">
              <div>{networkStatus.attendanceDateIst}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{networkStatus.serverTimeIst} IST</div>
            </div>
          )}
        </div>

        <div className="att-public-card">
          {confirmation ? (
            <div className="att-confirm-card">
              <div className="att-confirm-icon">
                <CheckCircle2 size={30} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>
                Attendance Confirmed
              </h2>
              <p style={{ fontSize: 13.5, color: '#475569', margin: 0 }}>
                Your attendance for today has been saved.
              </p>

              <div className="att-confirm-grid">
                <div>
                  <div className="att-confirm-item-label">Student</div>
                  <div className="att-confirm-item-val">{confirmation.studentName}</div>
                </div>
                <div>
                  <div className="att-confirm-item-label">Batch</div>
                  <div className="att-confirm-item-val">{confirmation.batchName || 'Assigned'}</div>
                </div>
                <div>
                  <div className="att-confirm-item-label">Date (IST)</div>
                  <div className="att-confirm-item-val">{confirmation.attendanceDate}</div>
                </div>
                <div>
                  <div className="att-confirm-item-label">Time (IST)</div>
                  <div className="att-confirm-item-val">{confirmation.attendanceTimeIst}</div>
                </div>
                <div>
                  <div className="att-confirm-item-label">Mode</div>
                  <div className="att-confirm-item-val">
                    <span className="att-badge att-badge-green">{confirmation.attendanceMode}</span>
                  </div>
                </div>
                <div>
                  <div className="att-confirm-item-label">Status</div>
                  <div className="att-confirm-item-val">
                    <span className="att-badge att-badge-green">{confirmation.status}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="att-btn att-btn-secondary"
                style={{ width: '100%' }}
                onClick={handleResetView}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Institute Wi-Fi Verification Status */}
              {statusLoading ? (
                <div className="att-status-banner info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} />
                    <span>
                      {coldStartHint
                        ? 'Waking up attendance server, please wait a moment...'
                        : 'Verifying institute Wi-Fi connection...'}
                    </span>
                  </div>
                </div>
              ) : statusError ? (
                <div className="att-status-banner unverified">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{statusError}</span>
                  </div>
                  <button type="button" className="att-recheck-btn" onClick={fetchStatus}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : offlineReady ? (
                <div className="att-status-banner verified">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Wifi size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Connected to {networkStatus.networkDisplayName}</strong>

                    </div>
                  </div>
                  <button type="button" className="att-recheck-btn" onClick={fetchStatus}>
                    <RefreshCw size={12} /> Recheck
                  </button>
                </div>
              ) : (
                <div className="att-status-banner unverified">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <WifiOff size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>
                        {networkStatus?.offlineAttendanceEnabled
                          ? 'Institute Wi-Fi Not Verified'
                          : 'Offline Attendance Disabled'}
                      </strong>
                      <div style={{ fontSize: 12.5, marginTop: 2 }}>
                        {networkStatus?.offlineAttendanceEnabled
                          ? `Please connect to ${networkStatus.networkDisplayName} and disable any VPN to mark attendance.`
                          : networkStatus?.verificationMessage}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="att-recheck-btn" onClick={fetchStatus}>
                    <RefreshCw size={12} /> Recheck
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Searchable Student Selector */}
                <div className="att-field" ref={studentPickerRef}>
                  <label className="att-label" htmlFor="att-student-search">
                    Student Name
                  </label>
                  <div className="att-input-wrap">
                    <Search
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 11,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      id="att-student-search"
                      type="text"
                      className="att-input"
                      style={{ paddingLeft: 36 }}
                      placeholder={
                        studentsLoading
                          ? 'Loading eligible students...'
                          : 'Search your name or batch...'
                      }
                      value={searchQuery}
                      disabled={!offlineReady}
                      onFocus={() => offlineReady && setDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setDropdownOpen(false);
                      }}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setDropdownOpen(true);
                        if (selectedStudent && e.target.value !== selectedStudent.name) {
                          setSelectedStudent(null);
                        }
                      }}
                      autoComplete="off"
                    />
                  </div>

                  {selectedStudent && (
                    <div className="att-selected-pill">
                      <div>
                        <strong>{selectedStudent.name}</strong>
                        <span style={{ color: '#475569', marginLeft: 8, fontSize: 12 }}>
                          {selectedStudent.batch_name || 'Unassigned'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearStudent}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#4f46e5',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {selectedStudent && !selectedStudent.has_pin && (
                    <div
                      className="att-status-banner warning"
                      style={{ marginTop: 8, marginBottom: 0, padding: '8px 12px', fontSize: 12 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldAlert size={15} />
                        <span>
                          Your registered mobile number is missing. Contact an administrator to
                          update your mobile number.
                        </span>
                      </div>
                    </div>
                  )}

                  {dropdownOpen && !selectedStudent && offlineReady && (
                    <div className="att-student-dropdown" role="listbox">
                      {studentsLoading ? (
                        <div style={{ padding: 12, fontSize: 13, color: '#64748b' }}>
                          Loading students...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div style={{ padding: 12, fontSize: 13, color: '#64748b' }}>
                          No matching students found.
                        </div>
                      ) : (
                        filteredStudents.slice(0, 60).map((student) => (
                          <button
                            type="button"
                            key={student.id}
                            role="option"
                            className="att-student-option"
                            onClick={() => handleSelectStudent(student)}
                          >
                            <div>
                              <div className="att-student-option-name">{student.name}</div>
                              <div className="att-student-option-meta">
                                {student.batch_name || 'Unassigned'}
                                {student.course_name ? ` • ${student.course_name}` : ''}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Student PIN */}
                <div className="att-field">
                  <label className="att-label" htmlFor="att-student-pin">
                    Attendance PIN
                  </label>
                  <div className="att-input-wrap">
                    <input
                      id="att-student-pin"
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      className="att-input"
                      style={{ paddingRight: 42 }}
                      placeholder="Last 4 digits of your mobile number"
                      value={pin}
                      disabled={!offlineReady}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: 4
                      }}
                    >
                      {showPin ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Use the last 4 digits of your registered mobile number.
                  </div>
                </div>

                {submitError && (
                  <div className="att-status-banner unverified" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{submitError}</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="att-submit-btn" disabled={!canSubmit}>
                  <CheckCircle2 size={18} />
                  {submitting ? 'Submitting Attendance...' : 'Present'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
