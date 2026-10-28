import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { feedbackAPI } from '../../services/api';
import { exportFeedbackToExcel } from '../../utils/feedbackExcelExport';
import styles from '../../pages/feedback/Feedback.styles';

const FeedbackShareModal = ({
  isOpen,
  onClose,
  campaign,
  reportData,
  onTokenUpdated
}) => {
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentToken = campaign?.share_token || reportData?.campaign?.share_token;
  const shareCatalogUrl = currentToken ? feedbackAPI.getCatalogShareUrl(currentToken) : '';

  // Auto-generate share token if not yet created when opening modal
  useEffect(() => {
    if (isOpen && campaign?.id && !campaign.share_token && !reportData?.campaign?.share_token && !generatingLink) {
      handleGenerateLink();
    }
  }, [isOpen, campaign?.id, campaign?.share_token, reportData?.campaign?.share_token]);

  const handleGenerateLink = async () => {
    try {
      setGeneratingLink(true);
      setErrorMsg('');
      const res = await feedbackAPI.generateShareToken(campaign.id);
      const newToken = res.data?.share_token;
      if (newToken && onTokenUpdated) {
        onTokenUpdated({ share_token: newToken });
      }
    } catch (err) {
      console.error('Failed to generate share link:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate share link. Please try again.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!window.confirm('Are you sure you want to revoke this public link? Higher officials will no longer be able to open the shared report.')) {
      return;
    }
    try {
      setRevokingLink(true);
      setErrorMsg('');
      await feedbackAPI.revokeShareToken(campaign.id);
      if (onTokenUpdated) {
        onTokenUpdated({ share_token: null });
      }
    } catch (err) {
      console.error('Failed to revoke share link:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to revoke share link. Please try again.');
    } finally {
      setRevokingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareCatalogUrl) return;
    try {
      await navigator.clipboard.writeText(shareCatalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Share Link: ${shareCatalogUrl}`);
    }
  };

  const handleExportExcel = () => {
    try {
      setExportingExcel(true);
      exportFeedbackToExcel(reportData, campaign.title);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to generate Excel file. Please try again.');
    } finally {
      setTimeout(() => setExportingExcel(false), 800);
    }
  };

  const handleExportWord = () => {
    try {
      setExportingWord(true);
      const url = feedbackAPI.getDocxExportUrl(campaign.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to export Word document:', err);
      alert('Unable to generate Word document.');
    } finally {
      setTimeout(() => setExportingWord(false), 1200);
    }
  };

  const handleExportPdf = () => {
    try {
      setExportingPdf(true);
      const url = feedbackAPI.getPdfExportUrl(campaign.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to export PDF document:', err);
      alert('Unable to generate PDF document.');
    } finally {
      setTimeout(() => setExportingPdf(false), 1200);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fb-modal-overlay" style={styles.modalOverlay} onClick={onClose}>
      <div 
        className="fb-modal-content"
        style={{
          ...styles.modalContainer,
          maxWidth: '640px',
          width: '95%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10000
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#a5b4fc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Share2 size={14} /> Report Distribution
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: '800', margin: '4px 0 0', color: '#ffffff', letterSpacing: '-0.01em' }}>
              Share Feedback Catalog
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
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#b91c1c',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* Section 1: Share via Public Link */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                <LinkIcon size={15} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Share via Link
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px', lineHeight: '1.5' }}>
              Generate a secure, read-only link for higher officials to review submitted feedback without administrative controls or login barriers.
            </p>

            {currentToken ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '4px 4px 4px 12px',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  <input
                    type="text"
                    readOnly
                    value={shareCatalogUrl}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '12.5px',
                      color: '#1e293b',
                      background: 'transparent',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '7px',
                      border: 'none',
                      background: copied ? '#059669' : '#4f46e5',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s'
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={shareCatalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '7px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Open shared catalog in new tab"
                  >
                    <ExternalLink size={13} /> Open
                  </a>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#059669', fontWeight: '600' }}>
                    <ShieldCheck size={13} /> Link Active (Read-Only Access)
                  </div>
                  <button
                    type="button"
                    onClick={handleRevokeLink}
                    disabled={revokingLink}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 6px'
                    }}
                  >
                    {revokingLink ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />} Revoke Link
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9px',
                  border: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(79,70,229,0.3)'
                }}
              >
                {generatingLink ? <Loader2 size={14} className="spin" /> : <LinkIcon size={14} />} Generate Shareable Link
              </button>
            )}
          </div>

          {/* Section 2: Export Documents */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Export Formats
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              {/* Excel Export */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exportingExcel}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#16a34a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#bbf7d0'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={18} />
                  </div>
                  {exportingExcel ? <Loader2 size={14} color="#16a34a" className="spin" /> : <Download size={14} color="#16a34a" />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#065f46' }}>
                    Excel (.xlsx)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Summary & student data
                  </div>
                </div>
              </button>

              {/* Word Export */}
              <button
                type="button"
                onClick={handleExportWord}
                disabled={exportingWord}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#bfdbfe'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                  {exportingWord ? <Loader2 size={14} color="#2563eb" className="spin" /> : <Download size={14} color="#2563eb" />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af' }}>
                    Word (.docx)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Structured paper report
                  </div>
                </div>
              </button>

              {/* PDF Export */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fecaca',
                  borderRadius: '12px',
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                  {exportingPdf ? <Loader2 size={14} color="#dc2626" className="spin" /> : <Download size={14} color="#dc2626" />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#991b1b' }}>
                    PDF (.pdf)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Executive print-ready PDF
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackShareModal;
