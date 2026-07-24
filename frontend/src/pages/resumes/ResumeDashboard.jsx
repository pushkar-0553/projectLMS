import React, { useState, useEffect } from 'react';
import { resumeAPI } from '../../services/api';
import ResumeFilters from '../../components/resumes/ResumeFilters';
import ResumeTable from '../../components/resumes/ResumeTable';
import ResumeViewer from '../../components/resumes/ResumeViewer';
import ResumeCollectionModal from '../../components/resumes/ResumeCollectionModal';
import CollectionsList from '../../components/resumes/CollectionsList';
import ResumeEditModal from '../../components/resumes/ResumeEditModal';
import WhatsAppModal from '../../components/resumes/whatsapp/WhatsAppModal';
import { useAuth } from '../../context/AuthContext';
import styles from './ResumeDashboard.styles';


const ResumeDashboard = () => {
  const { user } = useAuth();
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

  // WhatsApp states
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappStudents, setWhatsappStudents] = useState([]);

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

    // 1. Multi-Field Comprehensive Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.mobile && s.mobile.toLowerCase().includes(q)) ||
          (s.skills && s.skills.toLowerCase().includes(q)) ||
          (s.college && s.college.toLowerCase().includes(q)) ||
          (s.current_location && s.current_location.toLowerCase().includes(q)) ||
          (s.passout_year && String(s.passout_year).toLowerCase().includes(q)) ||
          (s.domain && s.domain.toLowerCase().includes(q)) ||
          (s.batch && s.batch.toLowerCase().includes(q)) ||
          (s.batch_name && s.batch_name.toLowerCase().includes(q))
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
    if (student.cloudinary_url || student.file_name || student.resume_file_name || student.has_resume) {
      setViewerStudent(student);
    } else {
      alert('Resume not uploaded yet');
    }
  };

  const handleDownloadResume = (student) => {
    if (student.cloudinary_url || student.file_name || student.resume_file_name || student.has_resume) {
      window.location.href = resumeAPI.getSingleDownloadUrl(student.id);
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

  const isAllowedRole = !user || ['superadmin', 'super_admin', 'admin', 'coordinator'].includes(user.role);

  return (
    <div style={styles.container}>
      {/* Upper header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={styles.title}>Placement Resume Hub</h1>
            <p style={styles.subtitle}>Manage student profile metadata, view PDF resumes, and create public links for HR recruiters.</p>
          </div>
          {isAllowedRole && (
            <button
              onClick={() => {
                setWhatsappStudents([]);
                setShowWhatsAppModal(true);
              }}
              style={styles.historyBtn}
              title="View WhatsApp Audit Logs"
            >
              📜 WhatsApp History
            </button>
          )}
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
              onShareResume={(student) => {
                setSelectedStudentIds([student.id]);
                setShowCollectionModal(true);
              }}
              onSendWhatsApp={(student) => {
                setWhatsappStudents([student]);
                setShowWhatsAppModal(true);
              }}
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
            <div style={{ display: 'flex', gap: '12px' }}>
              {isAllowedRole && (
                <button
                  onClick={() => {
                    const selected = students.filter(s => selectedStudentIds.includes(s.id));
                    setWhatsappStudents(selected);
                    setShowWhatsAppModal(true);
                  }}
                  style={styles.drawerBtnWhatsApp}
                >
                  💬 Send WhatsApp
                </button>
              )}
              <button
                onClick={() => {
                  const downloadUrl = resumeAPI.getBulkDownloadUrl(selectedStudentIds);
                  window.location.href = downloadUrl;
                  setSelectedStudentIds([]);
                }}
                style={styles.drawerBtnZip}
              >
                📦 Download ZIP
              </button>
              <button
                onClick={() => setShowCollectionModal(true)}
                style={styles.drawerBtn}
              >
                💼 Generate Share Link
              </button>
            </div>
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
              <div style={{ ...styles.notesList, marginBottom: '24px' }}>
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

              {/* Recruiter Reviews List */}
              <h4 style={styles.notesListTitle}>Recruiter Placement Evaluations</h4>
              <div style={styles.notesList}>
                {!notesStudent.recruiter_reviews || notesStudent.recruiter_reviews.length === 0 ? (
                  <p style={styles.noNotesText}>No recruiter evaluations submitted for this student yet.</p>
                ) : (
                  notesStudent.recruiter_reviews.map((rev) => (
                    <div key={rev.id} style={{ ...styles.noteItem, borderLeft: '4px solid #10b981' }}>
                      <div style={styles.noteHeader}>
                        <span style={{ ...styles.noteAuthor, color: '#10b981' }}>
                          🏢 {rev.company_name || rev.collection_title}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: rev.review_status === 'selected' ? '#d1fae5' : rev.review_status === 'unselected' ? '#fee2e2' : '#fef3c7',
                          color: rev.review_status === 'selected' ? '#065f46' : rev.review_status === 'unselected' ? '#991b1b' : '#92400e',
                          textTransform: 'uppercase'
                        }}>
                          {rev.review_status === 'selected' ? 'Selected ✅' : rev.review_status === 'unselected' ? 'Unselected ❌' : 'Go to Next One ➡️'}
                        </span>
                      </div>
                      <p style={styles.noteContent}>{rev.review_comment || 'No review comment provided.'}</p>
                      <span style={styles.noteDate}>
                        {new Date(rev.reviewed_at).toLocaleString('en-IN', {
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

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          students={whatsappStudents}
          onClose={() => {
            setShowWhatsAppModal(false);
            setWhatsappStudents([]);
          }}
        />
      )}
    </div>
  );
};



export default ResumeDashboard;
