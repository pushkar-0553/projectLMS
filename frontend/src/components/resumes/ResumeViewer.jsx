import React from 'react';

/**
 * Premium Inline PDF Resume Viewer Modal
 */
const ResumeViewer = ({ student, onClose }) => {
  if (!student || !student.cloudinary_url) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Resume Preview</h3>
            <p style={styles.modalSubtitle}>{student.name} · {student.email}</p>
          </div>
          <div style={styles.headerActions}>
            <a
              href={student.cloudinary_url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.newTabBtn}
            >
              🔗 Open in New Tab
            </a>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        <div style={styles.modalBody}>
          <iframe
            src={student.cloudinary_url}
            title={`${student.name} Resume`}
            style={styles.iframe}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '950px',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px'
  },
  modalSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  newTabBtn: {
    padding: '8px 16px',
    backgroundColor: '#0f766e',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '22px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f1f5f9'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none'
  }
};

export default ResumeViewer;
