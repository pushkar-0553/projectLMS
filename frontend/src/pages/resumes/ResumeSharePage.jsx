import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { resumeAPI, resolveAssetUrl } from '../../services/api';
import ResumeViewer from '../../components/resumes/ResumeViewer';
import PlacementShareHubModal from '../../components/resumes/PlacementShareHubModal';
import styles from './ResumeSharePage.styles';


const ResumeSharePage = () => {
  const { token } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter states for public collection page (0% server load)
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [passoutYearFilter, setPassoutYearFilter] = useState('');

  // PDF Viewer state
  const [viewerStudent, setViewerStudent] = useState(null);

  // Bulk Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Recruiter Evaluation Modal states
  const [evaluationStudent, setEvaluationStudent] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Share Center Dialog state
  const [showShareHub, setShowShareHub] = useState(false);

  useEffect(() => {
    loadCollection();
  }, [token]);

  // Extract unique domains and passout years / batches from collection candidates
  const uniqueDomains = useMemo(() => {
    if (!collection?.students) return [];
    return [...new Set(collection.students.map(s => s.domain).filter(Boolean))].sort();
  }, [collection]);

  const uniquePassoutYears = useMemo(() => {
    if (!collection?.students) return [];
    return [...new Set(collection.students.map(s => s.passout_year || s.batch).filter(Boolean))].sort();
  }, [collection]);

  // Efficient in-memory filtered candidate list (0% server load)
  const filteredStudents = useMemo(() => {
    if (!collection?.students) return [];
    let list = collection.students;

    // 1. Comprehensive multi-field text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.toLowerCase().includes(q)) ||
        (s.skills && s.skills.toLowerCase().includes(q)) ||
        (s.college && s.college.toLowerCase().includes(q)) ||
        (s.current_location && s.current_location.toLowerCase().includes(q)) ||
        (s.passout_year && String(s.passout_year).toLowerCase().includes(q)) ||
        (s.domain && s.domain.toLowerCase().includes(q)) ||
        (s.batch && s.batch.toLowerCase().includes(q))
      );
    }

    // 2. Domain Filter
    if (domainFilter) {
      list = list.filter(s => s.domain === domainFilter);
    }

    // 3. Evaluation Status Filter
    if (statusFilter) {
      if (statusFilter === 'pending') {
        list = list.filter(s => !s.review_status || s.review_status === 'pending');
      } else {
        list = list.filter(s => s.review_status === statusFilter);
      }
    }

    // 4. Passout Year / Batch Filter
    if (passoutYearFilter) {
      list = list.filter(s => String(s.passout_year) === passoutYearFilter || String(s.batch) === passoutYearFilter);
    }

    return list;
  }, [collection, searchQuery, domainFilter, statusFilter, passoutYearFilter]);

  const allSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;
  const studentsList = Array.isArray(collection?.students) ? collection.students : [];

  const loadCollection = async () => {
    try {
      setLoading(true);
      setError('');
      if (!token) {
        setError('No share token provided in URL.');
        return;
      }
      const response = await resumeAPI.getPublicCollection(token);
      if (!response.data || !response.data.id) {
        setError('This resume collection is invalid, has expired, or is currently inactive.');
        setCollection(null);
      } else {
        setCollection(response.data);
        if (response.data.title) {
          document.title = `Candidate Resumes - ${response.data.title} | VCUBE Placements`;
        }
      }
    } catch (err) {
      console.error('Error fetching collection:', err);
      setCollection(null);
      setError(
        err.response?.data?.message ||
        'This resume collection is invalid, has expired, or is currently inactive.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Single PDF download hitting backend rename route
  const handleDownload = (student) => {
    if (student.cloudinary_url || student.file_name || student.resume_file_name) {
      const downloadUrl = resumeAPI.getPublicSingleDownloadUrl(token, student.id);
      window.location.href = downloadUrl;
    }
  };

  // Bulk ZIP download hitting backend zip builder
  const handleDownloadBulkZIP = () => {
    if (!collection || !collection.students) return;

    // If specific candidates are checked, download only those. Otherwise, download all in the collection.
    const idsToDownload = selectedStudentIds.length > 0
      ? selectedStudentIds
      : collection.students.filter(s => s.cloudinary_url || s.file_name || s.resume_file_name).map(s => s.id);

    if (idsToDownload.length === 0) {
      alert('No candidates with uploaded resumes found for download.');
      return;
    }

    const downloadUrl = resumeAPI.getPublicBulkDownloadUrl(token, idsToDownload);
    window.location.href = downloadUrl;
    setSelectedStudentIds([]); // Clear selection
  };

  // Submit recruiter evaluation review
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSubmittingReview(true);

    try {
      await resumeAPI.submitPublicReview(token, {
        student_id: evaluationStudent.id,
        review_status: reviewStatus,
        review_comment: reviewComment
      });

      // Update local state details in-place
      const studentsArr = collection.students || [];
      const updatedStudents = studentsArr.map(s => {
        if (s.id === evaluationStudent.id) {
          return {
            ...s,
            review_status: reviewStatus,
            review_comment: reviewComment,
            reviewed_at: new Date()
          };
        }
        return s;
      });

      setCollection(prev => ({
        ...prev,
        students: updatedStudents
      }));

      setEvaluationStudent(null);
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusPillStyle = (status) => {
    switch (status) {
      case 'selected':
        return { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
      case 'unselected':
        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'go_to_next':
        return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
      default:
        return { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'selected': return 'SELECTED ✅';
      case 'unselected': return 'UNSELECTED ❌';
      case 'go_to_next': return 'GO TO NEXT ONE ➡️';
      default: return 'PENDING 🕒';
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

  if (error || !collection) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Access Link Expired or Invalid</h2>
          <p style={styles.errorText}>{error || 'This resume collection is invalid, has expired, or is currently inactive.'}</p>
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowShareHub(true)}
              style={styles.shareHubBtn}
              title="Open Placement Sharing & Integration Hub"
            >
              📤 Share & Export Hub
            </button>
            <span style={styles.badgePublic}>Public Share Catalog</span>
          </div>
        </header>

        {/* Collection info header card */}
        <div style={styles.headerCard}>
          <div style={styles.metaInfo}>
            <h1 style={styles.collectionTitle}>{collection?.title || 'Candidate Collection'}</h1>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                📅 Created: {collection?.created_at ? new Date(collection.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }) : 'N/A'}
              </span>
              <span style={styles.metaItem}>
                👥 Candidates: <strong>{studentsList.length}</strong>
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

        {/* Search & Filter Bar for HR / Public Catalog (0% Server Load) */}
        {studentsList.length > 0 && (
          <div style={styles.searchFilterCard}>
            <div style={styles.searchGroup}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search candidates by name, email, skills, college, location, passout year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filtersGroup}>
              {/* Domain Filter */}
              <div style={styles.filterWrapper}>
                <label style={styles.filterLabel}>Domain</label>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  style={styles.select}
                >
                  <option value="">All Domains</option>
                  {uniqueDomains.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Evaluation Status Filter */}
              <div style={styles.filterWrapper}>
                <label style={styles.filterLabel}>Evaluation Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.select}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending 🕒</option>
                  <option value="selected">Selected ✅</option>
                  <option value="unselected">Unselected ❌</option>
                  <option value="go_to_next">Go To Next ➡️</option>
                </select>
              </div>

              {/* Passout Year / Batch Filter */}
              {uniquePassoutYears.length > 0 && (
                <div style={styles.filterWrapper}>
                  <label style={styles.filterLabel}>Passout / Batch</label>
                  <select
                    value={passoutYearFilter}
                    onChange={(e) => setPassoutYearFilter(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">All Passout / Batches</option>
                    {uniquePassoutYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Button */}
              {(searchQuery || domainFilter || statusFilter || passoutYearFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDomainFilter('');
                    setStatusFilter('');
                    setPassoutYearFilter('');
                  }}
                  style={styles.resetBtn}
                >
                  Reset Filters 🔄
                </button>
              )}

              {/* Result Count Pill */}
              <span style={styles.matchCountPill}>
                Showing <strong>{filteredStudents.length}</strong> of <strong>{studentsList.length}</strong> candidates
              </span>
            </div>
          </div>
        )}

        {/* Student Table */}
        <div style={styles.tableCard}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thCheck}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(filteredStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      style={styles.checkbox}
                    />
                  </th>
                  <th style={styles.th}>Candidate Name</th>
                  <th style={styles.th}>Domain</th>
                  <th style={styles.th}>Email Address</th>
                  <th style={styles.th}>Mobile Number</th>
                  <th style={styles.th}>Education & Background</th>
                  <th style={styles.th}>Evaluation Status</th>
                  <th style={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.emptyCell}>
                      {studentsList.length === 0 
                        ? 'No candidates mapped in this collection yet.'
                        : 'No candidates match your current search or filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} style={styles.tr}>
                      <td style={styles.tdCheck}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => {
                            setSelectedStudentIds(prev =>
                              prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]
                            );
                          }}
                          style={styles.checkbox}
                        />
                      </td>
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
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            ...styles.statusBadge,
                            ...getStatusPillStyle(student.review_status)
                          }}>
                            {getStatusLabel(student.review_status)}
                          </span>
                          {student.review_comment && (
                            <span style={styles.commentSnippet} title={student.review_comment}>
                              "{student.review_comment}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.tdActions}>
                        {student.cloudinary_url || student.file_name || student.resume_file_name ? (
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
                            <button
                              onClick={() => {
                                setEvaluationStudent(student);
                                setReviewStatus(student.review_status || 'pending');
                                setReviewComment(student.review_comment || '');
                              }}
                              style={styles.actionBtnEvaluate}
                            >
                              📝 Evaluate
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

      {/* Evaluation Feedback Modal */}
      {evaluationStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.evalModal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Placement Candidate Review</h3>
                <p style={styles.modalSubtitle}>{evaluationStudent.name} · {collection.company_name || 'Placement drive'}</p>
              </div>
              <button onClick={() => setEvaluationStudent(null)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <form onSubmit={handleSaveEvaluation} style={styles.evalForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Evaluation Decision Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="pending">PENDING 🕒</option>
                    <option value="selected">SELECTED ✅</option>
                    <option value="unselected">UNSELECTED ❌</option>
                    <option value="go_to_next">GO TO NEXT ONE ➡️</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Review Feedback / Where is he lacking?</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Enter recruiter feedback details. Explain what skills, DSA knowledge, or soft skills they are lacking in, or why they were selected/unselected..."
                    rows="5"
                    style={styles.textarea}
                  />
                </div>

                {validationError && (
                  <div style={styles.errorAlert}>
                    ⚠️ {validationError}
                  </div>
                )}

                <div style={styles.footerActions}>
                  <button type="button" onClick={() => setEvaluationStudent(null)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingReview} style={styles.primaryBtn}>
                    {submittingReview ? 'Saving...' : 'Save Evaluation Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Embed Viewer Modal */}
      {viewerStudent && (
        <ResumeViewer
          student={viewerStudent}
          onClose={() => setViewerStudent(null)}
        />
      )}

      {/* Placement Sharing & Integration Hub */}
      <PlacementShareHubModal
        isOpen={showShareHub}
        onClose={() => setShowShareHub(false)}
        collection={collection}
        selectedStudentIds={selectedStudentIds}
        token={token}
        onDownloadZIP={handleDownloadBulkZIP}
      />
    </div>
  );
};



export default ResumeSharePage;
