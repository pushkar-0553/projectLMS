import React, { useState } from 'react';
import { resumeAPI } from '../../services/api';

const ResumeCollectionModal = ({ selectedStudentIds = [], onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [salary, setSalary] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a collection name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await resumeAPI.createCollection({
        title,
        student_ids: selectedStudentIds,
        company_name: companyName,
        salary,
        jd
      });

      // Construct absolute share link url
      const origin = window.location.origin;
      const fullUrl = `${origin}${response.data.collection.share_url}`;
      
      setShareLink(fullUrl);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Create Resume Collection</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {!shareLink ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <p style={styles.infoText}>
              You have selected <strong>{selectedStudentIds.length}</strong> {selectedStudentIds.length === 1 ? 'student' : 'students'}. Provide a name for this collection to generate a shareable link.
            </p>

            {error && <div style={styles.errorAlert}>{error}</div>}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Collection Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Frontend Hiring, MERN Batch July, React Developers"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Name (Optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google, Accenture, Startup Corp"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Salary / Stipend (Optional)</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 50,000/month or 12 LPA"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Job Description / Link (Optional)</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste Job Description, roles, or JD document URL here..."
                style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitBtn,
                  background: loading ? '#cbd5e1' : '#4f46e5'
                }}
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.successBlock}>
            <div style={styles.successIcon}>🎉</div>
            <h4 style={styles.successTitle}>Collection Created Successfully!</h4>
            <p style={styles.successText}>
              Share this link with HR or clients. Anyone with this link can view the resumes without logging in.
            </p>

            <div style={styles.linkWrapper}>
              <input
                type="text"
                value={shareLink}
                readOnly
                style={styles.linkInput}
              />
              <button onClick={handleCopyLink} style={styles.copyBtn}>
                {copied ? 'Copied! ✅' : 'Copy 📋'}
              </button>
            </div>

            <div style={styles.successActions}>
              <button onClick={onClose} style={styles.doneBtn}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    position: 'relative'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748b'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  infoText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    width: '100%'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px'
  },
  cancelBtn: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  successBlock: {
    textAlign: 'center',
    padding: '10px 0'
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  successTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '8px'
  },
  successText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
    marginBottom: '20px'
  },
  linkWrapper: {
    display: 'flex',
    gap: '8px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '6px',
    alignItems: 'center',
    marginBottom: '24px'
  },
  linkInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    color: '#0f172a',
    padding: '4px 8px',
  },
  copyBtn: {
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  successActions: {
    display: 'flex',
    justifyContent: 'center'
  },
  doneBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    background: '#0f172a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};

export default ResumeCollectionModal;
