import React, { useState, useEffect } from 'react';
import { mockInterviewAPI, courseAPI } from '../../services/api';
import styles from '../../pages/mockInterviews/MockInterviewsPage.styles';

const CreateMockModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentCourseId,
  editEvent = null,
  availableBatches = []
}) => {
  const isEdit = Boolean(editEvent);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(currentCourseId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [durationMins, setDurationMins] = useState(20);
  const [meetLink, setMeetLink] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Batches for chosen course
  const [courseBatches, setCourseBatches] = useState([]);

  useEffect(() => {
    courseAPI.getAll()
      .then(res => {
        const list = res.data?.courses || (Array.isArray(res.data) ? res.data : []);
        setCourses(list);
      })
      .catch(err => console.error('Error fetching courses:', err));
  }, []);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      setDescription(editEvent.description || '');
      setInterviewDate(editEvent.interview_date || '');
      setStartTime(editEvent.start_time || '10:00');
      setDurationMins(editEvent.default_duration_mins || 20);
      setMeetLink(editEvent.meet_link || '');
      setCourseId(editEvent.course_id || currentCourseId || '');
      setSelectedBatchIds((editEvent.batches || []).map(b => b.id));
    } else {
      setTitle('');
      setDescription('');
      // Default to today or tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setInterviewDate(tomorrow.toISOString().split('T')[0]);
      setStartTime('10:00');
      setDurationMins(20);
      setMeetLink('');
      setCourseId(currentCourseId || '');
      setSelectedBatchIds([]);
    }
    setError('');
  }, [editEvent, isOpen, currentCourseId]);

  // Load batches whenever courseId changes
  useEffect(() => {
    if (!courseId) {
      setCourseBatches([]);
      return;
    }
    // Fetch batches scoped to this course
    const cId = parseInt(courseId, 10);
    const filtered = (availableBatches || []).filter(b => !b.course_id || b.course_id === cId);
    setCourseBatches(filtered);
  }, [courseId, availableBatches]);

  if (!isOpen) return null;

  const handleToggleBatch = (bId) => {
    setSelectedBatchIds(prev =>
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  const handleSelectAllBatches = () => {
    if (selectedBatchIds.length === courseBatches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(courseBatches.map(b => b.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the mock interview.');
      return;
    }
    if (!interviewDate) {
      setError('Please specify the interview date.');
      return;
    }
    if (!courseId) {
      setError('Please select a course.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        course_id: parseInt(courseId, 10),
        interview_date: interviewDate,
        start_time: startTime ? `${startTime}:00` : '10:00:00',
        default_duration_mins: parseInt(durationMins, 10) || 20,
        meet_link: meetLink.trim() || null,
        batch_ids: selectedBatchIds
      };

      if (isEdit) {
        await mockInterviewAPI.update(editEvent.id, payload);
      } else {
        await mockInterviewAPI.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save mock interview:', err);
      setError(err.response?.data?.message || err.message || 'Error saving mock interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mock-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div className="mock-modal-content" style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>
              {isEdit ? '✏️ Edit Mock Interview' : '🎙️ Create Mock Interview'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Configure drive parameters, select course batches, and schedule interview slots.
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="mock-modal-body" style={styles.modalBody}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Mock Interview Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Technical Mock Interview — Python & React Batch"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            {/* Course & Date Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Course <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={courseId}
                  onChange={e => {
                    setCourseId(e.target.value);
                    setSelectedBatchIds([]);
                  }}
                  disabled={isEdit}
                  style={{ ...styles.input, background: isEdit ? '#f1f5f9' : '#ffffff', cursor: isEdit ? 'not-allowed' : 'pointer' }}
                  required
                >
                  <option value="">Select Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Interview Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Timing & Duration Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Interview Start Time (Planned) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Slot Duration (Minutes) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={durationMins}
                  onChange={e => setDurationMins(e.target.value)}
                  style={styles.input}
                >
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="20">20 Minutes (Recommended)</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
            </div>

            {/* Batches Selection */}
            <div style={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>
                  Target Batches ({selectedBatchIds.length} selected)
                </label>
                {courseBatches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllBatches}
                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {selectedBatchIds.length === courseBatches.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div style={styles.batchCheckboxList}>
                {courseBatches.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '6px' }}>
                    {courseId ? 'No active batches found for this course.' : 'Select a course first to view batches.'}
                  </span>
                ) : (
                  courseBatches.map(b => (
                    <label key={b.id} style={styles.batchCheckboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.includes(b.id)}
                        onChange={() => handleToggleBatch(b.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ color: '#1e293b', fontWeight: '500' }}>{b.name}</span>
                    </label>
                  ))
                )}
              </div>

              <div style={{ marginTop: '6px', fontSize: '12px', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 10px', borderRadius: '6px' }}>
                ℹ️ <strong>Course Inclusivity:</strong> Students from all selected batches <em>plus unassigned students</em> enrolled in this course will be automatically included.
              </div>
            </div>

            {/* Google Meet Link */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Google Meet Link (Optional — can be edited anytime)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Description / Special Instructions</label>
              <textarea
                placeholder="e.g. Focus on Python OOP, DSA basics, and project architectural defense."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={styles.textarea}
              />
            </div>
          </div>

          <div className="mock-modal-footer" style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mock-btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="mock-btn-primary"
              style={{ padding: '8px 20px' }}
            >
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Mock Interview')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMockModal;
