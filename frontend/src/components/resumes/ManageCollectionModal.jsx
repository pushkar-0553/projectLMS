import React, { useState, useEffect } from 'react';
import { resumeAPI } from '../../services/api';

const ManageCollectionModal = ({ collectionId, onClose, onSuccess }) => {
  const [collection, setCollection] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab: 'current' (view/remove enrolled students) or 'add' (select and add new candidates)
  const [activeTab, setActiveTab] = useState('current');
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (collectionId) {
      loadCollectionDetails();
    }
  }, [collectionId]);

  const loadCollectionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [colRes, studentsRes] = await Promise.all([
        resumeAPI.getCollectionDetail(collectionId),
        resumeAPI.getAllResumes()
      ]);

      setCollection(colRes.data);
      setAllStudents(studentsRes.data || []);
    } catch (err) {
      console.error('Failed to load collection details:', err);
      setError('Could not load collection details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Action: Remove candidate from link
  const handleRemoveCandidate = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName} from this collection link?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await resumeAPI.removeStudentFromCollection(collectionId, studentId);
      setCollection(res.data.collection);
      setSuccessMsg(`${studentName} removed from collection.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Remove student error:', err);
      setError(err.response?.data?.message || 'Failed to remove candidate.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add selected candidates to link
  const handleAddCandidates = async () => {
    if (selectedToAdd.length === 0) return;

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await resumeAPI.addStudentsToCollection(collectionId, selectedToAdd);
      setCollection(res.data.collection);
      setSelectedToAdd([]);
      setSuccessMsg(`Added ${selectedToAdd.length} candidate(s) to collection link!`);
      setActiveTab('current');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Add students error:', err);
      setError(err.response?.data?.message || 'Failed to add candidates.');
    } finally {
      setActionLoading(false);
    }
  };

  // Candidates currently enrolled in this collection
  const enrolledStudents = collection?.students || [];
  const enrolledStudentIds = enrolledStudents.map(s => s.id);

  // Available students not yet in this collection
  const availableStudents = allStudents.filter(s => !enrolledStudentIds.includes(s.id));
  const filteredAvailableStudents = availableStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.domain && s.domain.toLowerCase().includes(q)) ||
      (s.batch && s.batch.toLowerCase().includes(q))
    );
  });

  const toggleSelectStudentToAdd = (id) => {
    setSelectedToAdd(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    if (selectedToAdd.length === filteredAvailableStudents.length) {
      setSelectedToAdd([]);
    } else {
      setSelectedToAdd(filteredAvailableStudents.map(s => s.id));
    }
  };

  if (!collectionId) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>⚙️</span>
            <div>
              <h3 style={styles.title}>Manage Candidates in Link</h3>
              <p style={styles.subtitle}>
                {collection?.title || 'Collection'} · {enrolledStudents.length} Candidates Enrolled
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('current')}
            style={{ ...styles.tab, ...(activeTab === 'current' ? styles.activeTab : {}) }}
          >
            👤 Enrolled Candidates ({enrolledStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{ ...styles.tab, ...(activeTab === 'add' ? styles.activeTab : {}) }}
          >
            ➕ Add New Candidates ({availableStudents.length} available)
          </button>
        </div>

        {/* Feedback alerts */}
        {error && <div style={styles.errorAlert}>{error}</div>}
        {successMsg && <div style={styles.successAlert}>✅ {successMsg}</div>}

        {/* Body */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading candidates...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Enrolled Candidates List */}
              {activeTab === 'current' && (
                <div style={styles.tabContent}>
                  {enrolledStudents.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>No candidates currently enrolled in this collection link.</p>
                      <button onClick={() => setActiveTab('add')} style={styles.primaryBtn}>
                        ➕ Add Candidates Now
                      </button>
                    </div>
                  ) : (
                    <div style={styles.listContainer}>
                      {enrolledStudents.map((s, index) => (
                        <div key={s.id} style={styles.candidateRow}>
                          <div style={styles.candidateInfo}>
                            <span style={styles.indexPill}>#{index + 1}</span>
                            <div>
                              <strong style={styles.candidateName}>{s.name}</strong>
                              <span style={styles.candidateMeta}>
                                {s.domain || 'N/A'} · {s.batch || 'Batch N/A'} · {s.email || ''}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCandidate(s.id, s.name)}
                            disabled={actionLoading}
                            style={styles.removeBtn}
                            title="Remove candidate from collection link"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Add New Candidates */}
              {activeTab === 'add' && (
                <div style={styles.tabContent}>
                  <div style={styles.searchBar}>
                    <input
                      type="text"
                      placeholder="Search candidates by name, email, domain or batch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={styles.searchInput}
                    />
                    {filteredAvailableStudents.length > 0 && (
                      <button onClick={handleSelectAllAvailable} style={styles.selectAllBtn}>
                        {selectedToAdd.length === filteredAvailableStudents.length ? 'Deselect All' : 'Select All Filtered'}
                      </button>
                    )}
                  </div>

                  {filteredAvailableStudents.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>No new available candidates match your search filter.</p>
                    </div>
                  ) : (
                    <div style={styles.listContainer}>
                      {filteredAvailableStudents.map(s => {
                        const isSelected = selectedToAdd.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleSelectStudentToAdd(s.id)}
                            style={{
                              ...styles.selectableRow,
                              ...(isSelected ? styles.selectedRow : {})
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div onClick
                              style={styles.checkbox}
                            />
                            <div>
                              <strong style={styles.candidateName}>{s.name}</strong>
                              <span style={styles.candidateMeta}>
                                {s.domain || 'Domain N/A'} · {s.batch || 'Batch N/A'} · {s.email || ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedToAdd.length > 0 && (
                    <div style={styles.addFooter}>
                      <span>Selected <strong>{selectedToAdd.length}</strong> candidate(s) to add</span>
                      <button
                        onClick={handleAddCandidates}
                        disabled={actionLoading}
                        style={styles.primaryBtn}
                      >
                        {actionLoading ? 'Adding...' : `➕ Add ${selectedToAdd.length} Candidate(s) to Link`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.doneBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f8fafc'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerIcon: {
    fontSize: '24px'
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#64748b'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff'
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#4f46e5',
    borderBottomColor: '#4f46e5',
    background: '#f8fafc'
  },
  errorAlert: {
    margin: '12px 24px 0 24px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px'
  },
  successAlert: {
    margin: '12px 24px 0 24px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  body: {
    padding: '16px 24px',
    flex: 1,
    overflowY: 'auto',
    minHeight: '300px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#64748b'
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '350px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  candidateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#fafafa'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  indexPill: {
    background: '#e2e8f0',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  candidateName: {
    display: 'block',
    fontSize: '14px',
    color: '#0f172a'
  },
  candidateMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b'
  },
  removeBtn: {
    background: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px'
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none'
  },
  selectAllBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  selectableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  selectedRow: {
    background: '#eff6ff',
    borderColor: '#93c5fd'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  addFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f1f5f9',
    fontSize: '13px',
    color: '#475569'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 16px',
    color: '#64748b',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  primaryBtn: {
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
    background: '#f8fafc'
  },
  doneBtn: {
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};

export default ManageCollectionModal;
