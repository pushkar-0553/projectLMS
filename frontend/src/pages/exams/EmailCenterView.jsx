import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  Mail, Plus, ShieldCheck, AlertCircle, RefreshCw, 
  CheckCircle2, Clock, Play, Activity, AlertTriangle, Key, Info, ChevronDown, ChevronUp,
  Edit2, Trash2
} from 'lucide-react';

export default function EmailCenterView() {
  const [activeTab, setActiveTab] = useState('ACCOUNTS'); // 'ACCOUNTS' | 'QUEUE'

  // SMTP Accounts state
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // SMTP account form data
  const [formData, setFormData] = useState({
    senderEmail: '',
    password: '',
    dailyQuota: 500,
    displayName: '',
    host: '',
    port: 465,
    secureType: 'SSL'
  });

  // Email Queue state
  const [queueData, setQueueData] = useState({ stats: {}, recentJobs: [] });
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (activeTab === 'ACCOUNTS') loadAccounts();
    if (activeTab === 'QUEUE') loadQueueStatus();
  }, [activeTab]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await api.smtp.list();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load SMTP accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadQueueStatus = async () => {
    setLoadingQueue(true);
    try {
      const data = await api.emailQueue.getStatus();
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load email queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleTestConnection = async (id) => {
    setTestingId(id);
    try {
      const res = await api.smtp.testConnection(id);
      alert(res.message || 'SMTP Connection Verified!');
      loadAccounts();
    } catch (err) {
      alert(`Test error: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('ADD');
    setEditingAccountId(null);
    setFormData({
      senderEmail: '',
      password: '',
      dailyQuota: 500,
      displayName: '',
      host: '',
      port: 465,
      secureType: 'SSL'
    });
    setShowAdvanced(false);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (acc) => {
    setModalMode('EDIT');
    setEditingAccountId(acc.id);
    setFormData({
      senderEmail: acc.sender_email || '',
      password: '',
      dailyQuota: acc.daily_quota || 500,
      displayName: acc.display_name || '',
      host: acc.host || '',
      port: acc.port || 465,
      secureType: acc.secure_type || 'SSL'
    });
    setShowAdvanced(true);
    setShowAddModal(true);
  };

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    if (!formData.senderEmail) {
      alert('Please provide the sender Email ID.');
      return;
    }
    if (modalMode === 'ADD' && !formData.password) {
      alert('Please provide your 16-character App Password.');
      return;
    }
    try {
      if (modalMode === 'EDIT') {
        const res = await api.smtp.update(editingAccountId, formData);
        alert(res.message || 'SMTP account updated successfully!');
      } else {
        await api.smtp.create(formData);
        alert('SMTP account encrypted and stored successfully!');
      }
      setShowAddModal(false);
      loadAccounts();
    } catch (err) {
      alert(`Error ${modalMode === 'EDIT' ? 'updating' : 'creating'} SMTP account: ${err.message}`);
    }
  };

  const handleDeleteAccount = async (id, email) => {
    const confirmed = window.confirm(`Are you sure you want to delete SMTP account "${email}"? Any pending jobs will be routed to other available accounts.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await api.smtp.delete(id);
      alert('SMTP account deleted successfully!');
      loadAccounts();
    } catch (err) {
      alert(`Failed to delete SMTP account: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      const res = await api.emailQueue.retryFailed();
      alert(`Re-queued ${res.requeuedCount !== undefined ? res.requeuedCount : 0} failed/postponed email jobs!`);
      loadQueueStatus();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Tab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            Email Delivery Center
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Multi-SMTP rotation, student OTP invitations & automated background dispatching
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`btn btn-sm ${activeTab === 'ACCOUNTS' ? 'btn-primary' : 'btn-ghost'}`}
            >
              SMTP Accounts ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`btn btn-sm ${activeTab === 'QUEUE' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Delivery Queue ({queueData.stats?.QUEUED || 0} Queued)
            </button>
          </div>

          {activeTab === 'ACCOUNTS' && (
            <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm">
              <Plus size={16} /> Configure SMTP Account
            </button>
          )}

          {activeTab === 'QUEUE' && (
            <button onClick={handleRetryFailed} disabled={retrying} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
              Retry Failed Jobs
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: SMTP ACCOUNTS
          ========================================================================= */}
      {activeTab === 'ACCOUNTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Info Banner */}
          <div style={{ background: 'var(--primary-light)', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ShieldCheck size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#1e293b' }}>
              <strong>Multi-SMTP Load Balancing:</strong> You only need to enter your <strong>Email ID</strong> and <strong>App Password</strong>. The system will auto-detect Gmail/Outlook settings, encrypt your credentials with AES-256-GCM, and rotate accounts to prevent hitting daily limits.
            </div>
          </div>

          {loadingAccounts ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading SMTP accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Mail size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>No SMTP Accounts Configured</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 18px' }}>
                Add your email address and 16-character App Password to start delivering exam invitations and OTP codes automatically.
              </p>
              <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ margin: '0 auto' }}>
                <Plus size={16} /> Add First SMTP Account
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sender Email</th>
                    <th>Service / Host</th>
                    <th>Today's Quota</th>
                    <th>Health Status</th>
                    <th>Last Checked</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => {
                    const quotaUsedPercent = Math.min(100, Math.round((acc.sent_today / acc.daily_quota) * 100));
                    return (
                      <tr key={acc.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.sender_email}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{acc.display_name}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {acc.host}:{acc.port}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '90px', height: '6px', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${quotaUsedPercent}%`, height: '100%', background: quotaUsedPercent > 85 ? 'var(--danger)' : 'var(--primary)' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {acc.sent_today} / {acc.daily_quota}
                            </span>
                          </div>
                        </td>
                        <td>
                          {acc.is_healthy ? (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} /> Healthy
                            </span>
                          ) : (
                            <div>
                              <span className="badge badge-danger">
                                <AlertCircle size={12} /> Failing
                              </span>
                              {acc.last_error_message && (
                                <div 
                                  style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', maxWidth: '180px', lineHeight: '1.2' }} 
                                  title={acc.last_error_message}
                                >
                                  {acc.last_error_message}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {acc.last_tested_at ? new Date(acc.last_tested_at).toLocaleString() : 'Not tested'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleTestConnection(acc.id)}
                              disabled={testingId === acc.id}
                              className="btn btn-secondary btn-sm"
                              title="Test SMTP connection and credentials"
                            >
                              {testingId === acc.id ? 'Testing...' : 'Test'}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(acc)}
                              className="btn btn-secondary btn-sm"
                              title="Edit email, password, or host settings"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(acc.id, acc.sender_email)}
                              disabled={deletingId === acc.id}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                              title="Delete SMTP account connection"
                            >
                              <Trash2 size={13} /> {deletingId === acc.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: DELIVERY QUEUE
          ========================================================================= */}
      {activeTab === 'QUEUE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Queue Statistics Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="exam-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
              <span className="stat-label">Pending Queued</span>
              <span className="stat-value" style={{ color: '#2563eb' }}>{queueData.stats?.QUEUED || 0}</span>
            </div>
            <div className="exam-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
              <span className="stat-label">In Processing</span>
              <span className="stat-value" style={{ color: '#d97706' }}>{queueData.stats?.PROCESSING || 0}</span>
            </div>
            <div className="exam-stat-card" style={{ borderLeftColor: '#10b981' }}>
              <span className="stat-label">Delivered Successfully</span>
              <span className="stat-value" style={{ color: '#16a34a' }}>{queueData.stats?.SENT || 0}</span>
            </div>
            <div className="exam-stat-card" style={{ borderLeftColor: '#ef4444' }}>
              <span className="stat-label">Failed / Retries</span>
              <span className="stat-value" style={{ color: '#dc2626' }}>{queueData.stats?.FAILED || 0}</span>
            </div>
          </div>

          {/* Recent Queue Jobs Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Assigned SMTP</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {loadingQueue ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading queue...</td></tr>
                ) : (queueData.recentJobs || []).length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>No recent email jobs in queue.</td></tr>
                ) : (
                  (queueData.recentJobs || []).map(job => (
                    <tr key={job.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>#{job.id}</td>
                      <td style={{ fontWeight: 600 }}>{job.recipient_email}</td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.subject}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{job.sender_email || 'Auto-assigning'}</td>
                      <td>
                        {job.status === 'OPENED' && <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>Opened / Read</span>}
                        {(job.status === 'SENT' || job.status === 'DELIVERED') && <span className="badge badge-success">Reached / Sent</span>}
                        {job.status === 'QUEUED' && <span className="badge badge-warning">On the way / Queued</span>}
                        {job.status === 'PROCESSING' && <span className="badge badge-primary">Sending...</span>}
                        {job.status === 'FAILED' && <span className="badge badge-danger">Not Reached / Failed</span>}
                      </td>
                      <td>{job.attempts} / 3</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(job.updated_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SIMPLIFIED SMTP CONFIGURATION & EDIT MODAL
          ========================================================================= */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-primary)' }}>
                  {modalMode === 'EDIT' ? 'Update SMTP Account' : 'Configure SMTP Account'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {modalMode === 'EDIT' ? 'Modify email credentials, quota, or server connection settings.' : 'Simple setup: Enter your Email ID, App Password, and daily send limit.'}
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm">&times;</button>
            </div>

            <form onSubmit={handleSubmitAccount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* How to get App Password banner */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                    <Key size={14} /> How to get an App Password (Gmail / Google Workspace):
                  </div>
                  1. Visit your <strong>Google Account &gt; Security &gt; 2-Step Verification</strong>.<br />
                  2. Scroll down to <strong>App Passwords</strong> and generate a password for "LMS Exams".<br />
                  3. Paste the generated 16-character password below (your regular login password will not work).
                </div>

                {/* 1. Email Address */}
                <div>
                  <label className="label">Sender Email Address *</label>
                  <input
                    type="email"
                    value={formData.senderEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, senderEmail: e.target.value }))}
                    placeholder="e.g. exams@yourdomain.com or name@gmail.com"
                    className="input"
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    The email address students will see as the sender.
                  </span>
                </div>

                {/* 2. App Password */}
                <div>
                  <label className="label">
                    App Password {modalMode === 'ADD' ? '*' : '(Leave blank to keep existing password)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={modalMode === 'EDIT' ? '•••••••••••••••• (Leave blank to keep existing)' : '16-character App Password (e.g. abcd efgh ijkl mnop)'}
                    className="input"
                    required={modalMode === 'ADD'}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {modalMode === 'EDIT' 
                      ? 'Enter a new 16-character App Password only if you wish to change it.' 
                      : 'Stored securely using AES-256-GCM military-grade encryption.'}
                  </span>
                </div>

                {/* 3. Daily Send Quota */}
                <div>
                  <label className="label">Daily Send Quota (Emails / Day)</label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={formData.dailyQuota}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyQuota: parseInt(e.target.value, 10) }))}
                    className="input"
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Default: 500 emails/day. Protects your account from hitting provider thresholds.
                  </span>
                </div>

                {/* Optional Advanced Settings Toggle */}
                <div style={{ paddingTop: '4px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showAdvanced ? 'Hide Advanced Host & Port Settings' : 'Advanced Settings (Optional: Custom Host, Port)'}
                  </button>

                  {showAdvanced && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label className="label" style={{ fontSize: '11px' }}>Custom Display Name</label>
                        <input
                          type="text"
                          value={formData.displayName}
                          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                          placeholder="e.g. VCUBE Examination Center"
                          className="input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label" style={{ fontSize: '11px' }}>SMTP Host</label>
                          <input
                            type="text"
                            value={formData.host}
                            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                            placeholder="Auto-detected (smtp.gmail.com)"
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label" style={{ fontSize: '11px' }}>Port & Protocol</label>
                          <select
                            value={`${formData.port}-${formData.secureType}`}
                            onChange={(e) => {
                              const [p, s] = e.target.value.split('-');
                              setFormData(prev => ({ ...prev, port: parseInt(p, 10), secureType: s }));
                            }}
                            className="select"
                          >
                            <option value="465-SSL">Port 465 (SSL - Recommended)</option>
                            <option value="587-STARTTLS">Port 587 (STARTTLS)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'EDIT' ? 'Update SMTP Account' : 'Encrypt & Save SMTP Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
