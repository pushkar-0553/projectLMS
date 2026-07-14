import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resumeAPI, resolveAssetUrl } from '../../services/api';
import ResumeViewer from '../../components/resumes/ResumeViewer';

const ResumeSharePage = () => {
  const { token } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // PDF Viewer state
  const [viewerStudent, setViewerStudent] = useState(null);

  useEffect(() => {
    loadCollection();
  }, [token]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await resumeAPI.getPublicCollection(token);
      setCollection(response.data);
      if (response.data && response.data.title) {
        document.title = `Candidate Resumes - ${response.data.title} | VCUBE Placements`;
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'This resume collection is invalid, has expired, or is currently inactive.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (student) => {
    if (student.cloudinary_url) {
      window.open(student.cloudinary_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Fetching candidates catalogue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Access Link Expired or Invalid</h2>
          <p style={styles.errorText}>{error}</p>
          <p style={styles.errorSubtext}>Please contact your LMS coordinator or placement manager for an active sharing link.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Background blobs for premium appearance */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        {/* Portal Header */}
        <header style={styles.portalHeader}>
          <div style={styles.branding}>
            <span style={styles.logoIcon}>🎓</span>
            <span style={styles.logoText}>VCUBE Placements</span>
          </div>
          <span style={styles.badgePublic}>Public Share Catalog</span>
        </header>

        {/* Collection info header card */}
        <div style={styles.headerCard}>
          <div style={styles.metaInfo}>
            <h1 style={styles.collectionTitle}>{collection.title}</h1>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                📅 Created: {new Date(collection.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              <span style={styles.metaItem}>
                👥 Candidates: <strong>{collection.students.length}</strong>
              </span>
            </div>

            {(collection.company_name || collection.salary || collection.jd) && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {collection.company_name && (
                    <span style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🏢 Company: <strong>{collection.company_name}</strong>
                    </span>
                  )}
                  {collection.salary && (
                    <span style={{
                      background: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      💰 Stipend/CTC: <strong>{collection.salary}</strong>
                    </span>
                  )}
                </div>
                {collection.jd && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    color: '#334155'
                  }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💼 Job Description / Requirements</strong>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {collection.jd.startsWith('http') ? (
                        <a href={collection.jd} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: '600', textDecoration: 'underline' }}>
                          View Job Description Document Link 🔗
                        </a>
                      ) : (
                        collection.jd
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={styles.headerAccent} />
        </div>

        {/* Student Table */}
        <div style={styles.tableCard}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate Name</th>
                  <th style={styles.th}>Domain</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Mobile Number</th>
                  <th style={styles.th}>Education & Background</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collection.students.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.emptyCell}>
                      No candidates mapped in this collection yet.
                    </td>
                  </tr>
                ) : (
                  collection.students.map((student) => (
                    <tr key={student.id} style={styles.tr}>
                      <td style={styles.tdName}>
                        <div style={styles.nameBlock}>
                          <span style={styles.nameText}>{student.name}</span>
                          {student.current_location && (
                            <span style={styles.locationText}>📍 {student.current_location}</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.domainBadge,
                          background: student.domain ? '#eef2ff' : '#f8fafc',
                          color: student.domain ? '#4f46e5' : '#64748b',
                          border: student.domain ? '1px solid #c7d2fe' : '1px solid #e2e8f0'
                        }}>
                          {student.domain || 'General'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <a href={`mailto:${student.email}`} style={styles.link}>
                          {student.email}
                        </a>
                      </td>
                      <td style={styles.td}>{student.mobile || '—'}</td>
                      <td style={styles.tdInfo}>
                        <div style={styles.infoBlock}>
                          {student.college && <span style={styles.infoLine}>🏫 {student.college}</span>}
                          {student.passout_year && <span style={styles.infoLine}>🎓 Batch of {student.passout_year}</span>}
                          {student.skills && (
                            <div style={styles.skillsRow}>
                              {student.skills.split(',').slice(0, 3).map((skill, idx) => (
                                <span key={idx} style={styles.skillPill}>{skill.trim()}</span>
                              ))}
                            </div>
                          )}
                          <div style={styles.linksRow}>
                            {student.github && (
                              <a href={student.github.startsWith('http') ? student.github : `https://${student.github}`} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                                🐙 GitHub
                              </a>
                            )}
                            {student.linkedin && (
                              <a href={student.linkedin.startsWith('http') ? student.linkedin : `https://${student.linkedin}`} target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                                🔗 LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={styles.tdActions}>
                        {student.cloudinary_url ? (
                          <div style={styles.actionsGroup}>
                            <button
                              onClick={() => setViewerStudent(student)}
                              style={styles.actionBtnView}
                            >
                              👁️ View Resume
                            </button>
                            <button
                              onClick={() => handleDownload(student)}
                              style={styles.actionBtnDownload}
                            >
                              📥 Download PDF
                            </button>
                          </div>
                        ) : (
                          <span style={styles.noResume}>Resume Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Embed Viewer Modal */}
      {viewerStudent && (
        <ResumeViewer
          student={viewerStudent}
          onClose={() => setViewerStudent(null)}
        />
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  blob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(79, 70, 229, 0.05)',
    top: '-100px',
    right: '-100px',
    pointerEvents: 'none',
    zIndex: 0
  },
  blob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'rgba(14, 165, 233, 0.04)',
    bottom: '-200px',
    left: '-200px',
    pointerEvents: 'none',
    zIndex: 0
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    position: 'relative',
    zIndex: 1
  },
  portalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    fontSize: '24px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  badgePublic: {
    padding: '4px 12px',
    background: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  headerCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    padding: '28px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden'
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)'
  },
  collectionTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 10px'
  },
  metaRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  metaItem: {
    fontSize: '13px',
    color: '#64748b'
  },
  tableCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    padding: '24px',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s',
    '&:hover': {
      background: '#f8fafc'
    }
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#334155'
  },
  tdName: {
    padding: '16px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a'
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  nameText: {
    fontSize: '14px',
    fontWeight: '700'
  },
  locationText: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500'
  },
  domainBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600'
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '500'
  },
  tdInfo: {
    padding: '16px',
    maxWidth: '300px'
  },
  infoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoLine: {
    fontSize: '12px',
    color: '#475569'
  },
  skillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px'
  },
  skillPill: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600'
  },
  linksRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px'
  },
  socialLink: {
    fontSize: '11px',
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '600'
  },
  tdActions: {
    padding: '16px',
    textAlign: 'right'
  },
  actionsGroup: {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: '8px',
    width: '130px'
  },
  actionBtnView: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffffff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  actionBtnDownload: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#1e293b',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  noResume: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  emptyCell: {
    padding: '48px 0',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: '15px',
    color: '#64748b',
    fontWeight: '600'
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '24px'
  },
  errorCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 24px',
    maxWidth: '480px',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '10px'
  },
  errorText: {
    fontSize: '14px',
    color: '#ef4444',
    lineHeight: '1.6',
    marginBottom: '16px',
    fontWeight: '600'
  },
  errorSubtext: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5'
  }
};

export default ResumeSharePage;
