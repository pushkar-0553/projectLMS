import React, { useState } from 'react';

const ResumeUploadModal = ({ studentId, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('Resume');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (!selectedFile) return;

    // Validate size (10 MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds the 10 MB limit. Please select a smaller file.');
      return;
    }

    // Validate format (PDF only)
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('Only PDF files are accepted. Please select a valid PDF.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student_id', studentId);
      formData.append('resume_title', title);

      // We will perform API call. Since it is passed down, we use onUploadSuccess.
      await onUploadSuccess(formData);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Upload PDF Resume</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorAlert}>{error}</div>}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Resume Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Frontend developer, MERN resume"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Select PDF File (Max 10MB)</label>
            <div style={styles.fileInputWrapper}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={styles.fileInput}
                id="resume-pdf-file"
              />
              <label htmlFor="resume-pdf-file" style={styles.fileInputLabel}>
                {file ? `📄 ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : '📁 Choose PDF File'}
              </label>
            </div>
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
              disabled={!file || loading}
              style={{
                ...styles.uploadBtn,
                background: file && !loading ? '#4f46e5' : '#cbd5e1',
                cursor: file && !loading ? 'pointer' : 'not-allowed'
              }}
            >
              {loading ? 'Uploading...' : 'Upload Resume'}
            </button>
          </div>
        </form>
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
    maxWidth: '480px',
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
  fileInputWrapper: {
    position: 'relative',
    width: '100%'
  },
  fileInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer'
  },
  fileInputLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    border: '2px dashed #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4f46e5',
    background: '#f8fafc',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  uploadBtn: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
  }
};

export default ResumeUploadModal;
