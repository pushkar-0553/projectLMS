import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, BookOpen, AlertCircle } from 'lucide-react';
import { feedbackAPI, courseAPI, attendanceAPI } from '../../services/api';
import QuestionBuilder, { DEFAULT_FEEDBACK_QUESTIONS } from './QuestionBuilder';

const CreateFeedbackModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentCourseId = null,
  editCampaign = null
}) => {
  const isEdit = Boolean(editCampaign);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(currentCourseId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedbackDate, setFeedbackDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [questions, setQuestions] = useState(DEFAULT_FEEDBACK_QUESTIONS);

  const [availableBatches, setAvailableBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load courses & batches
  useEffect(() => {
    courseAPI.getAll()
      .then(res => {
        const list = res.data?.courses || (Array.isArray(res.data) ? res.data : []);
        setCourses(list);
      })
      .catch(err => console.error('Error fetching courses:', err));

    attendanceAPI.getBatches()
      .then(res => {
        const bList = Array.isArray(res.data) ? res.data : (res.data?.batches || []);
        setAvailableBatches(bList);
      })
      .catch(err => console.error('Error fetching batches:', err));
  }, []);

  // Sync edit campaign state
  useEffect(() => {
    if (editCampaign) {
      setTitle(editCampaign.title || '');
      setDescription(editCampaign.description || '');
      setFeedbackDate(editCampaign.feedback_date || '');
      setCourseId(editCampaign.course_id || currentCourseId || '');
      setStatus(editCampaign.status || 'ACTIVE');
      setSelectedBatchIds((editCampaign.batches || []).map(b => b.id || b.batch_id));
      if (editCampaign.questions && editCampaign.questions.length > 0) {
        setQuestions(editCampaign.questions);
      } else {
        setQuestions(DEFAULT_FEEDBACK_QUESTIONS);
      }
    } else {
      setTitle('');
      setDescription('');
      setFeedbackDate(new Date().toISOString().split('T')[0]);
      setCourseId(currentCourseId || '');
      setStatus('ACTIVE');
      setSelectedBatchIds([]);
      setQuestions(DEFAULT_FEEDBACK_QUESTIONS);
    }
    setError('');
  }, [editCampaign, isOpen, currentCourseId]);

  if (!isOpen) return null;

  // Filter batches by course
  const courseBatches = availableBatches.filter(b => {
    if (!courseId) return true;
    return !b.course_id || b.course_id === parseInt(courseId, 10);
  });

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
      setError('Please provide a feedback campaign title.');
      return;
    }
    if (!feedbackDate) {
      setError('Please select a feedback date.');
      return;
    }
    if (!courseId) {
      setError('Please choose a course / branch.');
      return;
    }
    if (selectedBatchIds.length === 0) {
      setError('Please select at least one batch for this feedback campaign.');
      return;
    }
    if (questions.length === 0) {
      setError('Please define at least one question.');
      return;
    }
    const emptyQ = questions.find(q => !(q.question_text || q.questionText || '').trim());
    if (emptyQ) {
      setError('All questions must have valid question text.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        feedback_date: feedbackDate,
        course_id: parseInt(courseId, 10),
        status,
        batch_ids: selectedBatchIds,
        questions: questions.map((q, idx) => ({
          id: q.id && typeof q.id === 'number' ? q.id : undefined,
          question_text: (q.question_text || q.questionText || '').trim(),
          question_type: q.question_type || q.questionType || 'TEXT',
          options: q.options || [],
          question_order: idx + 1,
          is_required: q.is_required !== undefined ? q.is_required : true
        }))
      };

      if (isEdit) {
        const res = await feedbackAPI.update(editCampaign.id, payload);
        onSuccess(res.data?.data || res.data);
      } else {
        const res = await feedbackAPI.create(payload);
        onSuccess(res.data?.data || res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save feedback campaign:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save feedback campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal-content" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="fb-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <h3 className="fb-modal-title">
              {isEdit ? 'Edit Feedback Campaign' : 'Create Feedback Campaign'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="fb-modal-body">
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Campaign Title */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Feedback Campaign Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Python Batch Student Feedback — October"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Course & Date Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Course / Branch *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setSelectedBatchIds([]);
                  }}
                  disabled={isEdit}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    background: isEdit ? '#f8fafc' : '#ffffff',
                    cursor: isEdit ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Feedback Date *
                </label>
                <input
                  type="date"
                  value={feedbackDate}
                  onChange={(e) => setFeedbackDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Target Batches Multi-Select */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                  Selected Batches * ({selectedBatchIds.length} of {courseBatches.length})
                </label>
                {courseBatches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllBatches}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedBatchIds.length === courseBatches.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {courseBatches.length === 0 ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12.5px', color: '#64748b' }}>
                  No batches configured for the selected course.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '8px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#f8fafc'
                }}>
                  {courseBatches.map(b => (
                    <label
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: selectedBatchIds.includes(b.id) ? '#1e293b' : '#64748b',
                        background: selectedBatchIds.includes(b.id) ? '#ffffff' : 'transparent',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: selectedBatchIds.includes(b.id) ? '1px solid #cbd5e1' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.includes(b.id)}
                        onChange={() => handleToggleBatch(b.id)}
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Questions Builder */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <QuestionBuilder questions={questions} onChange={setQuestions} />
            </div>
          </div>

          {/* Footer */}
          <div className="fb-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: '700',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Feedback Campaign' : 'Create Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFeedbackModal;
