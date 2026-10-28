import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  BookOpen, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  Filter, 
  Search, 
  CheckCircle, 
  FileText,
  RotateCcw
} from 'lucide-react';
import styles from '../../pages/feedback/Feedback.styles';

const FeedbackFlipbookModal = ({
  isOpen,
  onClose,
  reportData,
  initialBatchFilter = 'ALL'
}) => {
  const [selectedBatch, setSelectedBatch] = useState(initialBatchFilter);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchStudent, setSearchStudent] = useState('');

  // Sync batch filter when opening or prop changes
  useEffect(() => {
    if (isOpen) {
      setSelectedBatch(initialBatchFilter || 'ALL');
      setCurrentIndex(0);
      setSearchStudent('');
    }
  }, [isOpen, initialBatchFilter]);

  const campaign = reportData?.campaign || {};
  const allResponses = useMemo(() => reportData?.responses || [], [reportData]);
  const questions = useMemo(() => reportData?.questions || [], [reportData]);
  const batches = useMemo(() => reportData?.batches || [], [reportData]);

  // Filter responses by selected batch
  const filteredResponses = useMemo(() => {
    let list = allResponses;
    if (selectedBatch && selectedBatch !== 'ALL') {
      const bId = parseInt(selectedBatch, 10);
      list = list.filter(r => r.batch_id === bId || (isNaN(bId) && r.batch_name === selectedBatch));
    }
    if (searchStudent && searchStudent.trim()) {
      const q = searchStudent.trim().toLowerCase();
      list = list.filter(r => 
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.student_email && r.student_email.toLowerCase().includes(q)) ||
        (r.student_mobile && r.student_mobile.includes(q))
      );
    }
    return list;
  }, [allResponses, selectedBatch, searchStudent]);

  // Ensure current index is within bounds
  useEffect(() => {
    if (currentIndex >= filteredResponses.length) {
      setCurrentIndex(Math.max(0, filteredResponses.length - 1));
    }
  }, [filteredResponses, currentIndex]);

  const currentResponse = filteredResponses[currentIndex] || null;

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(filteredResponses.length - 1, prev + 1));
  }, [filteredResponses.length]);

  // Keyboard navigation (Left / Right Arrow)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Do not trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fb-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div 
        className="fb-modal-content"
        style={{
          ...styles.modalContainer,
          maxWidth: '820px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10000
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #334155'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#93c5fd', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <FileText size={14} /> Feedback Review & Flipbook
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '2px 0 0', color: '#ffffff', letterSpacing: '-0.01em' }}>
              {campaign.title || 'Course Feedback'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Close viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Counter Bar */}
        <div style={{
          padding: '10px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Batch Selector & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
              <Filter size={13} /> Batch:
              <select
                value={selectedBatch}
                onChange={e => {
                  setSelectedBatch(e.target.value);
                  setCurrentIndex(0);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1e293b'
                }}
              >
                <option value="ALL">All Batches ({allResponses.length})</option>
                {batches.map(b => {
                  const bCount = allResponses.filter(r => r.batch_id === b.id).length;
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({bCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quick Student Jump Dropdown */}
            {filteredResponses.length > 0 && (
              <select
                value={currentIndex}
                onChange={e => setCurrentIndex(Number(e.target.value))}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#4338ca',
                  maxWidth: '180px'
                }}
                title="Jump directly to student"
              >
                {filteredResponses.map((r, i) => (
                  <option key={r.response_id || i} value={i}>
                    {i + 1}. {r.student_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Flipbook Position Counter & Top Arrow Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {filteredResponses.length > 0 ? (
              <span style={{
                background: '#e0e7ff',
                color: '#3730a3',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '800'
              }}>
                Feedback {currentIndex + 1} of {filteredResponses.length}
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#64748b' }}>0 responses</span>
            )}

            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentIndex <= 0 ? '#f1f5f9' : '#ffffff',
                color: currentIndex <= 0 ? '#94a3b8' : '#1e293b',
                cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Previous response (Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= filteredResponses.length - 1}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentIndex >= filteredResponses.length - 1 ? '#f1f5f9' : '#ffffff',
                color: currentIndex >= filteredResponses.length - 1 ? '#94a3b8' : '#1e293b',
                cursor: currentIndex >= filteredResponses.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Next response (Right Arrow)"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Paper / Card Review Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          background: '#f1f5f9'
        }}>
          {filteredResponses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
            }}>
              <div style={{ fontSize: '38px', marginBottom: '12px' }}>📋</div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px' }}>
                No feedback responses available yet.
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                {selectedBatch !== 'ALL' 
                  ? 'No students from this batch have submitted feedback for this campaign.' 
                  : 'Students have not yet submitted responses for this campaign.'}
              </p>
            </div>
          ) : currentResponse ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              padding: '28px 24px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)',
              position: 'relative'
            }}>
              {/* Top Paper Header: Student Identity & Submission Meta */}
              <div style={{
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                      {currentResponse.student_name}
                    </h3>
                    <span style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '2px 9px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '800'
                    }}>
                      📁 {currentResponse.batch_name || 'Unassigned'}
                    </span>
                    <span style={{
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle size={12} /> Submitted
                    </span>
                  </div>

                  {/* Contact Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                    {currentResponse.student_mobile && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> {currentResponse.student_mobile}
                      </span>
                    )}
                    {currentResponse.student_email && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} /> {currentResponse.student_email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission Timestamp */}
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#334155' }}>
                    <Clock size={12} /> {currentResponse.submitted_at 
                      ? new Date(currentResponse.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Submitted'}
                  </div>
                </div>
              </div>

              {/* Questionnaire & Answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {questions.map((q, idx) => {
                  const ans = (currentResponse.answers || []).find(a => Number(a.question_id) === Number(q.id));

                  return (
                    <div 
                      key={q.id || idx} 
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px 18px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>
                          <span style={{ color: '#4f46e5', marginRight: '6px' }}>Q{idx + 1}.</span>
                          {q.question_text}
                        </div>
                        {q.question_type === 'RATING' && (
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            Rating (1-5)
                          </span>
                        )}
                      </div>

                      {/* Answer Content based on question type */}
                      {q.question_type === 'RATING' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[1, 2, 3, 4, 5].map(starVal => {
                              const rating = ans?.rating_value || ans?.ratingValue || 0;
                              return (
                                <Star 
                                  key={starVal}
                                  size={18}
                                  color={starVal <= rating ? '#f59e0b' : '#cbd5e1'}
                                  fill={starVal <= rating ? '#f59e0b' : 'none'}
                                />
                              );
                            })}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginLeft: '4px' }}>
                            {ans?.rating_value ? `${ans.rating_value} / 5` : 'Not Rated'}
                          </span>
                        </div>
                      ) : q.question_type === 'SINGLE_CHOICE' ? (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'inline-block'
                          }}>
                            ✓ {ans?.answer_text || 'No selection'}
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {ans?.answer_text && String(ans.answer_text).trim() 
                            ? ans.answer_text.trim() 
                            : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No answer provided</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Overall Feedback Section */}
                {currentResponse.overall_feedback && String(currentResponse.overall_feedback).trim() && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    marginTop: '4px'
                  }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Overall Feedback Notes
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#78350f', margin: 0, fontStyle: 'italic', lineHeight: '1.5' }}>
                      "{currentResponse.overall_feedback.trim()}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Bottom Navigation Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
        }}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: currentIndex <= 0 ? '#f8fafc' : '#ffffff',
              color: currentIndex <= 0 ? '#94a3b8' : '#1e293b',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>
            {filteredResponses.length > 0 ? (
              <span>Student <strong>{currentIndex + 1}</strong> of <strong>{filteredResponses.length}</strong></span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= filteredResponses.length - 1}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: currentIndex >= filteredResponses.length - 1 ? '#e2e8f0' : '#4f46e5',
              color: currentIndex >= filteredResponses.length - 1 ? '#94a3b8' : '#ffffff',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: currentIndex >= filteredResponses.length - 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: currentIndex >= filteredResponses.length - 1 ? 'none' : '0 2px 4px rgba(79,70,229,0.3)',
              transition: 'all 0.15s'
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFlipbookModal;
