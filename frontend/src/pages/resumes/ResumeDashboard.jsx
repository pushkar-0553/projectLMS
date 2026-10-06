import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI, courseAPI } from '../../services/api';
import { useCourse } from '../../context/CourseContext';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCourse, courseSlug } = useCourse();
  const [courses, setCourses] = useState([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

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

  const [allStudents, setAllStudents] = useState([]);
  const [batchSummaries, setBatchSummaries] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [batchCategoryFilter, setBatchCategoryFilter] = useState('all');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    hasResume: 0,
    missingResume: 0,
  });

  const activeCourseId = currentCourse?.id || (selectedCourseFilter ? parseInt(selectedCourseFilter, 10) : null);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      courseAPI.getAll()
        .then(res => {
          if (res.data?.courses) setCourses(res.data.courses);
          else if (Array.isArray(res.data)) setCourses(res.data);
        })
        .catch(err => console.error('Failed to load courses list:', err));
    }
  }, [user]);

  useEffect(() => {
    loadData(activeCourseId);
  }, [activeCourseId, courseSlug]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [allStudents, selectedBatchId, searchQuery, filters, batchSummaries]);

  const loadCollections = async (cId) => {
    try {
      const targetId = cId !== undefined ? cId : activeCourseId;
      const params = targetId ? { courseId: targetId } : {};
      const response = await resumeAPI.getAllCollections(params);
      setCollections(response.data);
    } catch (err) {
      console.error('Error loading collections history:', err);
    }
  };

  const loadData = async (cId) => {
    try {
      setLoading(true);
      setError('');
      const targetId = cId !== undefined ? cId : activeCourseId;
      const params = targetId ? { courseId: targetId } : {};

      // 1. Fetch batch summaries for rectangular cards
      let summaries = [];
      try {
        const batchRes = await resumeAPI.getBatchSummaries(params);
        let list = [];
        if (Array.isArray(batchRes.data)) {
          list = batchRes.data;
        } else if (batchRes.data && typeof batchRes.data === 'object') {
          const bList = batchRes.data.batches || [];
          const uObj = batchRes.data.unassigned;
          list = [...bList];
          if (uObj && Number(uObj.total_students) > 0) {
            list.push(uObj);
          }
        }
        summaries = list.map(b => ({
          ...b,
          has_resume: Number(b.has_resume ?? b.resumes_uploaded ?? 0),
          missing_resume: Number(b.missing_resume ?? b.resumes_missing ?? 0),
          total_students: Number(b.total_students || 0)
        }));
        setBatchSummaries(summaries);
      } catch (bErr) {
        console.error('Error fetching batch summaries:', bErr);
      }

      // 2. Fetch all candidates for this course (default view shows all students)
      const response = await resumeAPI.getAllResumes(params);
      const studentList = response.data || [];
      setAllStudents(studentList);
      setStudents(studentList);

      // Default to 'all' so users see all students before picking specific batches
      setSelectedBatchId('all');

      // Extract unique batches list
      const uniqueBatches = [
        ...new Set(studentList.map(s => s.batch_name || s.batch).filter(Boolean))
      ];
      setBatches(uniqueBatches);

      // Compute general statistics
      const total = studentList.length;
      const hasResume = studentList.filter(s => s.has_resume === 1).length;
      setStats({
        total,
        hasResume,
        missingResume: total - hasResume
      });

      // Load collections in background
      await loadCollections(targetId);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch students and resumes. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    // Crucial: DO NOT clear selectedStudentIds. Candidates selected from other
    // batches remain selected so recruiters can bundle multi-batch candidates into share links!
  };

  const applyFiltersAndSearch = () => {
    let result = [...allStudents];

    // 1. Filter by selected Batch card (or 'all' for all students)
    if (selectedBatchId && selectedBatchId !== 'all') {
      if (selectedBatchId === 'unassigned') {
        result = result.filter(s =>
          (!s.batch_id || s.batch_id === 0) &&
          (!s.batch || s.batch === 'Unassigned' || s.batch.trim() === '')
        );
      } else {
        const currentBatch = batchSummaries.find(b => b.id === selectedBatchId);
        result = result.filter(s =>
          s.batch_id === selectedBatchId ||
          (currentBatch && (s.batch_name === currentBatch.name || s.batch === currentBatch.name))
        );
      }
    }

    // 2. Multi-Field Comprehensive Search Query
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

    // 3. Domain Filter
    if (filters.domain) {
      result = result.filter(s => s.domain === filters.domain);
    }

    // 4. Batch Filter (dropdown)
    if (filters.batch) {
      result = result.filter(s => s.batch_name === filters.batch || s.batch === filters.batch);
    }

    // 5. Resume Status Filter
    if (filters.status) {
      if (filters.status === 'has_resume') {
        result = result.filter(s => s.has_resume === 1);
      } else if (filters.status === 'missing') {
        result = result.filter(s => s.has_resume === 0);
      }
    }

    // 6. Updated Date Filter
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
      
      const updateList = (prev) => prev.map(s => {
        if (s.id === notesStudent.id) {
          const updatedNotes = [addedNoteObj, ...(s.notes || [])];
          return { ...s, notes: updatedNotes };
        }
        return s;
      });

      setAllStudents(updateList);
      setStudents(updateList);
      
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

      const updateList = (prev) => prev.map(s => {
        if (s.id === notesStudent.id) {
          const updatedNotes = (s.notes || []).filter(n => n.id !== noteId);
          return { ...s, notes: updatedNotes };
        }
        return s;
      });

      setAllStudents(updateList);
      setStudents(updateList);

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

  // Multi-batch selected candidates calculation
  const selectedStudentsList = allStudents.filter(s => selectedStudentIds.includes(s.id));
  const selectedBatchesMap = selectedStudentsList.reduce((acc, s) => {
    const bName = s.batch_name || s.batch || 'Unassigned / Unsent';
    acc[bName] = (acc[bName] || 0) + 1;
    return acc;
  }, {});
  const selectedBatchesEntries = Object.entries(selectedBatchesMap);
  const selectedBatchesCount = selectedBatchesEntries.length;
  const selectedBatchesSummaryText = selectedBatchesEntries
    .map(([bName, count]) => `${bName} (${count})`)
    .join(', ');

  const createdBatches = batchSummaries.filter(b => b.id !== 'unassigned');
  const unassignedBatch = batchSummaries.find(b => b.id === 'unassigned');
  const totalAttached = allStudents.filter(s => s.has_resume === 1).length;
  const totalMissing = allStudents.filter(s => s.has_resume === 0).length;
  const totalPct = allStudents.length > 0 ? Math.round((totalAttached / allStudents.length) * 100) : 0;

  return (
    <div style={styles.container}>
      {/* Upper header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={styles.title}>Placement Resume Hub</h1>
              {currentCourse && (
                <span style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  📚 {currentCourse.name} ({currentCourse.code})
                </span>
              )}
            </div>
            <p style={styles.subtitle}>Manage student profile metadata, view PDF resumes, and create public links for HR recruiters.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {user?.role === 'super_admin' && courses.length > 0 && !currentCourse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Filter Course:</label>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentCourse && (
              <button
                onClick={() => {
                  if (user?.role === 'admin' || user?.role === 'super_admin') {
                    navigate(`/${courseSlug}/admin`);
                  } else if (user?.role === 'coordinator') {
                    navigate(`/${courseSlug}/coordinator`);
                  } else if (user?.role === 'faculty') {
                    navigate(`/${courseSlug}/faculty`);
                  } else {
                    navigate(`/${courseSlug}/dashboard`);
                  }
                }}
                style={{
                  ...styles.historyBtn,
                  background: '#f8fafc',
                  color: '#334155',
                  borderColor: '#cbd5e1'
                }}
                title="Return to Course Workspace"
              >
                ← Back to Dashboard
              </button>
            )}
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

      {/* Course Batches Rectangular Cards */}
      {batchSummaries.length > 0 && (
        <div style={styles.batchSection}>
          <div style={styles.batchSectionHeader}>
            <div style={styles.batchSectionTitle}>
              <span>📁 Course Batches & Placement Hub</span>
              <span style={styles.batchCountBadge}>{createdBatches.length} Batches</span>
              {unassignedBatch && unassignedBatch.total_students > 0 && (
                <span style={{ ...styles.batchCountBadge, background: '#fef3c7', color: '#92400e' }}>
                  {unassignedBatch.total_students} Unassigned
                </span>
              )}
            </div>

            {/* View category toggles: All Cards, Created Batches, Unassigned / Unsent */}
            <div style={styles.batchCategoryTabs}>
              <button
                onClick={() => setBatchCategoryFilter('all')}
                style={{
                  ...styles.batchCategoryTab,
                  ...(batchCategoryFilter === 'all' ? styles.batchCategoryTabActive : {})
                }}
              >
                All Cards ({createdBatches.length + (unassignedBatch && unassignedBatch.total_students > 0 ? 1 : 0) + 1})
              </button>
              <button
                onClick={() => setBatchCategoryFilter('created')}
                style={{
                  ...styles.batchCategoryTab,
                  ...(batchCategoryFilter === 'created' ? styles.batchCategoryTabActive : {})
                }}
              >
                Created Batches ({createdBatches.length})
              </button>
              {unassignedBatch && unassignedBatch.total_students > 0 && (
                <button
                  onClick={() => setBatchCategoryFilter('unassigned')}
                  style={{
                    ...styles.batchCategoryTab,
                    ...(batchCategoryFilter === 'unassigned' ? styles.batchCategoryTabActive : {})
                  }}
                >
                  Unassigned / Unsent ({unassignedBatch.total_students})
                </button>
              )}
            </div>
          </div>

          <div style={styles.batchCardsGrid}>
            {/* Card 0: All Candidates (Always available as primary card) */}
            {(batchCategoryFilter === 'all' || batchCategoryFilter === 'created') && (
              <div
                onClick={() => handleSelectBatch('all')}
                style={{
                  ...styles.batchCard,
                  ...(selectedBatchId === 'all' ? styles.batchCardActive : {}),
                  borderLeft: selectedBatchId === 'all' ? '4px solid #3b82f6' : '4px solid #6366f1'
                }}
                title="Click to view all students across all batches"
              >
                <div style={styles.batchCardTop}>
                  <span style={styles.batchCardName}>
                    {selectedBatchId === 'all' ? '🔷 ' : '👥 '}
                    All Candidates
                  </span>
                  <span style={styles.batchStudentCount}>
                    {allStudents.length} {allStudents.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>

                <div style={styles.batchCardMetrics}>
                  <span style={styles.batchMetricPillGreen}>
                    ✓ {totalAttached} Attached
                  </span>
                  <span style={styles.batchMetricPillRed}>
                    ✕ {totalMissing} Missing
                  </span>
                  {selectedStudentIds.length > 0 && (
                    <span style={styles.batchSelectedPill}>
                      ✓ {selectedStudentIds.length} Selected
                    </span>
                  )}
                </div>

                <div style={styles.batchProgressBarBg}>
                  <div style={{ ...styles.batchProgressBarFill, width: `${totalPct}%` }} />
                </div>
              </div>
            )}

            {/* Created Batches Cards */}
            {(batchCategoryFilter === 'all' || batchCategoryFilter === 'created') && createdBatches.map((b) => {
              const isSelected = selectedBatchId === b.id;
              const pct = b.total_students > 0 ? Math.round((b.has_resume / b.total_students) * 100) : 0;
              const numSelected = selectedStudentsList.filter(s => s.batch_id === b.id || s.batch_name === b.name || s.batch === b.name).length;

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectBatch(b.id)}
                  style={{
                    ...styles.batchCard,
                    ...(isSelected ? styles.batchCardActive : {})
                  }}
                  title={`Click to view students in ${b.name}`}
                >
                  <div style={styles.batchCardTop}>
                    <span style={styles.batchCardName}>
                      {isSelected ? '🔷 ' : '📁 '}
                      {b.name}
                    </span>
                    <span style={styles.batchStudentCount}>
                      {b.total_students} {b.total_students === 1 ? 'Student' : 'Students'}
                    </span>
                  </div>

                  <div style={styles.batchCardMetrics}>
                    <span style={styles.batchMetricPillGreen}>
                      ✓ {b.has_resume} Attached
                    </span>
                    <span style={styles.batchMetricPillRed}>
                      ✕ {b.missing_resume} Missing
                    </span>
                    {numSelected > 0 && (
                      <span style={styles.batchSelectedPill}>
                        ✓ {numSelected} Selected
                      </span>
                    )}
                  </div>

                  <div style={styles.batchProgressBarBg}>
                    <div style={{ ...styles.batchProgressBarFill, width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            {/* Unassigned / Unsent Batch Card */}
            {(batchCategoryFilter === 'all' || batchCategoryFilter === 'unassigned') && unassignedBatch && unassignedBatch.total_students > 0 && (() => {
              const isSelected = selectedBatchId === 'unassigned';
              const pct = unassignedBatch.total_students > 0 ? Math.round((unassignedBatch.has_resume / unassignedBatch.total_students) * 100) : 0;
              const numSelected = selectedStudentsList.filter(s => (!s.batch_id || s.batch_id === 0) && (!s.batch || s.batch === 'Unassigned' || s.batch.trim() === '')).length;

              return (
                <div
                  key="unassigned"
                  onClick={() => handleSelectBatch('unassigned')}
                  style={{
                    ...styles.batchCard,
                    ...(isSelected ? styles.batchCardActive : {}),
                    borderColor: isSelected ? '#3b82f6' : '#fed7aa',
                    background: isSelected ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' : '#fffdfa'
                  }}
                  title="Click to view unassigned / unsent students"
                >
                  <div style={styles.batchCardTop}>
                    <span style={{ ...styles.batchCardName, color: '#9a3412' }}>
                      {isSelected ? '🔷 ' : '⏳ '}
                      Unassigned / Unsent
                    </span>
                    <span style={{ ...styles.batchStudentCount, background: '#ffedd5', color: '#9a3412' }}>
                      {unassignedBatch.total_students} {unassignedBatch.total_students === 1 ? 'Student' : 'Students'}
                    </span>
                  </div>

                  <div style={styles.batchCardMetrics}>
                    <span style={styles.batchMetricPillGreen}>
                      ✓ {unassignedBatch.has_resume} Attached
                    </span>
                    <span style={styles.batchMetricPillRed}>
                      ✕ {unassignedBatch.missing_resume} Missing
                    </span>
                    {numSelected > 0 && (
                      <span style={styles.batchSelectedPill}>
                        ✓ {numSelected} Selected
                      </span>
                    )}
                  </div>

                  <div style={styles.batchProgressBarBg}>
                    <div style={{ ...styles.batchProgressBarFill, width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{
        ...styles.dashboardGrid,
        paddingBottom: selectedStudentIds.length > 0 ? '120px' : '0px'
      }}>
        {/* Main interactive candidate list */}
        <div style={styles.mainTableArea}>
          {/* Active batch view banner */}
          {selectedBatchId && selectedBatchId !== 'all' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              color: '#1e40af',
              fontWeight: '500',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>
                  Viewing Batch: <strong>{batchSummaries.find(b => b.id === selectedBatchId)?.name || (selectedBatchId === 'unassigned' ? 'Unassigned / Unsent' : 'Selected Batch')}</strong> ({filteredStudents.length} candidates)
                </span>
                {(() => {
                  const currentBatchSelected = selectedStudentsList.filter(s =>
                    selectedBatchId === 'unassigned'
                      ? ((!s.batch_id || s.batch_id === 0) && (!s.batch || s.batch === 'Unassigned'))
                      : (s.batch_id === selectedBatchId || s.batch_name === batchSummaries.find(b => b.id === selectedBatchId)?.name)
                  ).length;
                  const otherBatchesSelected = selectedStudentIds.length - currentBatchSelected;
                  if (otherBatchesSelected > 0) {
                    return (
                      <span style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: '1px solid #93c5fd',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ✓ +{otherBatchesSelected} candidates selected from other batches are retained!
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <button
                onClick={() => handleSelectBatch('all')}
                style={{
                  background: '#ffffff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ← View All Students
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              color: '#334155',
              fontWeight: '500',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎓</span>
                <span>
                  Showing <strong>All Candidates</strong> across all batches ({filteredStudents.length} displayed).
                  {selectedStudentIds.length > 0 && (
                    <strong style={{ marginLeft: '6px', color: '#0284c7' }}>
                      ({selectedStudentIds.length} selected across {selectedBatchesCount} {selectedBatchesCount === 1 ? 'batch' : 'batches'})
                    </strong>
                  )}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Click any batch card above to narrow down. Multi-batch selections persist.
              </span>
            </div>
          )}

          {/* Filter and Search components */}
          <ResumeFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
            batches={batches}
          />

          {/* Students list table */}
          {loading || loadingStudents ? (
            <div style={styles.loaderContainer}>
              <div style={styles.spinner} />
              <span style={styles.loaderText}>Loading Candidates & Resumes...</span>
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
        <div style={{
          ...styles.drawer,
          padding: isDrawerCollapsed ? '10px 20px' : '14px 24px',
          maxWidth: isDrawerCollapsed ? '480px' : '850px'
        }}>
          {isDrawerCollapsed ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8' }}>{selectedStudentIds.length}</span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Candidates Selected</span>
                {selectedBatchesCount > 1 && (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>({selectedBatchesCount} batches)</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowCollectionModal(true)}
                  style={{ ...styles.drawerBtn, padding: '7px 14px', fontSize: '12px' }}
                >
                  💼 Share Link
                </button>
                <button
                  onClick={() => setIsDrawerCollapsed(false)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Expand full selection panel"
                >
                  ⤢ Expand
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.drawerContent}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={styles.drawerCount}>{selectedStudentIds.length}</span>
                  <span style={styles.drawerLabel}>
                    {selectedStudentIds.length === 1 ? 'Candidate Selected' : 'Candidates Selected'}
                  </span>
                  {selectedBatchesCount > 1 && (
                    <span style={{
                      fontSize: '11px',
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      Across {selectedBatchesCount} Batches
                    </span>
                  )}
                </div>
                {selectedBatchesSummaryText && (
                  <div style={styles.drawerBatchBreakdown} title={selectedBatchesSummaryText}>
                    <span>📁 In link:</span>
                    <span style={{ color: '#e2e8f0' }}>{selectedBatchesSummaryText}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsDrawerCollapsed(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #475569',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Minimize bar to see full table"
                >
                  — Minimize
                </button>
                <button
                  onClick={() => setSelectedStudentIds([])}
                  style={styles.drawerBtnClear}
                  title="Deselect all candidates"
                >
                  ✕ Clear All
                </button>
                {isAllowedRole && (
                  <button
                    onClick={() => {
                      setWhatsappStudents(selectedStudentsList);
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
          )}
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
          allStudents={allStudents}
          courseId={activeCourseId}
          courseName={currentCourse?.name || courses.find(c => c.id === activeCourseId)?.name}
          onClose={() => {
            setShowCollectionModal(false);
          }}
          onSuccess={() => {
            loadData(activeCourseId);
            setSelectedStudentIds([]); // Clear selection after generating
          }}
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
