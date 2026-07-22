import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { resumeAPI } from '../../services/api';
import { googleOAuthService } from '../../services/GoogleOAuthService';
import { googleDriveService } from '../../services/GoogleDriveService';
import { googleSheetService } from '../../services/GoogleSheetService';

const PlacementShareHubModal = ({ isOpen, onClose, collection, selectedStudentIds, token, onDownloadZIP }) => {
  // Navigation / Tab states
  const [activeTab, setActiveTab] = useState('cloud'); // 'local', 'cloud', 'share'
  
  // Google Drive process states
  const [googleToken, setGoogleToken] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null); // { id, name }
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'authenticating', 'preparing', 'uploading', 'converting', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Post-upload references
  const [driveFileId, setDriveFileId] = useState(null);
  const [driveLink, setDriveLink] = useState('');
  const [sheetId, setSheetId] = useState(null);
  const [sheetLink, setSheetLink] = useState('');
  
  // Copy feedback states
  const [copyFeedback, setCopyFeedback] = useState({});

  useEffect(() => {
    // Try to load cached token silently if modal opens
    if (isOpen) {
      const cached = googleOAuthService.getStoredToken();
      if (cached) setGoogleToken(cached);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper: Generate Excel Blob from candidate list
  const generateExcelBlob = () => {
    if (!collection || !collection.students) return null;

    const data = [
      [
        "S.No", 
        "Candidate Name", 
        "Domain", 
        "Email Address", 
        "Mobile Number", 
        "Evaluation Status", 
        "Recruiter Feedback Comments",
        "Evaluation Date"
      ]
    ];

    collection.students.forEach((student, index) => {
      let statusText = 'PENDING';
      if (student.review_status === 'selected') statusText = 'SELECTED';
      else if (student.review_status === 'unselected') statusText = 'UNSELECTED';
      else if (student.review_status === 'go_to_next') statusText = 'GO TO NEXT ONE';

      const formattedDate = student.reviewed_at
        ? new Date(student.reviewed_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'N/A';

      data.push([
        index + 1,
        student.name,
        student.domain || 'N/A',
        student.email || 'N/A',
        student.mobile || 'N/A',
        statusText,
        student.review_comment || 'N/A',
        formattedDate
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Apply strict column formatting widths
    const wscols = [
      { wch: 6 },  // S.No
      { wch: 25 }, // Name
      { wch: 15 }, // Domain
      { wch: 25 }, // Email
      { wch: 15 }, // Mobile
      { wch: 18 }, // Status
      { wch: 35 }, // Feedback
      { wch: 15 }  // Date
    ];
    ws['!cols'] = wscols;

    // Apply hyperlinking to Candidate Name (column B = index 1)
    collection.students.forEach((student, index) => {
      const rowIndex = index + 1; // row 0 is header
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
      
      let resumeLink = '';
      if (student.cloudinary_url) {
        resumeLink = student.cloudinary_url;
      } else if (student.file_name || student.resume_file_name) {
        const path = resumeAPI.getPublicSingleDownloadUrl(token, student.id);
        if (path.startsWith('http')) {
          resumeLink = path;
        } else {
          resumeLink = `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
        }
      }

      if (resumeLink) {
        ws[cellAddress] = {
          v: student.name,
          t: 's',
          l: { Target: resumeLink, Tooltip: "Click to open resume" }
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; i++) {
      view[i] = wbout.charCodeAt(i) & 0xFF;
    }

    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // Action: Export Excel locally
  const handleLocalExcelExport = () => {
    const blob = generateExcelBlob();
    if (!blob) return;

    const fileName = collection.company_name
      ? `${collection.company_name.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}_Candidates_Report.xlsx`
      : 'Candidates_Placement_Report.xlsx';

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  // Google OAuth flow initiation
  const handleGoogleAuthenticate = async () => {
    setErrorMessage('');
    setUploadStatus('authenticating');
    setStatusMessage('Connecting with Google accounts...');
    
    try {
      const token = await googleOAuthService.getAccessToken();
      setGoogleToken(token);
      setUploadStatus('idle');
      setStatusMessage('');
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      
      if (err.message?.includes('popup_closed_by_user') || err.message?.includes('access_denied')) {
        setErrorMessage('Google Authentication was cancelled by the user.');
      } else {
        setErrorMessage(err.message || 'Failed to authenticate with Google account.');
      }
    }
  };

  // Launch Google Folder Picker
  const handleBrowseFolders = async () => {
    if (!googleToken) return;
    try {
      setErrorMessage('');
      const folder = await googleDriveService.showFolderPicker(googleToken);
      if (folder) {
        setSelectedFolder(folder);
      }
    } catch (err) {
      console.error(err);
      if (err.message?.includes('API_KEY')) {
        setErrorMessage('Google Picker failed: API key is invalid or not configured.');
      } else {
        setErrorMessage(err.message || 'Error opening Google Drive picker.');
      }
    }
  };

  // Upload Excel to Google Drive
  const handleUploadExcelToDrive = async () => {
    setErrorMessage('');
    setUploadStatus('preparing');
    setStatusMessage('Preparing candidate placement report...');

    try {
      // 1. Get Access Token
      let tokenToUse = googleToken;
      if (!tokenToUse) {
        setStatusMessage('Connecting Google Drive...');
        tokenToUse = await googleOAuthService.getAccessToken();
        setGoogleToken(tokenToUse);
      }

      // 2. Generate Excel Blob
      setStatusMessage('Compiling Excel spreadsheet details...');
      const excelBlob = generateExcelBlob();
      if (!excelBlob) {
        throw new Error('Could not compile candidate records. Check collection data.');
      }

      const fileName = collection.company_name
        ? `${collection.company_name.replace(/[^a-zA-Z0-9\s-]/g, '').trim()}_Candidates_Report.xlsx`
        : 'Candidates_Placement_Report.xlsx';

      // 3. Upload File via Backend Service
      setUploadStatus('uploading');
      setStatusMessage('Uploading spreadsheet to Google Drive...');
      
      const response = await googleDriveService.uploadExcel({
        fileBlob: excelBlob,
        fileName,
        accessToken: tokenToUse,
        folderId: selectedFolder?.id || null
      });

      setDriveFileId(response.fileId);
      setDriveLink(response.driveLink);
      setUploadStatus('success');
      setStatusMessage('Uploaded successfully!');
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      
      if (err.message?.includes('401') || err.message?.includes('token')) {
        setErrorMessage('Access token expired. Re-authenticate and try again.');
        googleOAuthService.clearStoredToken();
        setGoogleToken(null);
      } else {
        setErrorMessage(err.message || 'Upload to Google Drive failed.');
      }
    }
  };

  // Convert uploaded Excel to Google Sheets
  const handleConvertToGoogleSheet = async () => {
    if (!driveFileId || !googleToken) return;

    setErrorMessage('');
    setUploadStatus('converting');
    setStatusMessage('Converting spreadsheet to Google Sheet format...');

    try {
      const response = await googleSheetService.convertToGoogleSheet({
        fileId: driveFileId,
        accessToken: googleToken
      });

      setSheetId(response.sheetId);
      setSheetLink(response.sheetLink);
      setUploadStatus('success');
      setStatusMessage('Successfully converted to Google Sheet!');
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      setErrorMessage(err.message || 'Conversion to Google Sheet failed.');
    }
  };

  // Copy items to clipboard
  const handleCopyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Sharing links
  const publicCollectionUrl = window.location.href;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Here is the candidate list for ${collection?.title || 'Placement'}: ${publicCollectionUrl}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Candidate Resumes - ${collection?.title || 'Placement Hub'}`)}&body=${encodeURIComponent(`Dear Partner,\n\nPlease review the candidates list at: ${publicCollectionUrl}\n\nBest regards,\nPlacement Team`)}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <span style={styles.logo}>💼</span>
            <div>
              <h3 style={styles.title}>Placement Sharing Hub</h3>
              <p style={styles.subtitle}>{collection?.title} · {collection?.students?.length || 0} Candidates</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={styles.tabs}>
          <button 
            onClick={() => { setActiveTab('cloud'); setErrorMessage(''); }}
            style={{ ...styles.tab, ...(activeTab === 'cloud' ? styles.activeTab : {}) }}
          >
            ☁️ Cloud Storage
          </button>
          <button 
            onClick={() => { setActiveTab('local'); setErrorMessage(''); }}
            style={{ ...styles.tab, ...(activeTab === 'local' ? styles.activeTab : {}) }}
          >
            📊 Local Downloads
          </button>
          <button 
            onClick={() => { setActiveTab('share'); setErrorMessage(''); }}
            style={{ ...styles.tab, ...(activeTab === 'share' ? styles.activeTab : {}) }}
          >
            📱 Quick Share
          </button>
        </div>

        {/* Modal Body */}
        <div style={styles.body}>
          {errorMessage && (
            <div style={styles.errorAlert}>
              <span style={styles.errorIcon}>⚠️</span>
              <div style={styles.errorContent}>
                <strong>Operation Failed</strong>
                <p style={styles.errorText}>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: CLOUD INTEGRATIONS */}
          {activeTab === 'cloud' && (
            <div style={styles.cloudSection}>
              {uploadStatus === 'idle' && (
                <>
                  <p style={styles.sectionInfo}>
                    Directly export your placement records into Google Drive. You can organize files by selecting folders and optionally convert Excel reports into fully interactive Google Sheets.
                  </p>

                  <div style={styles.oauthBar}>
                    {googleToken ? (
                      <div style={styles.authSuccess}>
                        <span style={styles.badgeSuccess}>✓ Authenticated</span>
                        <span style={styles.authEmail}>Google Drive connected</span>
                        <button 
                          onClick={() => { googleOAuthService.clearStoredToken(); setGoogleToken(null); setSelectedFolder(null); }}
                          style={styles.disconnectBtn}
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div style={styles.authNeeded}>
                        <span>Google integration requires authorization.</span>
                        <button onClick={handleGoogleAuthenticate} style={styles.authBtn}>
                          🔑 Connect Google Account
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={styles.folderSelectorCard}>
                    <div style={styles.folderInfo}>
                      <span style={styles.folderIcon}>📂</span>
                      <div>
                        <strong style={styles.folderTitle}>Target Folder Destination</strong>
                        <p style={styles.folderPath}>
                          {selectedFolder ? `Google Drive / ${selectedFolder.name}` : 'My Drive (Root Folder)'}
                        </p>
                      </div>
                    </div>
                    {googleToken && (
                      <button onClick={handleBrowseFolders} style={styles.browseBtn}>
                        Browse Folders
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={handleUploadExcelToDrive} 
                    style={styles.primaryActionBtn}
                  >
                    ☁️ Upload to Google Drive
                  </button>
                </>
              )}

              {/* Upload Progress Loader States */}
              {['authenticating', 'preparing', 'uploading', 'converting'].includes(uploadStatus) && (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <h4 style={styles.loadingTitle}>{statusMessage}</h4>
                  <p style={styles.loadingSubtitle}>Please do not close this window</p>
                  
                  {/* Status Steps Tracker */}
                  <div style={styles.stepsTracker}>
                    <div style={{ ...styles.step, ...(uploadStatus === 'authenticating' ? styles.stepActive : googleToken ? styles.stepDone : {}) }}>
                      1. Authenticate Account
                    </div>
                    <div style={{ ...styles.step, ...(uploadStatus === 'preparing' ? styles.stepActive : ['uploading', 'converting', 'success'].includes(uploadStatus) ? styles.stepDone : {}) }}>
                      2. Compile Excel Document
                    </div>
                    <div style={{ ...styles.step, ...(uploadStatus === 'uploading' ? styles.stepActive : ['converting', 'success'].includes(uploadStatus) ? styles.stepDone : {}) }}>
                      3. Google Drive Upload
                    </div>
                    {uploadStatus === 'converting' && (
                      <div style={{ ...styles.step, ...styles.stepActive }}>
                        4. Google Sheet Conversion
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUCCESS VIEW SCREEN */}
              {uploadStatus === 'success' && (
                <div style={styles.successContainer}>
                  <div style={styles.successCheck}>✓</div>
                  <h3 style={styles.successTitle}>Spreadsheet Uploaded Successfully!</h3>
                  <p style={styles.successSubtitle}>
                    Your candidate list has been processed and saved to your cloud directory.
                  </p>

                  <div style={styles.resultsGrid}>
                    <div style={styles.resultCard}>
                      <span style={styles.resultTypeIcon}>📊</span>
                      <div style={styles.resultDetails}>
                        <strong style={styles.resultTitle}>Microsoft Excel Report</strong>
                        <p style={styles.resultFileName}>{collection.company_name || 'Candidates'}_Report.xlsx</p>
                        <div style={styles.resultActions}>
                          <a href={driveLink} target="_blank" rel="noopener noreferrer" style={styles.resultBtnOpen}>
                            Open File
                          </a>
                          <button 
                            onClick={() => handleCopyToClipboard(driveLink, 'driveLink')}
                            style={styles.resultBtnCopy}
                          >
                            {copyFeedback.driveLink ? 'Copied! ✓' : 'Copy Link'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {sheetLink && (
                      <div style={styles.resultCard}>
                        <span style={styles.resultTypeIcon}>📄</span>
                        <div style={styles.resultDetails}>
                          <strong style={styles.resultTitle}>Google Sheet Document</strong>
                          <p style={styles.resultFileName}>{collection.company_name || 'Candidates'}_Sheet</p>
                          <div style={styles.resultActions}>
                            <a href={sheetLink} target="_blank" rel="noopener noreferrer" style={styles.resultBtnOpenSheets}>
                              Open Google Sheets
                            </a>
                            <button 
                              onClick={() => handleCopyToClipboard(sheetLink, 'sheetLink')}
                              style={styles.resultBtnCopy}
                            >
                              {copyFeedback.sheetLink ? 'Copied! ✓' : 'Copy Link'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.successActions}>
                    {!sheetLink && (
                      <button onClick={handleConvertToGoogleSheet} style={styles.sheetConvertBtn}>
                        📄 Convert to Google Sheet
                      </button>
                    )}
                    <button 
                      onClick={() => { setUploadStatus('idle'); setDriveFileId(null); setSheetLink(''); }} 
                      style={styles.resetBtn}
                    >
                      ← Upload Another Copy
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR VIEW RECOVERY SCREEN */}
              {uploadStatus === 'error' && (
                <div style={styles.errorContainer}>
                  <div style={styles.errorCross}>✕</div>
                  <h4 style={styles.errorTitle}>Upload Unsuccessful</h4>
                  <p style={styles.errorSubtitle}>
                    We encountered an obstacle while exporting candidate data.
                  </p>
                  <div style={styles.errorActions}>
                    <button onClick={handleUploadExcelToDrive} style={styles.retryBtn}>
                      🔄 Retry Upload
                    </button>
                    <button onClick={() => { setUploadStatus('idle'); setErrorMessage(''); }} style={styles.backBtn}>
                      Back to Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCAL DOWNLOADS */}
          {activeTab === 'local' && (
            <div style={styles.localSection}>
              <p style={styles.sectionInfo}>
                Download candidates data spreadsheets and resume files directly onto your machine's hard drive.
              </p>

              <div style={styles.downloadGrid}>
                <div onClick={handleLocalExcelExport} style={styles.downloadCard}>
                  <div style={styles.downloadIconArea}>📊</div>
                  <div style={styles.downloadContent}>
                    <strong style={styles.downloadTitle}>Export Excel spreadsheet</strong>
                    <p style={styles.downloadDesc}>Contains columns, candidate statuses, and resume hyperlinks.</p>
                  </div>
                </div>

                <div onClick={onDownloadZIP} style={styles.downloadCard}>
                  <div style={styles.downloadIconArea}>📦</div>
                  <div style={styles.downloadContent}>
                    <strong style={styles.downloadTitle}>Download ZIP Archive</strong>
                    <p style={styles.downloadDesc}>Packages all candidates' PDF resumes into a single ZIP file.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMUNICATIONS */}
          {activeTab === 'share' && (
            <div style={styles.shareSection}>
              <p style={styles.sectionInfo}>
                Distribute this candidate collection link to external evaluators or recruiters.
              </p>

              <div style={styles.linkShareCard}>
                <div style={styles.linkDisplay}>
                  <span style={styles.linkText}>{publicCollectionUrl}</span>
                </div>
                <button 
                  onClick={() => handleCopyToClipboard(publicCollectionUrl, 'collectionUrl')}
                  style={styles.copyLinkBtn}
                >
                  {copyFeedback.collectionUrl ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              <div style={styles.sharingOptionsGrid}>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={styles.whatsappCard}>
                  <span style={styles.shareIcon}>📱</span>
                  <strong style={styles.shareTitle}>Share via WhatsApp</strong>
                </a>

                <a href={emailUrl} style={styles.emailCard}>
                  <span style={styles.shareIcon}>📧</span>
                  <strong style={styles.shareTitle}>Share via Email</strong>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    fontFamily: '"Inter", system-ui, sans-serif'
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '580px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa'
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logo: {
    fontSize: '28px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '13px',
    color: '#64748b'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9',
      color: '#0f172a'
    }
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    padding: '0 12px'
  },
  tab: {
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#4f46e5',
    borderBottomColor: '#4f46e5'
  },
  body: {
    padding: '24px',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  errorIcon: {
    fontSize: '20px',
    color: '#ef4444'
  },
  errorContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '13px',
    color: '#991b1b'
  },
  errorText: {
    margin: 0,
    fontSize: '12px',
    color: '#b91c1c'
  },
  sectionInfo: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#475569'
  },
  cloudSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  oauthBar: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc'
  },
  authSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'space-between',
    fontSize: '13px'
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    textTransform: 'uppercase'
  },
  authEmail: {
    color: '#334155',
    fontWeight: '500',
    flex: 1,
    paddingLeft: '6px'
  },
  disconnectBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  authNeeded: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap',
    gap: '10px'
  },
  authBtn: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#1e293b'
    }
  },
  folderSelectorCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff'
  },
  folderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  folderIcon: {
    fontSize: '24px'
  },
  folderTitle: {
    display: 'block',
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: '600'
  },
  folderPath: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#64748b'
  },
  browseBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f8fafc',
      borderColor: '#94a3b8'
    }
  },
  primaryActionBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
    ':hover': {
      backgroundColor: '#4338ca',
      boxShadow: '0 6px 8px -1px rgba(79, 70, 229, 0.3)'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 0',
    textAlign: 'center'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#0f172a',
    fontWeight: '600'
  },
  loadingSubtitle: {
    margin: '4px 0 24px 0',
    fontSize: '13px',
    color: '#64748b'
  },
  stepsTracker: {
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px'
  },
  step: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  stepActive: {
    color: '#4f46e5',
    fontWeight: '600'
  },
  stepDone: {
    color: '#10b981',
    fontWeight: '500'
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '10px 0'
  },
  successCheck: {
    width: '56px',
    height: '56px',
    backgroundColor: '#d1fae5',
    color: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
    border: '4px solid #f0fdf4'
  },
  successTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  successSubtitle: {
    margin: '6px 0 24px 0',
    fontSize: '13px',
    color: '#64748b',
    maxWidth: '380px'
  },
  resultsGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
  },
  resultCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    textAlign: 'left',
    backgroundColor: '#f8fafc'
  },
  resultTypeIcon: {
    fontSize: '24px',
    backgroundColor: '#ffffff',
    padding: '8px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  resultDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  resultTitle: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  resultFileName: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b'
  },
  resultActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px'
  },
  resultBtnOpen: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    textDecoration: 'none',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9',
      color: '#0f172a'
    }
  },
  resultBtnOpenSheets: {
    backgroundColor: '#10b981',
    border: '1px solid #059669',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
    textDecoration: 'none',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#059669'
    }
  },
  resultBtnCopy: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 8px',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  successActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%'
  },
  sheetConvertBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    ':hover': {
      backgroundColor: '#059669'
    }
  },
  resetBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px',
    ':hover': {
      color: '#0f172a',
      textDecoration: 'underline'
    }
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '20px 0'
  },
  errorCross: {
    width: '56px',
    height: '56px',
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '16px',
    border: '4px solid #fef2f2'
  },
  retryBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#4338ca'
    }
  },
  backBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px',
    ':hover': {
      color: '#0f172a',
      textDecoration: 'underline'
    }
  },
  localSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  downloadGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr'
    }
  },
  downloadCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff',
    ':hover': {
      borderColor: '#4f46e5',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
    }
  },
  downloadIconArea: {
    fontSize: '36px',
    marginBottom: '12px'
  },
  downloadContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  downloadTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a'
  },
  downloadDesc: {
    margin: 0,
    fontSize: '11px',
    color: '#64748b',
    lineHeight: '1.4'
  },
  shareSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  linkShareCard: {
    display: 'flex',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  linkDisplay: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center'
  },
  linkText: {
    fontSize: '13px',
    color: '#334155',
    fontFamily: 'monospace'
  },
  copyLinkBtn: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    padding: '0 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    ':hover': {
      backgroundColor: '#1e293b'
    }
  },
  sharingOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  whatsappCard: {
    border: '1px solid #d1fae5',
    backgroundColor: '#f0fdf4',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: '#065f46',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#d1fae5',
      transform: 'translateY(-1px)'
    }
  },
  emailCard: {
    border: '1px solid #e0f2fe',
    backgroundColor: '#f0f9ff',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    textDecoration: 'none',
    color: '#0369a1',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#e0f2fe',
      transform: 'translateY(-1px)'
    }
  },
  shareIcon: {
    fontSize: '20px'
  },
  shareTitle: {
    fontSize: '13px',
    fontWeight: '600'
  }
};

export default PlacementShareHubModal;
