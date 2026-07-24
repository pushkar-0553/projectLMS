import React, { useState } from 'react';
import { resumeAPI } from '../../services/api';
import ManageCollectionModal from './ManageCollectionModal';

const CollectionsList = ({ collections = [], onRefresh }) => {
  const [copiedId, setCopiedId] = useState(null);
  const [selectedManageCollectionId, setSelectedManageCollectionId] = useState(null);

  const handleCopy = (shareToken, id) => {
    const origin = window.location.origin;
    const fullUrl = `${origin}/resumes/share/${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this collection and deactivate the public link?')) {
      return;
    }
    try {
      await resumeAPI.deleteCollection(id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to delete collection:', error);
      alert('Error deleting collection');
    }
  };

  if (collections.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Shareable Collections History</h3>
        <p style={styles.emptyText}>No collections have been generated yet. Select candidates below and click "Generate Share Link" to create one.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Shareable Collections History ({collections.length})</h3>
      <div style={styles.listContainer}>
        {collections.map((col) => {
          const origin = window.location.origin;
          const shareUrl = `${origin}/resumes/share/${col.share_token}`;

          return (
            <div key={col.id} style={styles.collectionItem}>
              <div style={styles.itemHeader}>
                <div style={styles.titleSec}>
                  <strong style={styles.colTitle}>📂 {col.title}</strong>
                  <span style={styles.candidateCount}>
                    👤 {col.student_count} {col.student_count === 1 ? 'candidate' : 'candidates'}
                  </span>
                </div>
                <div style={styles.headerActions}>
                  <button
                    onClick={() => setSelectedManageCollectionId(col.id)}
                    style={styles.manageBtn}
                    title="Add or remove candidates in this link"
                  >
                    ✏️ Manage Candidates
                  </button>
                  <button
                    onClick={() => handleDelete(col.id)}
                    style={styles.deleteBtn}
                    title="Delete collection"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Job Info row */}
              {(col.company_name || col.salary || col.jd) && (
                <div style={styles.jobDetailsRow}>
                  {col.company_name && (
                    <span style={styles.jobPill}>
                      🏢 {col.company_name}
                    </span>
                  )}
                  {col.salary && (
                    <span style={styles.jobPill}>
                      💰 {col.salary}
                    </span>
                  )}
                  {col.jd && (
                    <span
                      style={styles.jobPillJd}
                      title={col.jd}
                    >
                      📄 JD: {col.jd.length > 25 ? `${col.jd.substring(0, 25)}...` : col.jd}
                    </span>
                  )}
                </div>
              )}

              <div style={styles.linkBlock}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={styles.linkInput}
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={() => handleCopy(col.share_token, col.id)}
                  style={{
                    ...styles.copyBtn,
                    background: copiedId === col.id ? '#10b981' : '#4f46e5'
                  }}
                >
                  {copiedId === col.id ? 'Copied! ✓' : 'Copy 📋'}
                </button>
              </div>

              <div style={styles.metaRow}>
                <span>Created by: {col.creator_name || 'Staff'}</span>
                <span>
                  {new Date(col.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedManageCollectionId && (
        <ManageCollectionModal
          collectionId={selectedManageCollectionId}
          onClose={() => setSelectedManageCollectionId(null)}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  emptyText: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '380px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  collectionItem: {
    border: '1px solid #f1f5f9',
    background: '#fafafa',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  manageBtn: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '6px',
    padding: '3px 8px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  titleSec: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  colTitle: {
    fontSize: '14px',
    color: '#1e293b'
  },
  candidateCount: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '600'
  },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
    fontWeight: '700'
  },
  jobDetailsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '2px'
  },
  jobPill: {
    background: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  jobPillJd: {
    background: '#f5f3ff',
    color: '#5b21b6',
    border: '1px solid #ddd6fe',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  linkBlock: {
    display: 'flex',
    gap: '6px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '4px',
    alignItems: 'center'
  },
  linkInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '12px',
    color: '#0f172a',
    padding: '2px 6px',
    cursor: 'pointer'
  },
  copyBtn: {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '2px'
  }
};

export default CollectionsList;
