import React, { useState, useEffect } from 'react';
import { resumeAPI, resolveAssetUrl } from '../../services/api';

const ResumeHistory = ({ studentId, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      loadHistory();
    }
  }, [studentId, refreshTrigger]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await resumeAPI.getHistory(studentId);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load resume history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ fontSize: '13px', color: '#64748b' }}>Loading history...</div>;
  }

  if (history.length === 0) {
    return <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No resumes uploaded yet.</div>;
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Version History</h4>
      <div style={styles.timeline}>
        {history.map((resume) => (
          <div key={resume.id} style={styles.item}>
            <div style={styles.dotLine}>
              <div style={{
                ...styles.dot,
                background: resume.is_latest ? '#0f766e' : '#cbd5e1'
              }} />
              <div style={styles.line} />
            </div>
            
            <div style={{
              ...styles.contentCard,
              border: resume.is_latest ? '1px solid #99f6e4' : '1px solid #e2e8f0',
              background: resume.is_latest ? '#f0fdfa' : '#ffffff'
            }}>
              <div style={styles.itemHeader}>
                <span style={styles.versionTag}>Version {resume.version}</span>
                {resume.is_latest && <span style={styles.latestBadge}>Latest</span>}
              </div>
              <p style={styles.resumeName}>📄 {resume.resume_title}</p>
              <div style={styles.itemFooter}>
                <span style={styles.dateText}>
                  Uploaded: {new Date(resume.uploaded_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <a
                  href={resume.cloudinary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.downloadLink}
                >
                  📥 Download
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  item: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    position: 'relative'
  },
  dotLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '12px'
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 2,
    border: '2px solid #ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  line: {
    width: '2px',
    flex: 1,
    background: '#e2e8f0',
    position: 'absolute',
    top: '12px',
    bottom: '-16px',
    zIndex: 1
  },
  contentCard: {
    flex: 1,
    borderRadius: '10px',
    padding: '12px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  versionTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase'
  },
  latestBadge: {
    background: '#ccfbf1',
    color: '#115e59',
    fontSize: '9px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase'
  },
  resumeName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 8px'
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateText: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  downloadLink: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0f766e',
    textDecoration: 'none'
  }
};

export default ResumeHistory;
