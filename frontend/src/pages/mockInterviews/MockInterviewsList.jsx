import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockInterviewAPI, courseAPI, attendanceAPI } from '../../services/api';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import styles from './MockInterviewsPage.styles';
import './MockInterviews.css';
import CreateMockModal from '../../components/mockInterviews/CreateMockModal';
import EditMeetLinkModal from '../../components/mockInterviews/EditMeetLinkModal';

const getEventStatusBadge = (status) => {
  switch (status) {
    case 'ONGOING':
      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', label: 'Ongoing' };
    case 'COMPLETED':
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', label: 'Completed' };
    default:
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', label: 'Upcoming' };
  }
};

const MockInterviewsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCourse, courseSlug } = useCourse();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [meetLinkEvent, setMeetLinkEvent] = useState(null);

  // Batches for creation modal
  const [availableBatches, setAvailableBatches] = useState([]);

  const activeCourseId = currentCourse?.id || null;

  useEffect(() => {
    loadEvents();
    loadBatches();
  }, [activeCourseId, courseSlug]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const params = activeCourseId ? { courseId: activeCourseId } : {};
      const res = await mockInterviewAPI.getAll(params);
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load mock interviews:', err);
      setError('Failed to fetch mock interviews. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await attendanceAPI.getBatches();
      const bList = Array.isArray(res.data) ? res.data : (res.data?.batches || []);
      setAvailableBatches(bList);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const handleDeleteEvent = async (e, eventId, eventTitle) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"? All student slot allocations for this drive will be removed.`)) {
      return;
    }
    try {
      await mockInterviewAPI.delete(eventId);
      loadEvents();
    } catch (err) {
      console.error('Failed to delete mock interview:', err);
      alert('Failed to delete mock interview');
    }
  };

  // Aggregated System Stats (Memoized)
  const { totalDrives, totalEligibleAcross, totalInterestedAcross, totalCompletedAcross } = useMemo(() => {
    let eligible = 0;
    let interested = 0;
    let completed = 0;

    for (let i = 0; i < events.length; i++) {
      eligible += Number(events[i].total_students || 0);
      interested += Number(events[i].interested_count || 0);
      completed += Number(events[i].completed_count || 0);
    }

    return {
      totalDrives: events.length,
      totalEligibleAcross: eligible,
      totalInterestedAcross: interested,
      totalCompletedAcross: completed
    };
  }, [events]);

  // Filtered Events (Memoized for high performance)
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter(ev => {
      if (statusFilter !== 'ALL' && ev.status !== statusFilter) return false;
      if (q) {
        const titleMatch = ev.title && ev.title.toLowerCase().includes(q);
        const descMatch = ev.description && ev.description.toLowerCase().includes(q);
        const courseMatch = ev.course_name && ev.course_name.toLowerCase().includes(q);
        const batchMatch = (ev.batches || []).some(b => b.name && b.name.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !courseMatch && !batchMatch) return false;
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  const getDashboardBackUrl = useCallback(() => {
    if (courseSlug) {
      if (user?.role === 'admin' || user?.role === 'super_admin') return `/${courseSlug}/admin`;
      if (user?.role === 'coordinator') return `/${courseSlug}/coordinator`;
      return `/${courseSlug}/dashboard`;
    }
    if (user?.role === 'admin' || user?.role === 'super_admin') return '/admin';
    if (user?.role === 'coordinator') return '/coordinator';
    return '/dashboard';
  }, [courseSlug, user?.role]);

  return (
    <div className="mock-page-container">
      {/* Header */}
      <div className="mock-header">
        <div className="mock-header-left">
          <div className="mock-title-row">
            <h1 className="mock-title">🎙️ Mock Interviews</h1>
            {currentCourse && (
              <span style={styles.courseBadge}>
                📚 {currentCourse.name} ({currentCourse.code})
              </span>
            )}
          </div>
          <p className="mock-subtitle">
            Create mock interview drives, coordinate batch participants, generate sequential slots, and conduct live interviews.
          </p>
        </div>

        <div className="mock-header-actions">
          <button
            onClick={() => navigate(getDashboardBackUrl())}
            className="mock-btn-secondary"
            title="Return to Dashboard"
          >
            ← Dashboard
          </button>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowCreateModal(true);
            }}
            className="mock-btn-primary"
            title="Schedule a new Mock Interview Drive"
          >
            + Create Drive
          </button>
        </div>
      </div>

      {/* Analytics stat strip */}
      <div className="mock-stat-strip">
        <div className="mock-stat-card">
          <span className="mock-stat-val">{totalDrives}</span>
          <span className="mock-stat-label">Total Mock Drives</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <span className="mock-stat-val" style={{ color: '#2563eb' }}>{totalEligibleAcross}</span>
          <span className="mock-stat-label">Enrolled Students</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="mock-stat-val" style={{ color: '#059669' }}>{totalInterestedAcross}</span>
          <span className="mock-stat-label">Interested / Slotted</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <span className="mock-stat-val" style={{ color: '#7c3aed' }}>{totalCompletedAcross}</span>
          <span className="mock-stat-label">Completed Interviews</span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {/* Controls & Filter Strip */}
      <div className="mock-card">
        <div className="mock-controls-row">
          <div className="mock-search-box">
            <span className="mock-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by mock title, course, or batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mock-search-input"
            />
          </div>

          <div className="mock-tab-group">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`mock-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter('UPCOMING')}
              className={`mock-tab-btn ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
            >
              Upcoming ({events.filter(e => e.status === 'UPCOMING').length})
            </button>
            <button
              onClick={() => setStatusFilter('ONGOING')}
              className={`mock-tab-btn ${statusFilter === 'ONGOING' ? 'active' : ''}`}
            >
              Ongoing ({events.filter(e => e.status === 'ONGOING').length})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`mock-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            >
              Completed ({events.filter(e => e.status === 'COMPLETED').length})
            </button>
          </div>
        </div>

        {/* Drives List */}
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.spinner}></div>
            <span>Loading Mock Interview Drives...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '40px' }}>🎙️</span>
            <h3 style={{ margin: '4px 0', color: '#1e293b' }}>No Mock Interviews Found</h3>
            <p style={{ margin: 0, fontSize: '14px', maxWidth: '420px' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'No mock interviews match your search criteria. Try adjusting filters.'
                : 'No mock interview drives have been created yet. Click "+ Create Mock Interview" to get started!'}
            </p>
            {!searchQuery && statusFilter === 'ALL' && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setShowCreateModal(true);
                }}
                className="mock-btn-primary"
                style={{ marginTop: '8px' }}
              >
                + Create Mock Interview
              </button>
            )}
          </div>
        ) : (
          <div className="mock-grid">
            {filteredEvents.map((ev) => {
              const statusBadge = getEventStatusBadge(ev.status);
              const detailUrl = courseSlug ? `/${courseSlug}/mock-interviews/${ev.id}` : `/mock-interviews/${ev.id}`;

              return (
                <div
                  key={ev.id}
                  className="mock-drive-card"
                  onClick={() => navigate(detailUrl)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                >
                  {/* Card Header */}
                  <div style={styles.mockCardHeader}>
                    <div>
                      <h3 style={styles.mockTitle}>{ev.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#4338ca', background: '#e0e7ff', padding: '1px 6px', borderRadius: '4px' }}>
                          {ev.course_code || ev.course_name}
                        </span>
                        <span style={styles.mockDateBadge}>
                          📅 {ev.interview_date}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          🕒 {ev.start_time} ({ev.default_duration_mins}m/slot)
                        </span>
                      </div>
                    </div>
                    <span style={{ ...styles.statusBadge, ...statusBadge }}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Batches Pills */}
                  <div style={styles.mockMetaRow}>
                    {ev.batches && ev.batches.length > 0 ? (
                      ev.batches.map(b => (
                        <span key={b.id} style={styles.batchPill}>
                          📁 {b.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>All course students</span>
                    )}
                    <span style={styles.unassignedPill}>
                      + Unassigned Students
                    </span>
                  </div>

                  {/* Candidate Metrics Strip */}
                  <div className="mock-metrics-grid">
                    <div style={styles.metricItem}>
                      <span className="mock-metric-number" style={styles.metricNumber}>{ev.total_students || 0}</span>
                      <span className="mock-metric-label" style={styles.metricLabel}>Total</span>
                    </div>
                    <div style={styles.metricItem}>
                      <span className="mock-metric-number" style={{ ...styles.metricNumber, color: '#059669' }}>{ev.interested_count || 0}</span>
                      <span className="mock-metric-label" style={styles.metricLabel}>Interested</span>
                    </div>
                    <div style={styles.metricItem}>
                      <span className="mock-metric-number" style={{ ...styles.metricNumber, color: '#dc2626' }}>{ev.not_interested_count || 0}</span>
                      <span className="mock-metric-label" style={styles.metricLabel}>Declined</span>
                    </div>
                    <div style={styles.metricItem}>
                      <span className="mock-metric-number" style={{ ...styles.metricNumber, color: '#7c3aed' }}>{ev.completed_count || 0}</span>
                      <span className="mock-metric-label" style={styles.metricLabel}>Done</span>
                    </div>
                  </div>

                  {/* Meet Link & Card Actions */}
                  <div className="mock-card-footer" style={styles.cardFooter} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {ev.meet_link ? (
                        <>
                          <a
                            href={ev.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.meetBtn}
                            title="Open Google Meet room in new tab"
                          >
                            📹 Open Meet
                          </a>
                          <button
                            onClick={() => setMeetLinkEvent(ev)}
                            style={{ ...styles.secondaryBtn, padding: '6px 10px', fontSize: '12px' }}
                            title="Edit Google Meet link"
                          >
                            ✏️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setMeetLinkEvent(ev)}
                          style={{ ...styles.secondaryBtn, padding: '6px 10px', fontSize: '12px', color: '#0284c7' }}
                          title="Add Google Meet link"
                        >
                          + Add Meet Link
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(detailUrl)}
                        style={{ ...styles.primaryBtn, padding: '6px 12px', fontSize: '12px' }}
                      >
                        Manage Drive →
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(ev);
                          setShowCreateModal(true);
                        }}
                        style={{ ...styles.secondaryBtn, padding: '6px 10px', fontSize: '12px' }}
                        title="Edit Drive Configuration"
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={(e) => handleDeleteEvent(e, ev.id, ev.title)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                        title="Delete Mock Interview"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Mock Modal */}
      <CreateMockModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadEvents}
        currentCourseId={activeCourseId}
        editEvent={editingEvent}
        availableBatches={availableBatches}
      />

      {/* Quick Meet Link Update Modal */}
      <EditMeetLinkModal
        isOpen={Boolean(meetLinkEvent)}
        onClose={() => setMeetLinkEvent(null)}
        mockId={meetLinkEvent?.id}
        currentMeetLink={meetLinkEvent?.meet_link}
        onSuccess={(newLink) => {
          setEvents(prev => prev.map(ev => ev.id === meetLinkEvent?.id ? { ...ev, meet_link: newLink } : ev));
        }}
      />
    </div>
  );
};

export default MockInterviewsList;
