import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, BookOpen, Layers, Edit3, CheckCircle, Clock, Users, Phone } from 'lucide-react';
import { feedbackAPI } from '../../services/api';
import { useCourse } from '../../context/CourseContext';
import styles from './Feedback.styles';
import './Feedback.css';
import FeedbackStudentTable from '../../components/feedback/FeedbackStudentTable';
import FeedbackStudentCard from '../../components/feedback/FeedbackStudentCard';
import CreateFeedbackModal from '../../components/feedback/CreateFeedbackModal';
import StudentFeedbackModal from '../../components/feedback/StudentFeedbackModal';
import ViewFeedbackModal from '../../components/feedback/ViewFeedbackModal';

const FeedbackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courseSlug } = useCourse();

  const [campaign, setCampaign] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'PENDING'

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [feedbackStudent, setFeedbackStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Responsive breakpoint check
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [campRes, studRes] = await Promise.all([
        feedbackAPI.getById(id),
        feedbackAPI.getStudents(id)
      ]);
      setCampaign(campRes.data);
      setStudents(studRes.data || []);
    } catch (err) {
      console.error('Failed to load feedback details:', err);
      setError('Failed to load feedback details. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    if (courseSlug) {
      navigate(`/${courseSlug}/feedback`);
    } else {
      navigate('/feedback');
    }
  };

  const handleFeedbackSubmitted = (response) => {
    // Optimistically update the student in local state
    setStudents(prev => prev.map(s => {
      if (s.student_id === response.student_id) {
        return {
          ...s,
          feedback_status: 'COMPLETED',
          response_id: response.response_id,
          overall_feedback: response.overall_feedback,
          submitted_at: response.submitted_at
        };
      }
      return s;
    }));

    // Reload campaign metrics in background
    feedbackAPI.getById(id).then(res => setCampaign(res.data)).catch(() => {});
  };

  const handleAllowEdit = async (studentId) => {
    try {
      await feedbackAPI.allowEditAccess(id, studentId);
      setStudents(prev => prev.map(s => {
        if (s.student_id === studentId) {
          return {
            ...s,
            share_status: 'EDIT_ALLOWED'
          };
        }
        return s;
      }));
      alert('Edit permission granted. Student can now re-edit using their unique link.');
    } catch (err) {
      console.error('Failed to allow edit access:', err);
      alert('Failed to grant edit permission');
    }
  };

  const editRequestsCount = useMemo(() => {
    return students.filter(s => s.share_status === 'EDIT_REQUESTED').length;
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const matchSearch = !q ||
        (s.student_name && s.student_name.toLowerCase().includes(q)) ||
        (s.student_email && s.student_email.toLowerCase().includes(q)) ||
        (s.student_mobile && s.student_mobile.includes(q));

      const matchBatch = selectedBatchFilter === 'ALL' ||
        String(s.batch_id) === String(selectedBatchFilter);

      const matchStatus = statusFilter === 'ALL' ||
        (statusFilter === 'EDIT_REQUESTS' ? s.share_status === 'EDIT_REQUESTED' : s.feedback_status === statusFilter);

      return matchSearch && matchBatch && matchStatus;
    });
  }, [students, searchQuery, selectedBatchFilter, statusFilter]);

  // Group filtered students batch-wise
  const studentsByBatch = useMemo(() => {
    const map = {};
    filteredStudents.forEach(s => {
      const bKey = s.batch_name || 'Unassigned';
      if (!map[bKey]) map[bKey] = [];
      map[bKey].push(s);
    });
    return map;
  }, [filteredStudents]);

  // Overall Statistics calculated from loaded students
  const detailStats = useMemo(() => {
    const total = students.length;
    let completed = 0;
    students.forEach(s => {
      if (s.feedback_status === 'COMPLETED') completed++;
    });
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rate };
  }, [students]);

  return (
    <div className="fb-page-container">
      {/* Top Navigation Row */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          onClick={handleBackToList}
          style={{
            background: 'none',
            border: 'none',
            color: '#4f46e5',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 0'
          }}
        >
          <ArrowLeft size={16} /> Back to Feedback Campaigns
        </button>
      </div>

      {/* Main Campaign Header */}
      {loading && !campaign ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          Loading feedback details...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : (
        <>
          <div className="fb-header">
            <div className="fb-header-left">
              <div className="fb-title-row">
                <h1 className="fb-title">{campaign?.title}</h1>
                <span
                  style={{
                    ...styles.badge,
                    ...(campaign?.status === 'COMPLETED' ? styles.completedBadge : styles.activeBadge)
                  }}
                >
                  {campaign?.status === 'COMPLETED' ? 'Completed' : 'Active'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4338ca', fontWeight: '700' }}>
                  <BookOpen size={14} /> Course: {campaign?.course_name}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> Date: {campaign?.feedback_date}
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={14} /> Questions: {campaign?.questions?.length || 0}
                </span>
              </div>

              {/* Batches Selected */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Batches:</span>
                {(campaign?.batches || []).map(b => (
                  <span key={b.id} style={styles.batchPill}>
                    📁 {b.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="fb-header-actions">
              <button
                type="button"
                className="fb-action-btn-view"
                onClick={() => setShowEditModal(true)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Edit3 size={14} /> Edit Campaign
              </button>
            </div>
          </div>

          {/* Statistics Strip */}
          <div className="fb-stat-strip">
            <div className="fb-stat-card" style={{ borderLeftColor: '#4f46e5' }}>
              <span className="fb-stat-val">{detailStats.total}</span>
              <span className="fb-stat-label">Total Students</span>
            </div>

            <div className="fb-stat-card" style={{ borderLeftColor: '#10b981' }}>
              <span className="fb-stat-val" style={{ color: '#047857' }}>{detailStats.completed}</span>
              <span className="fb-stat-label">Completed ({detailStats.rate}%)</span>
            </div>

            <div className="fb-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
              <span className="fb-stat-val" style={{ color: '#b45309' }}>{detailStats.pending}</span>
              <span className="fb-stat-label">Pending Response</span>
            </div>
          </div>

          {/* Batch-wise Performance Breakdown Cards */}
          {campaign?.batch_stats && campaign.batch_stats.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Batch-wise Participation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {campaign.batch_stats.map(bs => {
                  const pct = bs.total > 0 ? Math.round((bs.completed / bs.total) * 100) : 0;
                  return (
                    <div
                      key={bs.batch_id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          📁 {bs.batch_name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#047857' }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${pct}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                        <span>Completed: <strong style={{ color: '#047857' }}>{bs.completed}</strong></span>
                        <span>Pending: <strong style={{ color: '#b45309' }}>{bs.pending}</strong></span>
                        <span>Total: {bs.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operational Student List Section */}
          <div className="fb-card">
            {/* Filter and Search Controls */}
            <div className="fb-controls-row">
              <div className="fb-search-box">
                <Search size={16} className="fb-search-icon" />
                <input
                  type="text"
                  placeholder="Search student by name, mobile, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="fb-search-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Batch Dropdown Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Batch:</span>
                  <select
                    value={selectedBatchFilter}
                    onChange={(e) => setSelectedBatchFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1e293b',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ALL">All Batches</option>
                    {(campaign?.batches || []).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Tabs */}
                <div className="fb-tab-group">
                  <button
                    type="button"
                    className={`fb-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                  >
                    All ({detailStats.total})
                  </button>
                  <button
                    type="button"
                    className={`fb-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('COMPLETED')}
                  >
                    Completed ({detailStats.completed})
                  </button>
                  <button
                    type="button"
                    className={`fb-tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('PENDING')}
                  >
                    Pending ({detailStats.pending})
                  </button>
                  {editRequestsCount > 0 && (
                    <button
                      type="button"
                      className={`fb-tab-btn ${statusFilter === 'EDIT_REQUESTS' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('EDIT_REQUESTS')}
                      style={{
                        background: statusFilter === 'EDIT_REQUESTS' ? '#fef3c7' : 'transparent',
                        color: '#b45309',
                        fontWeight: '800'
                      }}
                    >
                      ⚠️ Edit Requests ({editRequestsCount})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Edit Requests Banner */}
            {editRequestsCount > 0 && statusFilter !== 'EDIT_REQUESTS' && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '10px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '700' }}>
                  ⚠️ {editRequestsCount} student(s) requested permission to re-edit their submitted feedback.
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('EDIT_REQUESTS')}
                  style={{
                    background: '#b45309',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  View Requests
                </button>
              </div>
            )}

            {/* Students List Display (Organized Batch-Wise) */}
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                  No students found
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Try adjusting your search query, batch filter, or status filter.
                </p>
              </div>
            ) : isMobile ? (
              /* Mobile Card View (Batch-Wise Grouped) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(studentsByBatch).map(([batchName, bStudents]) => (
                  <div key={batchName}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 0 10px',
                      borderBottom: '2px solid #e2e8f0',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                        📁 {batchName}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '1px 8px', borderRadius: '10px' }}>
                        {bStudents.length} {bStudents.length === 1 ? 'student' : 'students'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {bStudents.map(student => (
                        <FeedbackStudentCard
                          key={student.student_id}
                          student={student}
                          feedbackCampaign={campaign}
                          onGiveFeedback={(st) => setFeedbackStudent(st)}
                          onViewFeedback={(st) => setViewingStudent(st)}
                          onAllowEdit={handleAllowEdit}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop Table View (Batch-Wise Grouped) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(studentsByBatch).map(([batchName, bStudents]) => (
                  <div key={batchName}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 0 10px',
                      borderBottom: '2px solid #e2e8f0',
                      marginBottom: '12px'
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                        📁 {batchName}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
                        {bStudents.length} {bStudents.length === 1 ? 'student' : 'students'}
                      </span>
                    </div>

                    <FeedbackStudentTable
                      students={bStudents}
                      feedbackCampaign={campaign}
                      onGiveFeedback={(st) => setFeedbackStudent(st)}
                      onViewFeedback={(st) => setViewingStudent(st)}
                      onAllowEdit={handleAllowEdit}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Give Feedback Modal */}
      {feedbackStudent && (
        <StudentFeedbackModal
          isOpen={Boolean(feedbackStudent)}
          onClose={() => setFeedbackStudent(null)}
          feedbackCampaign={campaign}
          student={feedbackStudent}
          onSuccess={handleFeedbackSubmitted}
        />
      )}

      {/* View Feedback Modal */}
      {viewingStudent && (
        <ViewFeedbackModal
          isOpen={Boolean(viewingStudent)}
          onClose={() => setViewingStudent(null)}
          feedbackCampaign={campaign}
          student={viewingStudent}
          onEdit={(st) => {
            setViewingStudent(null);
            setFeedbackStudent(st);
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <CreateFeedbackModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setCampaign(updated);
            loadData();
          }}
          currentCourseId={campaign.course_id}
          editCampaign={campaign}
        />
      )}
    </div>
  );
};

export default FeedbackDetail;
