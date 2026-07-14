import React, { useState, useEffect } from 'react';
import { resumeAPI } from '../../services/api';
import ResumeFilters from '../../components/resumes/ResumeFilters';
import ResumeTable from '../../components/resumes/ResumeTable';
import ResumeViewer from '../../components/resumes/ResumeViewer';
import ResumeCollectionModal from '../../components/resumes/ResumeCollectionModal';
import CollectionsList from '../../components/resumes/CollectionsList';
import ResumeEditModal from '../../components/resumes/ResumeEditModal';

const ResumeDashboard = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    domain: '',
    batch: '',
    status: '',
    date: 'all'
  });
  const [batches, setBatches] = useState([]);

  // Selections
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Modals
  const [viewerStudent, setViewerStudent] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [notesStudent, setNotesStudent] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Phase 2 states
  const [collections, setCollections] = useState([]);
  const [editStudent, setEditStudent] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    hasResume: 0,
    missingResume: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [students, searchQuery, filters]);

  const loadCollections = async () => {
    try {
      const response = await resumeAPI.getAllCollections();
      setCollections(response.data);
    } catch (err) {
      console.error('Error loading collections history:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await resumeAPI.getAllResumes();
      setStudents(response.data);

      // Extract unique batches list
      const uniqueBatches = [
        ...new Set(response.data.map(s => s.batch_name || s.batch).filter(Boolean))
      ];
      setBatches(uniqueBatches);

      // Compute general statistics
      const total = response.data.length;
      const hasResume = response.data.filter(s => s.has_resume === 1).length;
      setStats({
        total,
        hasResume,
        missingResume: total - hasResume
      });

      // Load collections in background
      await loadCollections();
    } catch (err) {
      console.error(err);
      setError('Failed to fetch students and resumes. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...students];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.mobile && s.mobile.toLowerCase().includes(q))
      );
    }

    // 2. Domain Filter
    if (filters.domain) {
      result = result.filter(s => s.domain === filters.domain);
    }

    // 3. Batch Filter
    if (filters.batch) {
      result = result.filter(s => s.batch_name === filters.batch || s.batch === filters.batch);
    }

    // 4. Resume Status Filter
    if (filters.status) {
      if (filters.status === 'has_resume') {
        result = result.filter(s => s.has_resume === 1);
      } else if (filters.status === 'missing') {
        result = result.filter(s => s.has_resume === 0);
      }
    }

    // 5. Updated Date Filter
    if (filters.date && filters.date !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);

      result = result.filter(s => {
        if (!s.resume_updated_at) return false;
        const updatedTime = new Date(s.resume_updated_at);

        if (filters.date === 'today') {
          return updatedTime >= startOfDay;
        } else if (filters.date === 'yesterday') {
          return updatedTime >= yesterday && updatedTime < startOfDay;
        } else if (filters.date === 'days_ago') {
          const sevenDaysAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          return updatedTime >= sevenDaysAgo && updatedTime < yesterday;
        }
        return true;
      });
    }

    setFilteredStudents(result);
  };

  // Bulk selection handlers
  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = (pageStudentIds, select) => {
    if (select) {
      setSelectedStudentIds(prev => [
        ...prev,
        ...pageStudentIds.filter(id => !prev.includes(id))
      ]);
    } else {
      setSelectedStudentIds(prev =>
        prev.filter(id => !pageStudentIds.includes(id))
      );
    }
  };

  // Resume action handlers
  const handleViewResume = (student) => {
    if (student.cloudinary_url) {
      setViewerStudent(student);
    } else {
      alert('Resume not uploaded yet');
    }
  };

  const handleDownloadResume = (student) => {
    if (student.cloudinary_url) {
      window.open(student.cloudinary_url, '_blank');
    } else {
      alert('Resume not uploaded yet');
    }
  };

  // Note management handlers
  const handleOpenNotes = (student) => {
    setNotesStudent(student);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const response = await resumeAPI.addNote({
        student_id: notesStudent.id,
        note: newNote
      });

      // Update local state in-place
      const addedNoteObj = response.data.note;
      
      const updatedStudents = students.map(s => {
        if (s.id === notesStudent.id) {
          const updatedNotes = [addedNoteObj, ...(s.notes || [])];
          return { ...s, notes: updatedNotes };
        }
        return s;
      });
      
      setStudents(updatedStudents);
      
      // Update modal student details
      setNotesStudent(prev => ({
        ...prev,
        notes: [addedNoteObj, ...(prev.notes || [])]
      }));

      setNewNote('');
    } catch (err) {
      console.error(err);
      alert('Failed to add note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this private note?')) return;

    try {
      await resumeAPI.deleteNote(noteId);

      const updatedStudents = students.map(s => {
        if (s.id === notesStudent.id) {
          const updatedNotes = (s.notes || []).filter(n => n.id !== noteId);
          return { ...s, notes: updatedNotes };
        }
        return s;
      });

      setStudents(updatedStudents);

      setNotesStudent(prev => ({
        ...prev,
        notes: (prev.notes || []).filter(n => n.id !== noteId)
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to delete note.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Upper header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Placement Resume Hub</h1>
          <p style={styles.subtitle}>Manage student profile metadata, view PDF resumes, and create public links for HR recruiters.</p>
        </div>
      </div>

      {/* Analytics stat strip */}
      <div style={styles.statStrip}>
        <div style={styles.statCard}>
          <span style={styles.statVal}>{stats.total}</span>
          <span style={styles.statLabel}>Total Students</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <span style={{ ...styles.statVal, color: '#10b981' }}>{stats.hasResume}</span>
          <span style={styles.statLabel}>Resumes Uploaded</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #ef4444' }}>
          <span style={{ ...styles.statVal, color: '#ef4444' }}>{stats.missingResume}</span>
          <span style={styles.statLabel}>Missing Resumes</span>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.dashboardGrid}>
        {/* Main interactive candidate list */}
        <div style={styles.mainTableArea}>
          {/* Filter and Search components */}
          <ResumeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            batches={batches}
          />

          {/* Students list table */}
          {loading ? (
            <div style={styles.loaderContainer}>
              <div style={styles.spinner} />
              <span style={styles.loaderText}>Loading Resume Dashboard...</span>
            </div>
          ) : (
            <ResumeTable
              students={filteredStudents}
              selectedStudentIds={selectedStudentIds}
              onToggleSelectStudent={handleToggleSelectStudent}
              onSelectAllStudents={handleSelectAllStudents}
              onViewResume={handleViewResume}
              onDownloadResume={handleDownloadResume}
              onManageNotes={handleOpenNotes}
              onEditStudent={(s) => setEditStudent(s)}
            />
          )}
        </div>

        {/* Sidebar history card */}
        <div style={styles.sidebarArea}>
          <CollectionsList
            collections={collections}
            onRefresh={loadCollections}
          />
        </div>
      </div>

      {/* Selected Action drawer */}
      {selectedStudentIds.length > 0 && (
        <div style={styles.drawer}>
          <div style={styles.drawerContent}>
            <div>
              <span style={styles.drawerCount}>{selectedStudentIds.length}</span>
              <span style={styles.drawerLabel}>Candidates Selected</span>
            </div>
            <button
              onClick={() => setShowCollectionModal(true)}
              style={styles.drawerBtn}
            >
              💼 Generate Share Link
            </button>
          </div>
        </div>
      )}

      {/* Direct edit info and resume modal */}
      {editStudent && (
        <ResumeEditModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSave={loadData}
        />
      )}

      {/* Embed Viewer Modals */}
      {viewerStudent && (
        <ResumeViewer
          student={viewerStudent}
          onClose={() => setViewerStudent(null)}
        />
      )}

      {/* Collection Generator Modal */}
      {showCollectionModal && (
        <ResumeCollectionModal
          selectedStudentIds={selectedStudentIds}
          onClose={() => {
            setShowCollectionModal(false);
            setSelectedStudentIds([]); // Clear selection after generating
          }}
          onSuccess={loadData}
        />
      )}

      {/* Private Notes Drawer Modal */}
      {notesStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.notesModal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Private Mentor Notes</h3>
                <p style={styles.modalSubtitle}>{notesStudent.name} · {notesStudent.email}</p>
              </div>
              <button onClick={() => setNotesStudent(null)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.modalBody}>
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} style={styles.noteForm}>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a private mentor comment... (e.g. Strong React skills, Good communication, Needs DSA improvement)"
                  rows="3"
                  required
                  style={styles.textarea}
                />
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  style={styles.submitNoteBtn}
                >
                  {submittingNote ? 'Saving...' : 'Add Private Note'}
                </button>
              </form>

              {/* Notes List */}
              <h4 style={styles.notesListTitle}>Note History</h4>
              <div style={styles.notesList}>
                {!notesStudent.notes || notesStudent.notes.length === 0 ? (
                  <p style={styles.noNotesText}>No private notes written for this student yet.</p>
                ) : (
                  notesStudent.notes.map((note) => (
                    <div key={note.id} style={styles.noteItem}>
                      <div style={styles.noteHeader}>
                        <span style={styles.noteAuthor}>
                          👤 {note.author_name || 'Mentor'} ({note.author_role || 'faculty'})
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          style={styles.deleteNoteBtn}
                          title="Delete note"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      <p style={styles.noteContent}>{note.note}</p>
                      <span style={styles.noteDate}>
                        {new Date(note.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '24px 20px 80px'
  },
  dashboardGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'start',
    width: '100%',
    marginBottom: '24px'
  },
  mainTableArea: {
    flex: '1 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0
  },
  sidebarArea: {
    width: '100%',
    maxWidth: '350px',
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'sticky',
    top: '24px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  statStrip: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  statCard: {
    flex: '1 1 200px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #4f46e5',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: '1.2'
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px'
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
    gap: '16px'
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loaderText: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  drawer: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0f172a',
    color: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2)',
    padding: '14px 28px',
    width: '90%',
    maxWidth: '600px',
    zIndex: 999
  },
  drawerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  drawerCount: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#38bdf8',
    marginRight: '8px'
  },
  drawerLabel: {
    fontSize: '14px',
    fontWeight: '600'
  },
  drawerBtn: {
    padding: '10px 18px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  notesModal: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '550px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0'
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748b'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical'
  },
  submitNoteBtn: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  notesListTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#475569',
    margin: '10px 0 0',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '8px'
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  noNotesText: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '10px 0',
    fontStyle: 'italic'
  },
  noteItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  noteAuthor: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase'
  },
  deleteNoteBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '11px',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '600'
  },
  noteContent: {
    fontSize: '13px',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.5'
  },
  noteDate: {
    fontSize: '10px',
    color: '#94a3b8',
    alignSelf: 'flex-end'
  }
};

export default ResumeDashboard;
