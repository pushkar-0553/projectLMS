import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  validatePhoneNumber,
  generateWhatsAppURL,
  normalizePhoneNumber,
  replaceTemplatePlaceholders,
  logWhatsAppEvent,
  getWhatsAppLogs,
  clearWhatsAppLogs,
  saveRecentTemplate,
  getRecentTemplates
} from '../../../utils/whatsappHelpers';

const PREDEFINED_TEMPLATES = [
  {
    id: 'shortlisted',
    name: 'Resume Shortlisted 🏆',
    template: `Hello {{studentName}},\n\nYour resume has been shortlisted for {{companyName}}.\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'scheduled',
    name: 'Interview Scheduled 📅',
    template: `Hello {{studentName}},\n\nYour interview with {{companyName}} has been scheduled.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nLocation: {{location}}\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'reminder',
    name: 'Interview Reminder 🔔',
    template: `Hello {{studentName}},\n\nThis is a reminder for your upcoming interview with {{companyName}}.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nLocation: {{location}}\n\nPlease carry your original documents.\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'received',
    name: 'Resume Received 📂',
    template: `Hello {{studentName}},\n\nWe have successfully received your resume update. Our team is reviewing it.\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'verification',
    name: 'Document Verification 📄',
    template: `Hello {{studentName}},\n\nYour document verification is scheduled for {{interviewDate}} at {{interviewTime}}.\nLocation: {{location}}\n\nPlease bring all your academic credentials.\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'drive',
    name: 'Placement Drive 🚀',
    template: `Hello {{studentName}},\n\nVCube is conducting a mega Placement Drive for the role of {{jobRole}} at {{companyName}}.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nLocation: {{location}}\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'walkin',
    name: 'Walk-in Interview 🚶',
    template: `Hello {{studentName}},\n\nWalk-in interviews are open for {{jobRole}} at {{companyName}}.\n\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nLocation: {{location}}\n\nRegards,\nVCube Software Solutions`
  },
  {
    id: 'offer',
    name: 'Offer Letter Available 🎉',
    template: `Hello {{studentName}},\n\nCongratulations! Your offer letter from {{companyName}} is now available. Please contact {{coordinatorName}} for details.\n\nRegards,\nVCube Software Solutions`
  }
];

const safelyOpenWhatsAppURL = (url) => {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch (err) {
    console.error('Error opening link safely:', err);
    return false;
  }
};

