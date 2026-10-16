import React, { useState, useEffect, useRef } from 'react';
import {
  DEFAULT_MOCK_WA_TEMPLATE,
  MOCK_WA_PRESETS,
  MOCK_WA_PLACEHOLDERS,
  formatMockWhatsAppMessage
} from '../../utils/mockWhatsAppUtils';

const CustomizeWhatsAppModal = ({
  isOpen,
  onClose,
  mockEvent,
  currentTemplate,
  sampleStudent,
  onSaveTemplate,
  loading = false
}) => {
  const [templateText, setTemplateText] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview' for mobile
  const [savedSuccess, setSavedSuccess] = useState(false);
  const textareaRef = useRef(null);

  // Sync initial template
  useEffect(() => {
    if (isOpen) {
      setTemplateText(currentTemplate || DEFAULT_MOCK_WA_TEMPLATE);
      setSavedSuccess(false);
    }
  }, [isOpen, currentTemplate]);

  if (!isOpen) return null;

  // Insert tag at current cursor position
  const handleInsertTag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateText((prev) => (prev ? `${prev} ${tag}` : tag));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prevVal = templateText;
    const nextVal = prevVal.substring(0, start) + tag + prevVal.substring(end);

    setTemplateText(nextVal);

    // Restore cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const handleApplyPreset = (presetTemplate) => {
    setTemplateText(presetTemplate);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset message template to standard default?')) {
      setTemplateText(DEFAULT_MOCK_WA_TEMPLATE);
    }
  };

  const handleSave = async () => {
    const trimmed = templateText.trim();
    const finalTemplate = trimmed || DEFAULT_MOCK_WA_TEMPLATE;
    await onSaveTemplate(finalTemplate);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  // Sample student data for the live preview
  const previewStudent = sampleStudent || {
    student_name: 'Rahul Sharma',
    batch_name: 'Batch A - Full Stack',
    scheduled_start: '10:00',
    scheduled_end: '10:20',
    status: 'SCHEDULED'
  };

  const previewMessage = formatMockWhatsAppMessage(
    templateText,
    previewStudent,
    mockEvent
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <span style={{ fontSize: '20px' }}>💬</span>
              <h2 style={styles.title}>Customize WhatsApp Message</h2>
            </div>
            <p style={styles.subtitle}>
              Configure the prefilled message sent to candidates for "
              {mockEvent?.title || 'Mock Interview'}"
            </p>
          </div>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Preset quick buttons */}
        <div style={styles.presetSection}>
          <span style={styles.presetLabel}>Quick Presets:</span>
          <div style={styles.presetList}>
            {MOCK_WA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.template)}
                style={styles.presetChip}
                title={p.description}
              >
                ✨ {p.title}
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetToDefault}
              style={{ ...styles.presetChip, background: '#f1f5f9', color: '#475569' }}
              title="Reset back to standard template"
            >
              🔄 Default
            </button>
          </div>
        </div>

        {/* Dynamic Placeholders Toolbar */}
        <div style={styles.tagsContainer}>
          <span style={styles.tagsLabel}>Insert Dynamic Tags:</span>
          <div style={styles.tagsGrid}>
            {MOCK_WA_PLACEHOLDERS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => handleInsertTag(item.tag)}
                style={styles.tagBtn}
                title={`Click to insert ${item.label} (e.g. ${item.sample})`}
              >
                <span style={{ color: '#0284c7', fontWeight: 'bold' }}>+</span>{' '}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace (Editor + Live WhatsApp Preview) */}
        <div style={styles.bodyGrid}>
          {/* Text Editor Box */}
          <div style={styles.editorCol}>
            <div style={styles.colHeader}>
              <label style={styles.inputLabel}>
                Message Template (Supports WhatsApp formatting: *bold*, _italic_)
              </label>
              <span style={styles.charCount}>
                {templateText.length} characters
              </span>
            </div>

            <textarea
              ref={textareaRef}
              rows={9}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder="Type your WhatsApp message template here..."
              style={styles.textarea}
            />

            <div style={styles.editorTips}>
              💡 <strong>Tip:</strong> Tags like <code>{`{{student_name}}`}</code> and <code>{`{{slot_time}}`}</code> will automatically fill with each student's real details.
            </div>
          </div>

          {/* Live Preview Box (WhatsApp Style) */}
          <div style={styles.previewCol}>
            <div style={styles.colHeader}>
              <span style={styles.previewHeading}>📱 Live WhatsApp Preview</span>
              <span style={styles.previewBadge}>Candidate: {previewStudent.student_name}</span>
            </div>

            <div style={styles.waPhoneShell}>
              <div style={styles.waChatHeader}>
                <div style={styles.waAvatar}>🎓</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.waContactName}>{previewStudent.student_name}</div>
                  <div style={styles.waOnlineStatus}>Online</div>
                </div>
              </div>

              <div style={styles.waChatBackground}>
                <div style={styles.waBubble}>
                  <div style={styles.waBubbleText}>{previewMessage}</div>
                  <div style={styles.waTimestamp}>
                    10:05 AM <span style={{ color: '#53bdeb' }}>✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {savedSuccess && (
              <span style={styles.successNote}>
                ✓ Message template saved successfully!
              </span>
            )}
          </div>

          <div style={styles.footerBtnGroup}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={styles.saveBtn}
              disabled={loading}
            >
              {loading ? 'Saving...' : '💾 Save Custom Message'}
            </button>
          </div>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    backdropFilter: 'blur(3px)',
    overflowY: 'auto'
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '920px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748b'
  },
  closeBtn: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.15s ease'
  },
  presetSection: {
    padding: '10px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  presetLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  presetList: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  presetChip: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  tagsContainer: {
    padding: '12px 24px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#ffffff'
  },
  tagsLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    display: 'block',
    marginBottom: '8px'
  },
  tagsGrid: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  tagBtn: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    color: '#0369a1',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.15s ease'
  },
  bodyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
    backgroundColor: '#ffffff'
  },
  editorCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  colHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  charCount: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '13.5px',
    lineHeight: '1.55',
    color: '#1e293b',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    minHeight: '200px'
  },
  editorTips: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4'
  },
  previewCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  previewHeading: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  previewBadge: {
    fontSize: '11px',
    background: '#e2e8f0',
    color: '#475569',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '500'
  },
  waPhoneShell: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    height: '100%',
    minHeight: '260px'
  },
  waChatHeader: {
    background: '#075e54',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ffffff'
  },
  waAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  waContactName: {
    fontSize: '13.5px',
    fontWeight: '600',
    lineHeight: '1.2'
  },
  waOnlineStatus: {
    fontSize: '11px',
    color: '#dcf8c6'
  },
  waChatBackground: {
    background: '#efeae2',
    padding: '14px',
    flex: 1,
    overflowY: 'auto',
    backgroundImage: 'radial-gradient(#e0d6c8 1px, transparent 1px)',
    backgroundSize: '16px 16px'
  },
  waBubble: {
    background: '#dcf8c6',
    borderRadius: '8px 8px 0px 8px',
    padding: '10px 12px',
    maxWidth: '92%',
    marginLeft: 'auto',
    boxShadow: '0 1px 1px rgba(0,0,0,0.13)',
    wordBreak: 'break-word',
    position: 'relative'
  },
  waBubbleText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#111827',
    whiteSpace: 'pre-wrap'
  },
  waTimestamp: {
    fontSize: '10px',
    color: '#667781',
    textAlign: 'right',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '3px'
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  successNote: {
    fontSize: '13px',
    color: '#059669',
    fontWeight: '600'
  },
  footerBtnGroup: {
    display: 'flex',
    gap: '10px',
    marginLeft: 'auto'
  },
  cancelBtn: {
    padding: '9px 18px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  saveBtn: {
    padding: '9px 20px',
    borderRadius: '10px',
    border: 'none',
    background: '#25D366',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 211, 102, 0.3)',
    transition: 'all 0.15s ease'
  }
};

export default CustomizeWhatsAppModal;
