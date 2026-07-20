import React, { useState } from 'react';
import ResumeStatusBadge from './ResumeStatusBadge';
import { useAuth } from '../../context/AuthContext';

const ResumeTable = ({
  students = [],
  selectedStudentIds = [],
  onToggleSelectStudent,
  onSelectAllStudents,
  onViewResume,
  onDownloadResume,
  onShareResume,
  onSendWhatsApp,
  onManageNotes,
  onEditStudent
}) => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = students.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(students.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const isAllSelected = currentItems.length > 0 && currentItems.every(s => selectedStudentIds.includes(s.id));

  const handleSelectAllClick = () => {
    onSelectAllStudents(currentItems.map(s => s.id), !isAllSelected);
  };

  return (
    <div style={styles.card}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thCheck}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAllClick}
                  style={styles.checkbox}
                />
              </th>
              <th style={styles.th}>Student Name</th>
              <th style={styles.th}>Mobile Number</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Batch</th>
              <th style={styles.th}>Domain</th>
              <th style={styles.th}>Resume Status</th>
              <th style={styles.th}>Updated Date</th>
              <th style={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={styles.emptyCell}>
                  <div style={styles.emptyContainer}>
                    <span style={styles.emptyIcon}>📂</span>
                    <p style={styles.emptyText}>No students match the criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentItems.map((student) => {
                const noteCount = student.notes ? student.notes.length : 0;
                const isAllowedRole = !user || ['superadmin', 'super_admin', 'admin', 'coordinator'].includes(user.role);
                
                return (
                  <tr key={student.id} style={styles.tr}>
                    <td style={styles.tdCheck}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => onToggleSelectStudent(student.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.tdName}>
                      <div style={styles.nameBlock}>
                        <span style={styles.nameText}>{student.name}</span>
                        <button
                          onClick={() => onManageNotes(student)}
                          style={{
                            ...styles.notesBadge,
                            background: noteCount > 0 ? '#e0e7ff' : '#f1f5f9',
                            color: noteCount > 0 ? '#4338ca' : '#64748b'
                          }}
                          title="Manage private notes"
                        >
                          📝 {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>{student.mobile || '—'}</td>
                    <td style={styles.td}>{student.email}</td>
                    <td style={styles.td}>
                      <span style={styles.batchBadge}>
                        {student.batch_name || student.batch || 'Unassigned'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.domainBadge,
                        background: student.domain ? '#eff6ff' : '#f1f5f9',
                        color: student.domain ? '#1e40af' : '#475569',
                        border: student.domain ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                      }}>
                        {student.domain || 'Not Set'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <ResumeStatusBadge
                        hasResume={student.has_resume}
                        updatedAt={student.resume_updated_at}
                      />
                    </td>
                    <td style={styles.td}>
                      {student.resume_updated_at
                        ? new Date(student.resume_updated_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td style={styles.tdActions}>
                      <div style={styles.actionsGroup}>
                        {student.has_resume && (
                          <>
                            <button
                              onClick={() => onViewResume(student)}
                              style={styles.actionBtnView}
                              title="View Resume in New Tab"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => onDownloadResume(student)}
                              style={styles.actionBtnDownload}
                              title="Download Resume File"
                            >
                              📥 Download
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onEditStudent(student)}
                          style={styles.actionBtnEdit}
                          title="Edit Student Info & Resume"
                        >
                          ✏️ Edit
                        </button>
                        {isAllowedRole && (
                          <button
                            onClick={() => onSendWhatsApp(student)}
                            style={styles.actionBtnWhatsApp}
                            title="Send WhatsApp Message"
                          >
                            💬 WhatsApp
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={styles.pageBtn}
          >
            Previous
          </button>
          
          <div style={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                style={{
                  ...styles.pageNumBtn,
                  background: currentPage === pageNum ? '#4f46e5' : 'transparent',
                  color: currentPage === pageNum ? '#ffffff' : '#4f46e5',
                  border: currentPage === pageNum ? '1px solid #4f46e5' : '1px solid #e2e8f0'
                }}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    padding: '20px',
    overflow: 'hidden'
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '12px 10px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  thCheck: {
    padding: '12px 10px',
    borderBottom: '2px solid #f1f5f9',
    width: '40px'
  },
  thActions: {
    padding: '12px 10px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '2px solid #f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'right'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s',
  },
  td: {
    padding: '12px 10px',
    fontSize: '14px',
    color: '#334155'
  },
  tdCheck: {
    padding: '12px 10px',
    width: '40px'
  },
  tdName: {
    padding: '12px 10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a'
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-start'
  },
  nameText: {
    fontSize: '14px',
    fontWeight: '600'
  },
  notesBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    transition: 'opacity 0.2s'
  },
  batchBadge: {
    background: '#f8fafc',
    color: '#334155',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  domainBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    borderRadius: '4px'
  },
  tdActions: {
    padding: '12px 10px',
    textAlign: 'right'
  },
  actionsGroup: {
    display: 'inline-flex',
    gap: '8px',
    alignItems: 'center'
  },
  actionBtnView: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4f46e5',
    background: '#eef2ff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  actionLinkDrive: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0284c7',
    background: '#f0f9ff',
    border: 'none',
    borderRadius: '6px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'inline-block'
  },
  actionBtnDownload: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#16a34a',
    background: '#f0fdf4',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  actionBtnShare: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0284c7',
    background: '#f0f9ff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  actionBtnWhatsApp: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#128c7e',
    background: '#e8f5e9',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  actionBtnEdit: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#0f766e',
    background: '#ccfbf1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  noActions: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  emptyCell: {
    padding: '48px 0',
    textAlign: 'center'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  emptyIcon: {
    fontSize: '32px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #f1f5f9'
  },
  pageBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pageNumbers: {
    display: 'flex',
    gap: '6px'
  },
  pageNumBtn: {
    width: '32px',
    height: '32px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default ResumeTable;
