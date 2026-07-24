const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  blob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(79, 70, 229, 0.05)',
    top: '-100px',
    right: '-100px',
    pointerEvents: 'none',
    zIndex: 0
  },
  blob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'rgba(14, 165, 233, 0.04)',
    bottom: '-200px',
    left: '-200px',
    pointerEvents: 'none',
    zIndex: 0
  },
  container: {
    maxWidth: '1350px',
    margin: '0 auto',
    padding: '32px 24px',
    position: 'relative',
    zIndex: 1
  },
  portalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    fontSize: '24px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  badgePublic: {
    padding: '4px 12px',
    background: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  exportExcelBtn: {
    padding: '8px 16px',
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
    outline: 'none'
  },
  downloadZipBtn: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
    outline: 'none'
  },
  shareHubBtn: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
    outline: 'none'
  },
  headerCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    padding: '28px',
    marginBottom: '24px',
    position: 'relative',
    overflow: 'hidden'
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)'
  },
  collectionTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 10px'
  },
  metaRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  metaItem: {
    fontSize: '13px',
    color: '#64748b'
  },
  tableCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    padding: '24px',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  thCheck: {
    padding: '12px 16px',
    borderBottom: '2px solid #f1f5f9',
    width: '40px'
  },
  tdCheck: {
    padding: '16px',
    width: '40px'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    borderRadius: '4px'
  },
  thActions: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'right'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s',
    '&:hover': {
      background: '#f8fafc'
    }
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#334155'
  },
  tdName: {
    padding: '16px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a'
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  nameText: {
    fontSize: '14px',
    fontWeight: '700'
  },
  locationText: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500'
  },
  domainBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600'
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '500'
  },
  tdInfo: {
    padding: '16px',
    maxWidth: '300px'
  },
  infoBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoLine: {
    fontSize: '12px',
    color: '#475569'
  },
  skillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px'
  },
  skillPill: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600'
  },
  linksRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px'
  },
  socialLink: {
    fontSize: '11px',
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: '600'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.02em',
    display: 'inline-block'
  },
  commentSnippet: {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic',
    maxWidth: '185px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  tdActions: {
    padding: '16px',
    textAlign: 'right'
  },
  actionsGroup: {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: '8px',
    width: '130px'
  },
  actionBtnView: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffffff',
    background: '#4f46e5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  actionBtnDownload: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#1e293b',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  actionBtnEvaluate: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f766e',
    background: '#ccfbf1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.2s'
  },
  noResume: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  emptyCell: {
    padding: '48px 0',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: '15px',
    color: '#64748b',
    fontWeight: '600'
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '24px'
  },
  errorCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 24px',
    maxWidth: '480px',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '10px'
  },
  errorText: {
    fontSize: '14px',
    color: '#ef4444',
    lineHeight: '1.6',
    marginBottom: '16px',
    fontWeight: '600'
  },
  errorSubtext: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px'
  },
  evalModal: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  modalSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0'
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto'
  },
  evalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    background: '#ffffff',
    cursor: 'pointer'
  },
  textarea: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  footerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px'
  },
  cancelBtn: {
    padding: '10px 18px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    padding: '10px 18px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  
  // Search & Filter bar styles for public collection page
  searchFilterCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '18px 20px',
    marginBottom: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  searchGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    fontSize: '16px',
    color: '#94a3b8'
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  filtersGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  filterWrapper: {
    flex: '1 1 160px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  select: {
    padding: '9px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    background: '#ffffff',
    color: '#1e293b',
    cursor: 'pointer'
  },
  resetBtn: {
    padding: '9px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ef4444',
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    cursor: 'pointer',
    height: '36px',
    alignSelf: 'flex-end',
    whiteSpace: 'nowrap'
  },
  matchCountPill: {
    marginLeft: 'auto',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    background: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    alignSelf: 'flex-end',
    height: '36px',
    display: 'flex',
    alignItems: 'center'
  }
};

export default styles;
