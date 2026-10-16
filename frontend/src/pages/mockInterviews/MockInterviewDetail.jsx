import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockInterviewAPI, attendanceAPI } from '../../services/api';
import { useCourse } from '../../context/CourseContext';
import styles from './MockInterviewsPage.styles';
import './MockInterviews.css';
import MockStudentTable from '../../components/mockInterviews/MockStudentTable';
import MockStudentCard from '../../components/mockInterviews/MockStudentCard';
import CreateMockModal from '../../components/mockInterviews/CreateMockModal';
import EditMeetLinkModal from '../../components/mockInterviews/EditMeetLinkModal';
import NotInterestedModal from '../../components/mockInterviews/NotInterestedModal';
import CompleteInterviewModal from '../../components/mockInterviews/CompleteInterviewModal';
import CustomizeWhatsAppModal from '../../components/mockInterviews/CustomizeWhatsAppModal';

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

const MockInterviewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courseSlug } = useCourse();

  const [event, setEvent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('interested'); // 'interested' | 'all' | 'not_interested'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');

  // Slot generation form state in Interested tab
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotDuration, setSlotDuration] = useState(20);
  const [generatingSlots, setGeneratingSlots] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMeetLinkModal, setShowMeetLinkModal] = useState(false);
  const [showCustomizeWAModal, setShowCustomizeWAModal] = useState(false);
  const [customWATemplate, setCustomWATemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [notInterestedStudent, setNotInterestedStudent] = useState(null);
  const [completeStudent, setCompleteStudent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Batches for edit modal
  const [availableBatches, setAvailableBatches] = useState([]);

  // Responsive breakpoint check using matchMedia for smooth performance
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
    loadMockData();
    loadBatches();
  }, [id]);

  const loadMockData = async () => {
    try {
      setLoading(true);
      setError('');
      const [eventRes, studentsRes] = await Promise.all([
        mockInterviewAPI.getById(id),
        mockInterviewAPI.getStudents(id)
      ]);
      setEvent(eventRes.data);
      setStudents(studentsRes.data || []);
      if (eventRes.data) {
        setSlotStartTime(eventRes.data.start_time || '10:00');
        setSlotDuration(eventRes.data.default_duration_mins || 20);
        // Sync custom WhatsApp template from database or local storage
        const savedLocal = localStorage.getItem(`mock_wa_template_${eventRes.data.id}`);
        if (eventRes.data.whatsapp_template) {
          setCustomWATemplate(eventRes.data.whatsapp_template);
        } else if (savedLocal) {
          setCustomWATemplate(savedLocal);
        }
      }
    } catch (err) {
      console.error('Failed to load mock interview:', err);
      setError('Failed to load mock interview details. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsAppTemplate = async (newTemplate) => {
    try {
      setSavingTemplate(true);
      setCustomWATemplate(newTemplate);
      localStorage.setItem(`mock_wa_template_${id}`, newTemplate);
      await mockInterviewAPI.updateWhatsAppTemplate(id, newTemplate);
      setEvent(prev => (prev ? { ...prev, whatsapp_template: newTemplate } : prev));
    } catch (err) {
      console.warn('Backend update error, template saved locally:', err);
    } finally {
      setSavingTemplate(false);
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

  // Status transitions
  const handleMarkInterested = async (studentId) => {
    try {
      setActionLoading(true);
      await mockInterviewAPI.updateParticipantStatus(id, studentId, {
        status: 'INTERESTED'
      });
      // Refresh students
      const res = await mockInterviewAPI.getStudents(id);
      setStudents(res.data || []);

      const evRes = await mockInterviewAPI.getById(id);
      setEvent(evRes.data);
    } catch (err) {
      console.error('Failed to mark student interested:', err);
      alert('Error updating student status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmNotInterested = async (studentId, reason) => {
    try {
      setActionLoading(true);
      await mockInterviewAPI.updateParticipantStatus(id, studentId, {
        status: 'NOT_INTERESTED',
        reason
      });
      setNotInterestedStudent(null);
      const res = await mockInterviewAPI.getStudents(id);
      setStudents(res.data || []);
      const evRes = await mockInterviewAPI.getById(id);
      setEvent(evRes.data);
    } catch (err) {
      console.error('Failed to mark student not interested:', err);
      alert('Error updating student status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartInterview = async (studentId) => {
    try {
      setActionLoading(true);
      await mockInterviewAPI.startInterview(id, studentId, {
        actual_start: new Date().toISOString()
      });
      const res = await mockInterviewAPI.getStudents(id);
      setStudents(res.data || []);
      const evRes = await mockInterviewAPI.getById(id);
      setEvent(evRes.data);
    } catch (err) {
      console.error('Failed to start interview:', err);
      alert('Error recording interview start');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmComplete = async (studentId, timingData) => {
    try {
      setActionLoading(true);
      await mockInterviewAPI.completeInterview(id, studentId, timingData);
      setCompleteStudent(null);
      const res = await mockInterviewAPI.getStudents(id);
      setStudents(res.data || []);
      const evRes = await mockInterviewAPI.getById(id);
      setEvent(evRes.data);
    } catch (err) {
      console.error('Failed to complete interview:', err);
      alert('Error marking interview complete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateSlots = async () => {
    try {
      setGeneratingSlots(true);
      const res = await mockInterviewAPI.generateSlots(id, {
        start_time: slotStartTime ? `${slotStartTime}:00` : '10:00:00',
        duration_mins: parseInt(slotDuration, 10) || 20
      });
      // Refresh students to show newly calculated slots
      const stuRes = await mockInterviewAPI.getStudents(id);
      setStudents(stuRes.data || []);
      alert(res.data?.message || 'Slots generated successfully!');
    } catch (err) {
      console.error('Failed to generate slots:', err);
      alert('Error generating slots');
    } finally {
      setGeneratingSlots(false);
    }
  };

  // Optimized memoized student filtering based on activeTab, searchQuery, and selectedBatchFilter
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Tab filter
      if (activeTab === 'interested') {
        if (!['INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)) return false;
      } else if (activeTab === 'not_interested') {
        if (s.status !== 'NOT_INTERESTED') return false;
      }

      // 2. Batch filter
      if (selectedBatchFilter) {
        if (selectedBatchFilter === 'unassigned') {
          if (s.is_assigned) return false;
        } else {
          if (String(s.batch_id) !== String(selectedBatchFilter)) return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.student_name && s.student_name.toLowerCase().includes(q);
        const emailMatch = s.student_email && s.student_email.toLowerCase().includes(q);
        const phoneMatch = s.student_mobile && s.student_mobile.includes(q);
        const batchMatch = s.batch_name && s.batch_name.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !batchMatch) return false;
      }

      return true;
    });
  }, [students, activeTab, selectedBatchFilter, searchQuery]);

  const getListBackUrl = useCallback(() => {
    return courseSlug ? `/${courseSlug}/mock-interviews` : '/mock-interviews';
  }, [courseSlug]);

  // Memoized counters
  const { countTotal, countInterested, countNotInterested, countScheduled, countCompleted } = useMemo(() => {
    let interested = 0;
    let notInterested = 0;
    let scheduled = 0;
    let completed = 0;

    for (let i = 0; i < students.length; i++) {
      const st = students[i].status;
      if (['INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(st)) interested++;
      if (st === 'NOT_INTERESTED') notInterested++;
      if (st === 'SCHEDULED') scheduled++;
      if (st === 'COMPLETED') completed++;
    }

    return {
      countTotal: students.length,
      countInterested: interested,
      countNotInterested: notInterested,
      countScheduled: scheduled,
      countCompleted: completed
    };
  }, [students]);

  if (loading) {
    return (
      <div className="mock-page-container">
        <div style={styles.emptyState}>
          <div style={styles.spinner}></div>
          <span>Loading Mock Interview Details...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mock-page-container">
        <div style={{ ...styles.card, textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: '#ef4444' }}>{error || 'Mock Interview Not Found'}</h3>
          <button onClick={() => navigate(getListBackUrl())} className="mock-btn-primary" style={{ marginTop: '12px' }}>
            ← Back to Mock Interviews
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getEventStatusBadge(event.status);

  return (
    <div className="mock-page-container">
      {/* Top Header */}
      <div className="mock-header">
        <div className="mock-header-left">
          <button
            onClick={() => navigate(getListBackUrl())}
            className="mock-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-start', marginBottom: '8px', width: 'auto' }}
          >
            ← Back to All Drives
          </button>
          <div className="mock-title-row">
            <h1 className="mock-title">{event.title}</h1>
            <span style={{ ...styles.statusBadge, ...statusBadge }}>
              {statusBadge.label}
            </span>
            <span style={styles.courseBadge}>
              📚 {event.course_name} ({event.course_code})
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            <span>📅 Date: <strong>{event.interview_date}</strong></span>
            <span>🕒 Start: <strong>{event.start_time}</strong></span>
            <span>⏱️ <strong>{event.default_duration_mins}m/slot</strong></span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Batches:</span>
              {event.batches && event.batches.length > 0 ? (
                event.batches.map(b => (
                  <span key={b.id} style={styles.batchPill}>📁 {b.name}</span>
                ))
              ) : (
                <span style={styles.batchPill}>All Batches</span>
              )}
              <span style={styles.unassignedPill}>+ Unassigned</span>
            </div>
          </div>

          {event.description && (
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#475569', fontStyle: 'italic', maxWidth: '800px' }}>
              📝 "{event.description}"
            </p>
          )}
        </div>

        {/* Header Actions: Meet link + Edit */}
        <div className="mock-header-actions">
          {event.meet_link ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <a
                href={event.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.meetBtn, flex: 1, justifyContent: 'center', padding: '10px 14px' }}
                title="Join Google Meet Live Room"
              >
                📹 Open Google Meet
              </a>
              <button
                onClick={() => setShowMeetLinkModal(true)}
                className="mock-btn-secondary"
                style={{ padding: '10px 12px', fontSize: '13px', width: 'auto' }}
                title="Edit Google Meet Link"
              >
                ✏️
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMeetLinkModal(true)}
              className="mock-btn-primary"
              style={{ background: '#0284c7', width: '100%' }}
            >
              + Add Google Meet Link
            </button>
          )}

          <button
            onClick={() => setShowCustomizeWAModal(true)}
            className="mock-btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            title="Customize WhatsApp message template for this drive"
          >
            💬 Customize Message {customWATemplate ? '✨' : ''}
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="mock-btn-secondary"
            style={{ width: '100%' }}
          >
            ⚙️ Edit Drive Details
          </button>
        </div>
      </div>

      {/* Counters Strip */}
      <div className="mock-stat-strip">
        <div className="mock-stat-card">
          <span className="mock-stat-val">{countTotal}</span>
          <span className="mock-stat-label">Total Eligible</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="mock-stat-val" style={{ color: '#059669' }}>{countInterested}</span>
          <span className="mock-stat-label">Interested</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <span className="mock-stat-val" style={{ color: '#dc2626' }}>{countNotInterested}</span>
          <span className="mock-stat-label">Declined</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <span className="mock-stat-val" style={{ color: '#2563eb' }}>{countScheduled}</span>
          <span className="mock-stat-label">Scheduled Slots</span>
        </div>
        <div className="mock-stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <span className="mock-stat-val" style={{ color: '#7c3aed' }}>{countCompleted}</span>
          <span className="mock-stat-label">Completed</span>
        </div>
      </div>

      {/* Operational Workspace */}
      <div className="mock-card">
        {/* Navigation Tabs between Sections */}
        <div className="mock-controls-row" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div className="mock-tab-group">
            <button
              onClick={() => setActiveTab('interested')}
              className={`mock-tab-btn ${activeTab === 'interested' ? 'active' : ''}`}
            >
              ⭐ Interested & Slots ({countInterested})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`mock-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            >
              👥 All Candidates ({countTotal})
            </button>
            <button
              onClick={() => setActiveTab('not_interested')}
              className={`mock-tab-btn ${activeTab === 'not_interested' ? 'active' : ''}`}
            >
              ❌ Declined ({countNotInterested})
            </button>
          </div>

          {/* Quick Filters: Search and Batch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <div className="mock-search-box">
              <span className="mock-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search candidate by name, phone, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mock-search-input"
              />
            </div>

            <select
              value={selectedBatchFilter}
              onChange={e => setSelectedBatchFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', width: isMobile ? '100%' : 'auto', height: '42px', boxSizing: 'border-box' }}
            >
              <option value="">All Batches</option>
              {(event.batches || []).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              <option value="unassigned">⚠️ Unassigned Students Only</option>
            </select>

            {/* Customize WhatsApp Message Button at the top of the list */}
            <button
              onClick={() => setShowCustomizeWAModal(true)}
              className="mock-customize-wa-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: customWATemplate ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                background: customWATemplate ? '#ecfdf5' : '#ffffff',
                color: customWATemplate ? '#065f46' : '#334155',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                height: '42px',
                boxSizing: 'border-box',
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              title="Customize WhatsApp message template sent to candidates"
            >
              <span>💬</span>
              <span>Customize Message</span>
              {customWATemplate && (
                <span style={{
                  fontSize: '10px',
                  background: '#10b981',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}>
                  ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Slot Generator Toolbar (Visible when in Interested Tab) */}
        {activeTab === 'interested' && (
          <div className="mock-slot-toolbar" style={{
            background: '#f8fafc',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <strong style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚡ Automatic Sequential Slot Generator
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Assigns sequential, non-overlapping interview slots to all interested candidates.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              <div className="mock-slot-inputs-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Start:</label>
                  <input
                    type="time"
                    value={slotStartTime}
                    onChange={e => setSlotStartTime(e.target.value)}
                    style={{ ...styles.input, width: isMobile ? '100%' : '110px', padding: '6px 8px', fontSize: '13px', height: '38px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Duration:</label>
                  <select
                    value={slotDuration}
                    onChange={e => setSlotDuration(e.target.value)}
                    style={{ ...styles.input, width: isMobile ? '100%' : '120px', padding: '6px 8px', fontSize: '13px', height: '38px' }}
                  >
                    <option value="5">5 mins</option>
                    <option value="10">10 mins</option>
                    <option value="15">15 mins</option>
                    <option value="20">20 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateSlots}
                disabled={generatingSlots || countInterested === 0}
                className="mock-generate-btn mock-btn-primary"
                style={{
                  padding: '9px 16px',
                  fontSize: '13px',
                  opacity: countInterested === 0 ? 0.6 : 1,
                  cursor: countInterested === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {generatingSlots ? 'Generating...' : '⚡ Generate Slots'}
              </button>
            </div>
          </div>
        )}

        {/* Candidate Presentation: Desktop Table or Mobile Cards */}
        {isMobile ? (
          <div>
            {filteredStudents.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '32px' }}>👥</span>
                <strong>No students match the criteria</strong>
              </div>
            ) : (
              filteredStudents.map(student => (
                <MockStudentCard
                  key={student.student_id}
                  student={student}
                  mockEvent={event}
                  customTemplate={customWATemplate}
                  onMarkInterested={handleMarkInterested}
                  onOpenNotInterestedModal={setNotInterestedStudent}
                  onStartInterview={handleStartInterview}
                  onOpenCompleteModal={setCompleteStudent}
                />
              ))
            )}
          </div>
        ) : (
          <MockStudentTable
            students={filteredStudents}
            mockEvent={event}
            customTemplate={customWATemplate}
            onMarkInterested={handleMarkInterested}
            onOpenNotInterestedModal={setNotInterestedStudent}
            onStartInterview={handleStartInterview}
            onOpenCompleteModal={setCompleteStudent}
          />
        )}
      </div>

      {/* Edit Mock Details Modal */}
      <CreateMockModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={loadMockData}
        currentCourseId={event.course_id}
        editEvent={event}
        availableBatches={availableBatches}
      />

      {/* Edit Meet Link Modal */}
      <EditMeetLinkModal
        isOpen={showMeetLinkModal}
        onClose={() => setShowMeetLinkModal(false)}
        mockId={event.id}
        currentMeetLink={event.meet_link}
        onSuccess={(newLink) => setEvent(prev => ({ ...prev, meet_link: newLink }))}
      />

      {/* Not Interested Confirmation Modal */}
      <NotInterestedModal
        isOpen={Boolean(notInterestedStudent)}
        onClose={() => setNotInterestedStudent(null)}
        student={notInterestedStudent}
        onConfirm={handleConfirmNotInterested}
        loading={actionLoading}
      />

      {/* Complete Interview Timing Modal */}
      <CompleteInterviewModal
        isOpen={Boolean(completeStudent)}
        onClose={() => setCompleteStudent(null)}
        student={completeStudent}
        onConfirm={handleConfirmComplete}
        loading={actionLoading}
      />

      {/* Customize WhatsApp Message Template Modal */}
      <CustomizeWhatsAppModal
        isOpen={showCustomizeWAModal}
        onClose={() => setShowCustomizeWAModal(false)}
        mockEvent={event}
        currentTemplate={customWATemplate}
        sampleStudent={filteredStudents[0] || students[0]}
        onSaveTemplate={handleSaveWhatsAppTemplate}
        loading={savingTemplate}
      />
    </div>
  );
};

export default MockInterviewDetail;