const WhatsAppModal = ({ students = [], onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'logs'
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [logs, setLogs] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [recentTemplates, setRecentTemplates] = useState([]);

  // Variables for dynamic placeholders
  const [metadata, setMetadata] = useState({
    companyName: '',
    jobRole: '',
    interviewDate: '',
    interviewTime: '',
    location: '',
    coordinatorName: user?.name || ''
  });

  // Multiple students sequential sending flow states
  const isBulk = students.length > 1;
  const [isSequentialMode, setIsSequentialMode] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const modalRef = useRef(null);

  // Load audit logs and recent templates on mount
  useEffect(() => {
    setLogs(getWhatsAppLogs());
    setRecentTemplates(getRecentTemplates());
  }, []);

  // Keyboard Trap & Escape handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first input or textarea on mount
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'select, input:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Set message when template is selected
  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setSelectedTemplateId(val);
    setValidationError('');

    if (!val) {
      setMessage('');
      return;
    }

    // Check predefined templates first
    const matched = PREDEFINED_TEMPLATES.find(t => t.id === val);
    if (matched) {
      setMessage(matched.template);
      return;
    }

    // Check recent templates
    const matchedRecent = recentTemplates.find(t => t.id === val);
    if (matchedRecent) {
      setMessage(matchedRecent.template);
    }
  };

  const handleMetadataChange = (field, val) => {
    setMetadata(prev => ({
      ...prev,
      [field]: val
    }));
  };

  // Get current student object (depends on whether it is single or bulk)
  const getCurrentStudent = () => {
    if (isBulk) {
      return students[currentStudentIndex] || null;
    }
    return students[0] || null;
  };

  const currentStudent = getCurrentStudent();

  // Generate real-time replacement preview
  const getPersonalizedPreview = (studentObj) => {
    if (!studentObj) return '';
    return replaceTemplatePlaceholders(message, studentObj, metadata);
  };

  // Character warning check
  const charLimit = 4096;
  const currentTextLength = message.length;
  const isNearingLimit = currentTextLength > 3800;

  // Single or Bulk Send initialization
  const handleStartSending = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!message.trim()) {
      setValidationError('Please enter a message.');
      return;
    }

    if (isBulk) {
      setIsSequentialMode(true);
      setCurrentStudentIndex(0);
    } else {
      // Single student validation and send
      const student = students[0];
      const checkPhone = validatePhoneNumber(student?.mobile || student?.phone);
      
      if (!checkPhone.isValid) {
        setValidationError(checkPhone.message);
        return;
      }

      const personalizedMessage = getPersonalizedPreview(student);
      const url = generateWhatsAppURL(checkPhone.cleaned, personalizedMessage);

      // Log event to history
      logWhatsAppEvent(student, user, personalizedMessage, 'Opened in WhatsApp');
      // Save template to recently used
      saveRecentTemplate(message, selectedTemplateId ? 
        [...PREDEFINED_TEMPLATES, ...recentTemplates].find(t => t.id === selectedTemplateId)?.name || 'Custom Message'
        : 'Custom Message'
      );

      // Open in a new tab
      if (import.meta.env.DEV) {
        console.log("Raw Phone:", student?.mobile || student?.phone);
        console.log("Normalized Phone:", checkPhone.cleaned);
        console.log("Generated URL:", url);
      }

      safelyOpenWhatsAppURL(url);
      
      onClose();
    }
  };

  // Sequential Send Logic
  const handleOpenCurrentStudentWhatsApp = () => {
    setValidationError('');
    const student = getCurrentStudent();
    if (!student) return;

    const checkPhone = validatePhoneNumber(student.mobile || student.phone);
    if (!checkPhone.isValid) {
      setValidationError(`${student.name}: ${checkPhone.message}`);
      return;
    }

    const personalizedMessage = getPersonalizedPreview(student);
    const url = generateWhatsAppURL(checkPhone.cleaned, personalizedMessage);

    // Save template
    saveRecentTemplate(message, selectedTemplateId ? 
      [...PREDEFINED_TEMPLATES, ...recentTemplates].find(t => t.id === selectedTemplateId)?.name || 'Custom Message'
      : 'Custom Message'
    );

    // Log action
    logWhatsAppEvent(student, user, personalizedMessage, 'Opened in WhatsApp');

    // Open WhatsApp
    if (import.meta.env.DEV) {
      console.log("Raw Phone:", student.mobile || student.phone);
      console.log("Normalized Phone:", checkPhone.cleaned);
      console.log("Generated URL:", url);
    }

    safelyOpenWhatsAppURL(url);

    // Advance queue
    handleNextStudent();
  };

  const handleNextStudent = () => {
    setValidationError('');
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    } else {
      alert('All selected student WhatsApp actions processed!');
      onClose();
    }
  };

  const handlePrevStudent = () => {
    setValidationError('');
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  const handleSkipStudent = () => {
    const student = getCurrentStudent();
    if (student) {
      const personalizedMessage = getPersonalizedPreview(student);
      logWhatsAppEvent(student, user, personalizedMessage, 'Cancelled');
    }
    handleNextStudent();
  };

  // Clear Audit Log
  const handleClearAllLogs = () => {
    if (window.confirm('Are you sure you want to clear all WhatsApp log history? This cannot be undone.')) {
      clearWhatsAppLogs();
      setLogs([]);
    }
  };

  // Filter logs based on search
  const filteredLogs = logs.filter(log => 
    log.studentName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    log.phoneNumber.includes(logSearchQuery) ||
    log.sentBy.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  return (
    <div style={styles.overlay}>
      <div ref={modalRef} style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <span style={styles.icon}>💬</span>
            <h2 style={styles.title}>
              {isBulk ? `Bulk WhatsApp Messenger (${students.length} Selected)` : `Send WhatsApp to ${students[0]?.name}`}
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close modal">✕</button>
        </div>

        {/* Tab Selector */}
        {!isSequentialMode && (
          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab('send')}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === 'send' ? '3px solid var(--primary, #4f46e5)' : 'none',
                color: activeTab === 'send' ? 'var(--primary, #4f46e5)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'send' ? '700' : '500'
              }}
            >
              Compose Message
            </button>
            <button
              onClick={() => {
                setActiveTab('logs');
                setLogs(getWhatsAppLogs());
              }}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === 'logs' ? '3px solid var(--primary, #4f46e5)' : 'none',
                color: activeTab === 'logs' ? 'var(--primary, #4f46e5)' : 'var(--text-muted, #64748b)',
                fontWeight: activeTab === 'logs' ? '700' : '500'
              }}
            >
              Audit History
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={styles.body}>
          {activeTab === 'send' ? (
            !isSequentialMode ? (
              /* Compose view (Single or initial Bulk Screen) */
              <form onSubmit={handleStartSending} style={styles.form}>
                
                {/* Single Student Info Cards */}
                {!isBulk && currentStudent && (
                  <div style={styles.infoCard}>
                    <div style={styles.infoRow}>
                      <div style={styles.infoCol}>
                        <span style={styles.infoLabel}>Candidate Name</span>
                        <span style={styles.infoValue}>{currentStudent.name}</span>
                      </div>
                      <div style={styles.infoCol}>
                        <span style={styles.infoLabel}>Phone Number (Read-only)</span>
                        <span style={styles.infoValue}>{currentStudent.mobile || currentStudent.phone || '—'}</span>
                      </div>
                      <div style={styles.infoCol}>
                        <span style={styles.infoLabel}>Email Address</span>
                        <span style={styles.infoValue}>{currentStudent.email || '—'}</span>
                      </div>
                      <div style={styles.infoCol}>
                        <span style={styles.infoLabel}>Resume Status</span>
                        <span style={{
                          ...styles.infoValue,
                          color: currentStudent.has_resume ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
                          fontWeight: '700'
                        }}>
                          {currentStudent.has_resume ? '✅ Uploaded' : '❌ Missing'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Templates Selector */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Message Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={handleTemplateChange}
                    style={styles.select}
                  >
                    <option value="">-- Choose Predefined Template or Recent --</option>
                    <optgroup label="System Templates">
                      {PREDEFINED_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                    {recentTemplates.length > 0 && (
                      <optgroup label="Recently Used Messages">
                        {recentTemplates.map(t => (
                          <option key={t.id} value={t.id}>
                            🕒 {t.template.substring(0, 40)}...
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Grid for Placeholder Input Fields */}
                <div style={styles.metaGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company Name (companyName)</label>
                    <input
                      type="text"
                      value={metadata.companyName}
                      onChange={(e) => handleMetadataChange('companyName', e.target.value)}
                      placeholder="e.g. Google, Accenture"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Job Role (jobRole)</label>
                    <input
                      type="text"
                      value={metadata.jobRole}
                      onChange={(e) => handleMetadataChange('jobRole', e.target.value)}
                      placeholder="e.g. Software Engineer"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Interview Date (interviewDate)</label>
                    <input
                      type="text"
                      value={metadata.interviewDate}
                      onChange={(e) => handleMetadataChange('interviewDate', e.target.value)}
                      placeholder="e.g. 25th July 2026"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Interview Time (interviewTime)</label>
                    <input
                      type="text"
                      value={metadata.interviewTime}
                      onChange={(e) => handleMetadataChange('interviewTime', e.target.value)}
                      placeholder="e.g. 10:00 AM IST"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Location / Link (location)</label>
                    <input
                      type="text"
                      value={metadata.location}
                      onChange={(e) => handleMetadataChange('location', e.target.value)}
                      placeholder="e.g. Online (Zoom) / Office Hub"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Coordinator Name (coordinatorName)</label>
                    <input
                      type="text"
                      value={metadata.coordinatorName}
                      onChange={(e) => handleMetadataChange('coordinatorName', e.target.value)}
                      placeholder="e.g. Mentor Name"
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* Message Body Input */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Message Text Area (supports multiline and placeholders)</label>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="Type your message template here... Use {{studentName}}, {{companyName}}, {{interviewDate}}, etc. to auto-fill candidate details."
                    rows="6"
                    style={{
                      ...styles.textarea,
                      borderColor: validationError && !message.trim() ? 'var(--danger, #ef4444)' : 'var(--border-color, #e2e8f0)'
                    }}
                  />
                  <div style={styles.counterRow}>
                    <span style={{
                      ...styles.counter,
                      color: isNearingLimit ? 'var(--danger, #ef4444)' : 'var(--text-muted, #64748b)',
                      fontWeight: isNearingLimit ? '700' : 'normal'
                    }}>
                      {currentTextLength} / {charLimit} characters {isNearingLimit && '⚠️ (Nearing limits)'}
                    </span>
                  </div>
                </div>

                {/* Live Replacement Preview for Single student */}
                {!isBulk && currentStudent && message.trim() && (
                  <div style={styles.previewContainer}>
                    <span style={styles.previewHeader}>Live Personalised Preview:</span>
                    <div style={styles.previewText}>
                      {getPersonalizedPreview(currentStudent)}
                    </div>
                  </div>
                )}

                {/* Validation Error Alert */}
                {validationError && (
                  <div style={styles.errorAlert}>
                    ⚠️ {validationError}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={styles.footerActions}>
                  <button type="button" onClick={onClose} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn}>
                    {isBulk ? 'Continue to Queue ➡️' : 'Open WhatsApp 💬'}
                  </button>
                </div>
              </form>
            ) : (
              /* Sequential Queue Sending View (Bulk Mode) */
              <div style={styles.queueContainer}>
                <div style={styles.queueHeader}>
                  <span style={styles.queueStep}>
                    Student {currentStudentIndex + 1} of {students.length}
                  </span>
                  <div style={styles.progressBarBg}>
                    <div style={{
                      ...styles.progressBarFill,
                      width: `${((currentStudentIndex + 1) / students.length) * 100}%`
                    }} />
                  </div>
                </div>

                {/* Student Details Grid */}
                {currentStudent && (
                  <div style={styles.queueStudentCard}>
                    <h3 style={styles.studentName}>{currentStudent.name}</h3>
                    <div style={styles.studentMetaRow}>
                      <span style={styles.studentMetaItem}>
                        📞 <strong>Mobile:</strong> {currentStudent.mobile || currentStudent.phone || 'N/A'}
                      </span>
                      <span style={styles.studentMetaItem}>
                        📧 <strong>Email:</strong> {currentStudent.email || 'N/A'}
                      </span>
                      <span style={styles.studentMetaItem}>
                        💼 <strong>Resume:</strong> {currentStudent.has_resume ? 'Uploaded' : 'Missing'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Personalised Preview */}
                {currentStudent && (
                  <div style={styles.previewContainer}>
                    <span style={styles.previewHeader}>Personalised Message Preview for {currentStudent.name}:</span>
                    <div style={styles.previewText}>
                      {getPersonalizedPreview(currentStudent)}
                    </div>
                  </div>
                )}

                {/* Validation Error */}
                {validationError && (
                  <div style={styles.errorAlert}>
                    ⚠️ {validationError}
                  </div>
                )}

                {/* Sequential controls */}
                <div style={styles.queueControls}>
                  <button
                    onClick={handlePrevStudent}
                    disabled={currentStudentIndex === 0}
                    style={currentStudentIndex === 0 ? styles.disabledBtn : styles.secondaryBtn}
                  >
                    ⬅️ Previous Student
                  </button>
                  <button onClick={handleSkipStudent} style={styles.warningBtn}>
                    ⏭️ Skip
                  </button>
                  <button onClick={handleOpenCurrentStudentWhatsApp} style={styles.whatsappSendBtn}>
                    🚀 Open WhatsApp & Next
                  </button>
                </div>

                <div style={styles.queueFooter}>
                  <button onClick={onClose} style={styles.finishBtn}>
                    🏁 Finish Queue
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Audit Logs Tab */
            <div style={styles.logsContainer}>
              <div style={styles.logsHeader}>
                <input
                  type="text"
                  placeholder="Search logs by student name, phone, or sender..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
                <button
                  onClick={handleClearAllLogs}
                  disabled={logs.length === 0}
                  style={logs.length === 0 ? styles.disabledBtn : styles.clearLogsBtn}
                >
                  🗑️ Clear Log History
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div style={styles.emptyLogs}>
                  📂 No audit logs found matching criteria.
                </div>
              ) : (
                <div style={styles.logsTableWrapper}>
                  <table style={styles.logsTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date & Time</th>
                        <th style={styles.th}>Student Name</th>
                        <th style={styles.th}>Phone Number</th>
                        <th style={styles.th}>Sent By (Role)</th>
                        <th style={styles.th}>Message Preview (150 chars)</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr key={log.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '500' }}>{log.date}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>{log.time}</div>
                          </td>
                          <td style={{ ...styles.td, fontWeight: '600' }}>{log.studentName}</td>
                          <td style={styles.td}>{log.phoneNumber}</td>
                          <td style={styles.td}>
                            <div>{log.sentBy}</div>
                            <span style={styles.roleBadge}>{log.role}</span>
                          </td>
                          <td style={{ ...styles.td, fontSize: '12px', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                            "{log.messagePreview}"
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              background: log.status === 'Opened in WhatsApp' ? '#e8f5e9' : '#ffebee',
                              color: log.status === 'Opened in WhatsApp' ? '#2e7d32' : '#c62828'
                            }}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px'
  },
  modal: {
    background: 'var(--bg-card, #ffffff)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '850px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid var(--border-color, #e2e8f0)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-color, #e2e8f0)',
    background: '#f8fafc'
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  icon: {
    fontSize: '24px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-main, #0f172a)',
    margin: 0
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-muted, #64748b)',
    transition: 'color 0.2s',
    padding: '4px'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color, #e2e8f0)',
    background: '#f8fafc'
  },
  tabBtn: {
    padding: '12px 24px',
    fontSize: '14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s'
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  infoCard: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '16px'
  },
  infoRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px'
  },
  infoCol: {
    flex: '1 1 180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  infoValue: {
    fontSize: '13px',
    color: '#166534',
    fontWeight: '500'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-main, #0f172a)'
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    fontSize: '14px',
    outline: 'none',
    background: '#ffffff'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    fontSize: '14px',
    outline: 'none',
    background: '#ffffff'
  },
  textarea: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  counterRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '2px'
  },
  counter: {
    fontSize: '12px'
  },
  previewContainer: {
    background: '#f8fafc',
    border: '1px solid var(--border-color, #e2e8f0)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  previewHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--primary, #4f46e5)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  previewText: {
    fontSize: '13px',
    color: 'var(--text-main, #0f172a)',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
    background: '#ffffff',
    border: '1px dashed #cbd5e1',
    padding: '12px',
    borderRadius: '8px'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  footerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    borderTop: '1px solid var(--border-color, #e2e8f0)',
    paddingTop: '20px'
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    background: '#ffffff',
    color: 'var(--text-muted, #64748b)',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--primary, #4f46e5)',
    color: '#ffffff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  disabledBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    background: '#f1f5f9',
    color: '#94a3b8',
    fontWeight: '600',
    cursor: 'not-allowed',
    fontSize: '14px'
  },
  secondaryBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    background: '#ffffff',
    color: 'var(--text-main, #0f172a)',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  warningBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#b91c1c',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  whatsappSendBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#128c7e',
    color: '#ffffff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },

  // Sequential Queue elements
  queueContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  queueHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  queueStep: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main, #0f172a)'
  },
  progressBarBg: {
    background: '#e2e8f0',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    background: 'var(--primary, #4f46e5)',
    height: '100%',
    transition: 'width 0.3s ease'
  },
  queueStudentCard: {
    background: '#f8fafc',
    border: '1px solid var(--border-color, #e2e8f0)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-main, #0f172a)',
    margin: 0
  },
  studentMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '13px',
    color: 'var(--text-muted, #64748b)'
  },
  studentMetaItem: {},
  queueControls: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '10px'
  },
  queueFooter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '12px',
    borderTop: '1px solid var(--border-color, #e2e8f0)',
    paddingTop: '20px'
  },
  finishBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#0f172a',
    color: '#ffffff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px'
  },

  // Audit Logs layout
  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px'
  },
  searchInput: {
    flex: '1 1 350px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e2e8f0)',
    fontSize: '13px',
    outline: 'none',
    background: '#ffffff'
  },
  clearLogsBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  emptyLogs: {
    padding: '48px 0',
    textAlign: 'center',
    color: 'var(--text-muted, #64748b)',
    fontStyle: 'italic',
    fontSize: '14px',
    border: '1px dashed var(--border-color, #e2e8f0)',
    borderRadius: '12px'
  },
  logsTableWrapper: {
    overflowX: 'auto',
    border: '1px solid var(--border-color, #e2e8f0)',
    borderRadius: '12px'
  },
  logsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted, #64748b)',
    background: '#f8fafc',
    borderBottom: '1px solid var(--border-color, #e2e8f0)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px',
    color: 'var(--text-main, #0f172a)',
    borderBottom: '1px solid var(--border-color, #e2e8f0)'
  },
  tr: {
    background: '#ffffff',
    transition: 'background 0.2s',
    ':hover': {
      background: '#f8fafc'
    }
  },
  roleBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    background: '#e0e7ff',
    color: '#4338ca',
    marginTop: '4px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700'
  }
};

export default WhatsAppModal;
