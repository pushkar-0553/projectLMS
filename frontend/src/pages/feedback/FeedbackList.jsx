import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Users, CheckCircle, Clock, Trash2, Edit3, ArrowRight, BookOpen, Layers, Share2 } from 'lucide-react';
import { feedbackAPI } from '../../services/api';
import { useCourse } from '../../context/CourseContext';
import styles from './Feedback.styles';
import './Feedback.css';
import CreateFeedbackModal from '../../components/feedback/CreateFeedbackModal';
import FeedbackShareModal from '../../components/feedback/FeedbackShareModal';

const FeedbackList = () => {
  const navigate = useNavigate();
  const { currentCourse, courseSlug } = useCourse();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sharingCampaign, setSharingCampaign] = useState(null);
  const [shareReportData, setShareReportData] = useState(null);

  const handleOpenShare = async (e, c) => {
    e.stopPropagation();
    setSharingCampaign(c);
    try {
      if (!c.share_token) {
        const res = await feedbackAPI.generateShareToken(c.id);
        if (res.data?.share_token) {
          setSharingCampaign(prev => prev ? ({ ...prev, share_token: res.data.share_token }) : prev);
          loadCampaigns();
        }
      }
      feedbackAPI.getReportData(c.id).then(rRes => {
        if (rRes && rRes.data) {
          setShareReportData(rRes.data);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to pre-generate share token:', err);
    }
  };

  const activeCourseId = currentCourse?.id || null;

  useEffect(() => {
    loadCampaigns();
  }, [activeCourseId, courseSlug]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const params = activeCourseId ? { courseId: activeCourseId } : {};
      const res = await feedbackAPI.getAll(params);
      setCampaigns(res.data || []);
    } catch (err) {
      console.error('Failed to load feedback campaigns:', err);
      setError('Failed to fetch feedback campaigns. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (e, id, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? All submitted student responses for this campaign will be removed.`)) {
      return;
    }
    try {
      await feedbackAPI.delete(id);
      loadCampaigns();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      alert('Failed to delete feedback campaign');
    }
  };

  const handleOpenDetail = (campaignId) => {
    if (courseSlug) {
      navigate(`/${courseSlug}/feedback/${campaignId}`);
    } else {
      navigate(`/feedback/${campaignId}`);
    }
  };

  // High-level statistics across all campaigns
  const stats = useMemo(() => {
    let totalFeedbacks = campaigns.length;
    let activeFeedbacks = 0;
    let completedFeedbacks = 0;
    let totalStudents = 0;
    let responsesReceived = 0;
    let pendingResponses = 0;

    campaigns.forEach(c => {
      if (c.status === 'COMPLETED') completedFeedbacks++;
      else activeFeedbacks++;

      totalStudents += Number(c.total_students || 0);
      responsesReceived += Number(c.responses_count || 0);
      pendingResponses += Number(c.pending_count || 0);
    });

    return {
      totalFeedbacks,
      activeFeedbacks,
      completedFeedbacks,
      totalStudents,
      responsesReceived,
      pendingResponses
    };
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaigns.filter(c => {
      const matchSearch = !q ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.course_name && c.course_name.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  return (
    <div className="fb-page-container">
      {/* Top Header */}
      <div className="fb-header">
        <div className="fb-header-left">
          <div className="fb-title-row">
            <h1 className="fb-title">Student Feedback Hub</h1>
            {currentCourse && (
              <span style={styles.courseBadge}>
                {currentCourse.name}
              </span>
            )}
          </div>
          <p className="fb-subtitle">
            Create structured feedback campaigns, contact students batch-wise, and record feedback directly.
          </p>
        </div>

        <div className="fb-header-actions">
          <button
            type="button"
            className="fb-action-btn-give"
            onClick={() => {
              setEditingCampaign(null);
              setShowCreateModal(true);
            }}
            style={{ padding: '10px 18px', fontSize: '13.5px', height: '42px' }}
          >
            <Plus size={16} /> Create Feedback
          </button>
        </div>
      </div>

      {/* Aggregate Metric Counters */}
      <div className="fb-stat-strip">
        <div className="fb-stat-card" style={{ borderLeftColor: '#4f46e5' }}>
          <span className="fb-stat-val">{stats.totalFeedbacks}</span>
          <span className="fb-stat-label">Total Feedbacks</span>
        </div>

        <div className="fb-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="fb-stat-val">{stats.activeFeedbacks}</span>
          <span className="fb-stat-label">Active Feedbacks</span>
        </div>

        <div className="fb-stat-card" style={{ borderLeftColor: '#0ea5e9' }}>
          <span className="fb-stat-val">{stats.totalStudents}</span>
          <span className="fb-stat-label">Total Students</span>
        </div>

        <div className="fb-stat-card" style={{ borderLeftColor: '#10b981' }}>
          <span className="fb-stat-val" style={{ color: '#059669' }}>{stats.responsesReceived}</span>
          <span className="fb-stat-label">Responses Received</span>
        </div>

        <div className="fb-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <span className="fb-stat-val" style={{ color: '#d97706' }}>{stats.pendingResponses}</span>
          <span className="fb-stat-label">Pending Responses</span>
        </div>
      </div>

      {/* Main Container with Controls and Cards */}
      <div className="fb-card">
        {/* Controls Row: Search + Status Tabs */}
        <div className="fb-controls-row">
          <div className="fb-search-box">
            <Search size={16} className="fb-search-icon" />
            <input
              type="text"
              placeholder="Search feedback by title or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="fb-search-input"
            />
          </div>

          <div className="fb-tab-group">
            <button
              type="button"
              className={`fb-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({campaigns.length})
            </button>
            <button
              type="button"
              className={`fb-tab-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active ({stats.activeFeedbacks})
            </button>
            <button
              type="button"
              className={`fb-tab-btn ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed ({stats.completedFeedbacks})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>Loading feedback campaigns...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#dc2626' }}>
            {error}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
              No feedback campaigns found
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px' }}>
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first student feedback campaign to start collecting responses.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="fb-action-btn-give"
                onClick={() => {
                  setEditingCampaign(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus size={15} /> Create Feedback
              </button>
            )}
          </div>
        ) : (
          <div className="fb-grid" style={styles.grid}>
            {filteredCampaigns.map((c) => {
              const total = Number(c.total_students || 0);
              const responses = Number(c.responses_count || 0);
              const pending = Number(c.pending_count || 0);
              const completionPct = total > 0 ? Math.round((responses / total) * 100) : 0;
              const batchesList = c.batches || [];

              return (
                <div
                  key={c.id}
                  style={styles.campaignCard}
                  onClick={() => handleOpenDetail(c.id)}
                  className="fb-campaign-item"
                >
                  <div>
                    {/* Top title and status */}
                    <div style={styles.cardTop}>
                      <div>
                        <h3 style={styles.cardTitle}>{c.title}</h3>
                        <div style={styles.cardMeta}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4338ca', fontWeight: '700' }}>
                            <BookOpen size={12} /> {c.course_name}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {c.feedback_date}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.badge,
                          ...(c.status === 'COMPLETED' ? styles.completedBadge : styles.activeBadge)
                        }}
                      >
                        {c.status === 'COMPLETED' ? 'Completed' : 'Active'}
                      </span>
                    </div>

                    {/* Batches Pills */}
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {batchesList.length > 0 ? (
                        batchesList.map((b) => (
                          <span key={b.id || b.batch_id} style={styles.batchPill}>
                            📁 {b.name || b.batch_name}
                          </span>
                        ))
                      ) : (
                        <span style={styles.batchPill}>All unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Metrics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                      <span>Progress ({completionPct}%)</span>
                      <span>
                        <strong style={{ color: '#047857' }}>{responses}</strong> / {total} Students
                      </span>
                    </div>

                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${completionPct}%`
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      <span>Completed: <strong style={{ color: '#0f172a' }}>{responses}</strong></span>
                      <span>Pending: <strong style={{ color: '#b45309' }}>{pending}</strong></span>
                      <span>Questions: <strong style={{ color: '#0f172a' }}>{c.total_questions || 0}</strong></span>
                    </div>
                  </div>

                  {/* Card Footer: Action Buttons */}
                  <div style={styles.cardFooter}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(c);
                          setShowCreateModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Edit campaign details or questions"
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenShare(e, c)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          color: '#4338ca',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Share feedback catalog with management or export files"
                      >
                        <Share2 size={13} color="#4338ca" /> Share
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteCampaign(e, c.id, c.title)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Delete campaign"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(c.id)}
                      className="fb-action-btn-give"
                      style={{ padding: '6px 14px', fontSize: '12.5px' }}
                    >
                      Continue <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation / Edit Campaign Modal */}
      {showCreateModal && (
        <CreateFeedbackModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCampaign(null);
          }}
          onSuccess={(saved) => {
            loadCampaigns();
            if (!editingCampaign && saved?.id) {
              handleOpenDetail(saved.id);
            }
          }}
          currentCourseId={activeCourseId}
          editCampaign={editingCampaign}
        />
      )}

      {/* Share Feedback Catalog Modal */}
      {sharingCampaign && (
        <FeedbackShareModal
          isOpen={Boolean(sharingCampaign)}
          onClose={() => {
            setSharingCampaign(null);
            setShareReportData(null);
          }}
          campaign={sharingCampaign}
          reportData={shareReportData}
          onTokenUpdated={(updated) => {
            const newToken = updated?.share_token !== undefined ? updated.share_token : updated;
            setSharingCampaign(prev => prev ? ({ ...prev, share_token: newToken }) : null);
            loadCampaigns();
          }}
        />
      )}
    </div>
  );
};

export default FeedbackList;
