import React, { useState } from 'react';
import { resumeAPI } from '../../services/api';

const ResumeUpload = ({ studentId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('Resume');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');
    setSuccess(false);

    if (!selectedFile) return;

    // Validate size (10 MB)
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
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('student_id', studentId);
      formData.append('resume_title', title);

      await resumeAPI.uploadResume(formData);
      setSuccess(true);
      setFile(null);
      setTitle('Resume');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Upload Resume</h3>
      <p style={styles.subtitle}>Upload your latest resume in PDF format (Max size: 10MB).</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>🎉 Resume uploaded successfully!</div>}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Resume Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Full Stack developer Resume"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Choose PDF File</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          style={{
            ...styles.uploadBtn,
            background: file && !loading ? '#0f766e' : '#cbd5e1',
            cursor: file && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 20px'
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
  successAlert: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
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
    outline: 'none'
  },
  fileInput: {
    padding: '10px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    outline: 'none',
    cursor: 'pointer'
  },
  uploadBtn: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    marginTop: '8px',
    transition: 'background 0.2s'
  }
};

export default ResumeUpload;
