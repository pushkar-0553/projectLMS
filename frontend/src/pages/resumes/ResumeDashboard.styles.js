const styles = {
  container: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '24px 20px 80px'
  },
  dashboardGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'start',
    width: '100%',
    marginBottom: '24px'
  },
  mainTableArea: {
    flex: '1 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: 0
  },
  sidebarArea: {
    width: '100%',
    maxWidth: '350px',
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'sticky',
    top: '24px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 6px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  statStrip: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  statCard: {
    flex: '1 1 200px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #4f46e5',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: '1.2'
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px'
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
    gap: '16px'
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loaderText: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  drawer: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0f172a',
    color: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.2)',
    padding: '14px 28px',
    width: '90%',
    maxWidth: '600px',
    zIndex: 999
  },
  drawerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  drawerCount: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#38bdf8',
    marginRight: '8px'
  },
  drawerLabel: {
    fontSize: '14px',
    fontWeight: '600'
  },
  drawerBtn: {
    padding: '10px 18px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  notesModal: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '550px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    overflow: 'hidden'
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
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748b'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical'
  },
  submitNoteBtn: {
    alignSelf: 'flex-end',
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  notesListTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#475569',
    margin: '10px 0 0',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '8px'
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  noNotesText: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '10px 0',
    fontStyle: 'italic'
  },
  noteItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  noteAuthor: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase'
  },
  deleteNoteBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '11px',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '600'
  },
  noteContent: {
    fontSize: '13px',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.5'
  },
  noteDate: {
    fontSize: '10px',
    color: '#94a3b8',
    alignSelf: 'flex-end'
  },
  historyBtn: {
    padding: '10px 18px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    transition: 'all 0.2s'
  },
  drawerBtnWhatsApp: {
    padding: '10px 20px',
    background: '#128c7e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(18, 140, 126, 0.2)',
    transition: 'background-color 0.2s',
    marginRight: '8px'
  },
  drawerBtnZip: {
    padding: '10px 20px',
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
    transition: 'background-color 0.2s',
    marginRight: '8px'
  }
};

export default styles;
