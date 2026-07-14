import React, { useState } from 'react';
import { resumeAPI } from '../../services/api';

const ResumeEditModal = ({ student, onClose, onSave }) => {
  const [domain, setDomain] = useState(student.domain || '');
  const [college, setCollege] = useState(student.college || '');
  const [passoutYear, setPassoutYear] = useState(student.passout_year || '');
  const [currentLocation, setCurrentLocation] = useState(student.current_location || '');
  const [skills, setSkills] = useState(student.skills || '');
  const [github, setGithub] = useState(student.github || '');
  const [linkedin, setLinkedin] = useState(student.linkedin || '');
  
  // File upload state
  const [file, setFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('Latest Resume');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (!selectedFile) return;

    // Validate size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size exceeds the 10 MB limit.');
      return;
    }

    // Validate format (PDF only)
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Update placement information
      await resumeAPI.updatePlacementInfo(student.id, {
        domain,
        college,
        passout_year: passoutYear ? parseInt(passoutYear) : null,
        current_location: currentLocation,
        skills,
        github,
        linkedin
      });

      // 2. Upload file if selected
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('student_id', student.id);
        formData.append('resume_title', uploadTitle);
        
        await resumeAPI.uploadResume(formData);
      }

      setSuccess(true);
      if (onSave) onSave();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Edit Student Info & Resume</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.studentMeta}>
            <span style={styles.metaLabel}>Editing Student:</span>
            <strong style={styles.metaVal}>{student.name} ({student.email})</strong>
          </div>

          {error && <div style={styles.errorAlert}>{error}</div>}
          {success && <div style={styles.successAlert}>🎉 Student details updated successfully!</div>}

          <div style={styles.scrollArea}>
            <div style={styles.formRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select Domain</option>
                  <option value="Frontend">Frontend</option>
                  <option value="MERN">MERN</option>
                  <option value="Java">Java</option>
                  <option value="Python">Python</option>
                  <option value="Testing">Testing</option>
                  <option value="UI/UX">UI/UX</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Passout Year</label>
                <input
                  type="number"
                  value={passoutYear}
                  onChange={(e) => setPassoutYear(e.target.value)}
                  placeholder="e.g. 2025"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>College / University</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College Name"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Current Location</label>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                placeholder="City, State"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Skills (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, Node, SQL, Git"
                style={styles.input}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>GitHub Profile URL</label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="github.com/username"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.resumeSection}>
              <h4 style={styles.sectionTitle}>📄 Update Resume Document</h4>
              {student.has_resume && (
                <p style={styles.currentResumeInfo}>
                  Current file: <strong>{student.resume_title || 'Resume'}</strong> (last updated: {new Date(student.resume_updated_at).toLocaleDateString('en-IN')})
                </p>
              )}

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Upload PDF (Max 10MB)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
              </div>

              {file && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>New Resume Version Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g., Resume V2"
                    style={styles.input}
                  />
                </div>
              )}
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
              disabled={loading}
              style={{
                ...styles.submitBtn,
                background: loading ? '#cbd5e1' : '#0f766e'
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
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
    maxWidth: '560px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
    flexShrink: 0
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
    gap: '16px',
    overflow: 'hidden'
  },
  studentMeta: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    display: 'flex',
    gap: '6px'
  },
  metaLabel: {
    color: '#64748b'
  },
  metaVal: {
    color: '#0f172a'
  },
  scrollArea: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingRight: '6px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
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
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    outline: 'none',
    width: '100%',
    cursor: 'pointer'
  },
  divider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '10px 0'
  },
  resumeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: '#faf5ff',
    border: '1px solid #f3e8ff',
    borderRadius: '10px',
    padding: '14px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#5b21b6',
    margin: 0
  },
  currentResumeInfo: {
    fontSize: '12px',
    color: '#6b21a8',
    margin: 0
  },
  fileInput: {
    padding: '8px',
    fontSize: '13px',
    background: '#ffffff',
    border: '1px dashed #c084fc',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    flexShrink: 0
  },
  cancelBtn: {
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
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
  }
};

export default ResumeEditModal;
