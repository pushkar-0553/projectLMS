import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  Layers, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Filter, 
  Search,
  LayoutList,
  Eye
} from 'lucide-react';
import { feedbackAPI } from '../../services/api';
import { exportFeedbackToExcel } from '../../utils/feedbackExcelExport';

const PublicFeedbackCatalogPage = () => {
  const { token } = useParams();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View mode: 'flipbook' (one student paper at a time) or 'list' (full catalog list)
  const [viewMode, setViewMode] = useState('flipbook');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadCatalog();
  }, [token]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await feedbackAPI.getPublicCatalog(token);
      setReportData(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load feedback catalog:', err);
      setError(err.response?.data?.message || 'This feedback report link is invalid, expired, or has been revoked.');
    } finally {
      setLoading(false);
    }
  };

  const campaign = reportData?.campaign || {};
  const stats = reportData?.stats || {};
  const questions = useMemo(() => reportData?.questions || [], [reportData]);
  const allResponses = useMemo(() => reportData?.responses || [], [reportData]);
  const batches = useMemo(() => reportData?.batches || [], [reportData]);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    let list = allResponses;
    if (selectedBatch && selectedBatch !== 'ALL') {
      const bId = parseInt(selectedBatch, 10);
      list = list.filter(r => r.batch_id === bId || (isNaN(bId) && r.batch_name === selectedBatch));
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(r => 
        (r.student_name && r.student_name.toLowerCase().includes(q)) ||
        (r.batch_name && r.batch_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allResponses, selectedBatch, searchQuery]);

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

  // Keyboard navigation for flipbook view
  useEffect(() => {
    if (viewMode !== 'flipbook') return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handlePrev, handleNext]);

  const handleExcelExport = () => {
    if (reportData) {
      exportFeedbackToExcel(reportData, campaign.title);
    }
  };

  const handleWordExport = () => {
    const url = feedbackAPI.getPublicCatalogDocxUrl(token);
    window.open(url, '_blank');
  };

  const handlePdfExport = () => {
    const url = feedbackAPI.getPublicCatalogPdfUrl(token);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>Loading Feedback Catalog Report...</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Preparing responses and executive metrics</div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #fee2e2',
          borderRadius: '16px',
          padding: '36px 28px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <AlertCircle size={46} color="#dc2626" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            Report Unavailable
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
            {error || 'This feedback report link is invalid or no longer active. Please request a new link from your coordinator.'}
          </p>
        </div>
      </div>
    );
  }

  const totalStud = stats.total_students || 0;
  const completed = stats.completed_count || allResponses.length || 0;
  const pending = stats.pending_count !== undefined ? stats.pending_count : Math.max(0, totalStud - completed);
  const rate = stats.completion_rate !== undefined ? stats.completion_rate : (totalStud > 0 ? Math.round((completed / totalStud) * 100) : 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#1e293b'
    }}>
      {/* Top Navbar */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#4f46e5',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '15px'
            }}>
              V
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
                VCUBE LMS
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                Official Feedback Review Catalog
              </div>
            </div>
          </div>

          {/* Export Actions Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '4px' }}>
              Export:
            </span>
            <button
              type="button"
              onClick={handleExcelExport}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                color: '#166534',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              type="button"
              onClick={handleWordExport}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Download Word document"
            >
              <FileText size={14} /> Word
            </button>
            <button
              type="button"
              onClick={handlePdfExport}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Download PDF document"
            >
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Main Catalog Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 80px' }}>
        {/* Campaign Header Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            <BookOpen size={16} /> Course: {campaign.course_name}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            {campaign.title}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', fontSize: '13px', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Feedback Date: {campaign.feedback_date}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={14} /> Questions Defined: {questions.length}
            </span>
          </div>

          {/* Batches Pill Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Batches:</span>
            {batches.map(b => (
              <span key={b.id} style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                📁 {b.name}
              </span>
            ))}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #4f46e5', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{totalStud}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Total Students</div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#047857' }}>{completed}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Completed Feedback ({rate}%)</div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#b45309' }}>{pending}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Pending Response</div>
          </div>
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#4338ca' }}>{questions.length}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Questions Evaluated</div>
          </div>
        </div>

        {/* Toolbar: View Switcher, Batch Filter, Search */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('flipbook')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'flipbook' ? '#ffffff' : 'transparent',
                color: viewMode === 'flipbook' ? '#0f172a' : '#64748b',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: viewMode === 'flipbook' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Eye size={14} /> Paper Flipbook
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <LayoutList size={14} /> Complete List
            </button>
          </div>

          {/* Batch Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({allResponses.filter(r => r.batch_id === b.id).length})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '8px' }} />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentIndex(0);
                }}
                style={{
                  padding: '5px 10px 5px 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  width: '150px'
                }}
              />
            </div>
          </div>
        </div>

        {/* View Content */}
        {filteredResponses.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '50px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px' }}>
              No feedback responses available yet.
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Submitted responses for this campaign will appear here once recorded.
            </p>
          </div>
        ) : viewMode === 'flipbook' ? (
          /* ======================================================== */
          /* FLIPBOOK VIEW (One student at a time)                   */
          /* ======================================================== */
          currentResponse && (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              padding: '28px 24px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)'
            }}>
              {/* Flipbook Header with Navigation Controls */}
              <div style={{
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
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
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Submitted on: {currentResponse.submitted_at 
                      ? new Date(currentResponse.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                      : 'Submitted'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex <= 0}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentIndex <= 0 ? '#f8fafc' : '#ffffff',
                      color: currentIndex <= 0 ? '#94a3b8' : '#1e293b',
                      cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex >= filteredResponses.length - 1}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: currentIndex >= filteredResponses.length - 1 ? '#f8fafc' : '#ffffff',
                      color: currentIndex >= filteredResponses.length - 1 ? '#94a3b8' : '#1e293b',
                      cursor: currentIndex >= filteredResponses.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Questions & Answers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                        <span style={{ color: '#4f46e5', marginRight: '6px' }}>Q{idx + 1}.</span>
                        {q.question_text}
                      </div>

                      {q.question_type === 'RATING' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            {ans?.rating_value ? `${ans.rating_value} / 5 Stars` : 'Not Rated'}
                          </span>
                        </div>
                      ) : q.question_type === 'SINGLE_CHOICE' ? (
                        <div>
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

                {/* Overall Feedback */}
                {currentResponse.overall_feedback && String(currentResponse.overall_feedback).trim() && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    marginTop: '4px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Overall Feedback Notes
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#78350f', margin: 0, fontStyle: 'italic', lineHeight: '1.5' }}>
                      "{currentResponse.overall_feedback.trim()}"
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Strip */}
              <div style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: currentIndex <= 0 ? '#f8fafc' : '#ffffff',
                    color: currentIndex <= 0 ? '#94a3b8' : '#1e293b',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Reviewing student {currentIndex + 1} of {filteredResponses.length}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex >= filteredResponses.length - 1}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentIndex >= filteredResponses.length - 1 ? '#e2e8f0' : '#4f46e5',
                    color: currentIndex >= filteredResponses.length - 1 ? '#94a3b8' : '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: currentIndex >= filteredResponses.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )
        ) : (
          /* ======================================================== */
          /* COMPLETE LIST VIEW (All students listed)                */
          /* ======================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredResponses.map((resp, rIdx) => {
              const answersMap = {};
              (resp.answers || []).forEach(a => {
                answersMap[a.question_id] = a;
              });

              return (
                <div
                  key={resp.response_id || rIdx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>#{rIdx + 1}</span>
                        <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          {resp.student_name}
                        </h3>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#4338ca',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700'
                        }}>
                          📁 {resp.batch_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {resp.submitted_at 
                        ? new Date(resp.submitted_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })
                        : 'Submitted'}
                    </div>
                  </div>

                  {/* Questions & Answers in list mode */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {questions.map((q, qIdx) => {
                      const ans = answersMap[q.id];
                      return (
                        <div key={q.id || qIdx} style={{ fontSize: '13px' }}>
                          <div style={{ fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                            <span style={{ color: '#4f46e5', marginRight: '5px' }}>Q{qIdx + 1}.</span>
                            {q.question_text}
                          </div>
                          {q.question_type === 'RATING' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '800', color: '#b45309' }}>
                                {ans?.rating_value ? `${ans.rating_value} / 5 Stars` : 'Not Rated'}
                              </span>
                            </div>
                          ) : (
                            <div style={{ color: '#0369a1', marginLeft: '16px' }}>
                              {ans?.answer_text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {resp.overall_feedback && (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12.5px',
                        color: '#78350f',
                        fontStyle: 'italic',
                        marginTop: '6px'
                      }}>
                        <strong>Overall:</strong> "{resp.overall_feedback.trim()}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicFeedbackCatalogPage;
