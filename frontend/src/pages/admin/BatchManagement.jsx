import React, { useState, useEffect } from 'react';
import { adminAPI, userAPI } from '../../services/api';
import { Plus, Users, Layers, Calendar, ChevronRight, Search, Layout, Clock, Trash2, UserPlus, UserCheck, X } from 'lucide-react';
import Button from '../../components/common/Button';

const BatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchClassLink, setNewBatchClassLink] = useState('');
  const [selectedStudentIdsForCreate, setSelectedStudentIdsForCreate] = useState([]);
  const [showStudentPickerInCreate, setShowStudentPickerInCreate] = useState(false);
  const [batchLinks, setBatchLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Manage Batch Students Modal State
  const [managingBatch, setManagingBatch] = useState(null);
  const [selectedToAddInModal, setSelectedToAddInModal] = useState([]);
  const [modalActionLoading, setModalActionLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await userAPI.getAllStudents();
      setStudents(response.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBatches();
      setBatches(response.data);
      setBatchLinks(response.data.reduce((links, batch) => ({ ...links, [batch.id]: batch.class_link || '' }), {}));
    } catch (err) {
      setError('Failed to load batches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    try {
      await adminAPI.createBatch(newBatchName, newBatchClassLink, null, selectedStudentIdsForCreate);
      setSuccess(`Batch '${newBatchName}' created successfully with ${selectedStudentIdsForCreate.length} student(s)!`);
      setNewBatchName('');
      setNewBatchClassLink('');
      setSelectedStudentIdsForCreate([]);
      setShowStudentPickerInCreate(false);
      fetchBatches();
      fetchStudents();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create batch');
      console.error(err);
    }
  };

  const handleDeleteBatch = async (batchId, batchName) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batchName}"? Students in this batch will be set to Unassigned.`)) {
      return;
    }

    try {
      await adminAPI.deleteBatch(batchId);
      setSuccess(`Batch '${batchName}' deleted successfully.`);
      fetchBatches();
      fetchStudents();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete batch');
      console.error(err);
    }
  };

  const handleSaveClassLink = async (batchId) => {
    try {
      await adminAPI.updateBatchClassLink(batchId, batchLinks[batchId] || '');
      setSuccess('Class link updated successfully!');
      fetchBatches();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update class link');
      console.error(err);
    }
  };

  // Add students to currently managing batch
  const handleAddStudentsToCurrentBatch = async () => {
    if (!managingBatch || selectedToAddInModal.length === 0) return;
    setModalActionLoading(true);
    try {
      await adminAPI.bulkAssignBatch(selectedToAddInModal, managingBatch.id);
      setSuccess(`Added ${selectedToAddInModal.length} student(s) to ${managingBatch.name}`);
      setSelectedToAddInModal([]);
      await fetchBatches();
      await fetchStudents();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add students to batch');
    } finally {
      setModalActionLoading(false);
    }
  };

  // Remove a student from managing batch
  const handleRemoveStudentFromBatch = async (studentId) => {
    setModalActionLoading(true);
    try {
      await adminAPI.bulkAssignBatch([studentId], null); // Unassign
      await fetchBatches();
      await fetchStudents();
    } catch (err) {
      console.error('Remove student error:', err);
    } finally {
      setModalActionLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch => 
    batch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="batch-management-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Batch Management</h1>
              <p>Orchestrate institutional learning cycles and monitor sub-batch hierarchies.</p>
            </div>
            <div className="header-actions">
              <div className="search-wrapper">
                <Search className="search-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Search batches..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {/* Create Batch Card */}
        <section className="create-section slide-up">
          <div className="card create-card">
            <div className="card-header-simple">
              <div className="icon-badge primary">
                <Plus size={20} />
              </div>
              <div>
                <h3>Initialize New Batch</h3>
                <p className="text-muted text-sm">Create a master batch to start organizing sub-groups.</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateBatch} className="create-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="e.g., Full Stack Development - Summer 2024"
                  className="form-control"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  required
                />
                <input
                  type="url"
                  placeholder="Google Meet / online class link (optional)"
                  className="form-control mt-2"
                  value={newBatchClassLink}
                  onChange={(e) => setNewBatchClassLink(e.target.value)}
                />
              </div>

              {/* Student picker toggle for batch creation */}
              <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowStudentPickerInCreate(!showStudentPickerInCreate)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={16} />
                  <span>
                    {showStudentPickerInCreate ? 'Hide Student Selector' : 'Assign Students to this New Batch'} ({selectedStudentIdsForCreate.length} selected)
                  </span>
                </button>

                {showStudentPickerInCreate && (
                  <div style={{
                    marginTop: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    background: '#ffffff',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Select candidates for this batch ({students.length} total students):
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIdsForCreate(students.map(s => s.id))}
                          style={{ fontSize: '11px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIdsForCreate([])}
                          style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                      {students.map((s) => {
                        const isChecked = selectedStudentIdsForCreate.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isChecked ? '#eef2ff' : '#f8fafc',
                              border: isChecked ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedStudentIdsForCreate(prev =>
                                  prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                );
                              }}
                            />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                              <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                                {s.batch ? `Current: ${s.batch}` : 'No batch'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="btn-primary">
                <Plus size={18} /> Create Master Batch
              </Button>
            </form>
            
            {success && <div className="alert-success slide-down">{success}</div>}
            {error && <div className="alert-error slide-down">{error}</div>}
          </div>
        </section>

        {/* Batches Grid */}
        <section className="batches-section">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">Active Batches ({filteredBatches.length})</h2>
          </div>

          {loading ? (
            <div className="loader-container">
              <div className="spinner"></div>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="empty-state-card card">
              <div className="empty-icon-wrapper">
                <Layers className="empty-icon" />
              </div>
              <h3>No Batches Found</h3>
              <p>No batches match your search or none have been created yet.</p>
              <Button className="btn-secondary" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="batches-grid">
              {filteredBatches.map((batch) => (
                <div key={batch.id} className="batch-card card fade-in">
                  <div className="batch-card-header">
                    <div className="batch-info">
                      <h3>{batch.name}</h3>
                      <div className="batch-meta">
                        <span className="meta-item">
                          <Users size={14} /> <strong>{batch.student_count || 0}</strong> Students
                        </span>
                        <span className="meta-item">
                          <Clock size={14} /> {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                        <span className="meta-item">
                          <Layout size={14} /> {batch.subBatches?.length || 0} Sub-batches
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBatch(batch.id, batch.name)}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete Batch"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="sub-batches-preview">
                    <div className="class-link-editor">
                      <h4 className="preview-label">Online Class Link</h4>
                      <div className="class-link-row">
                        <input
                          className="form-control"
                          placeholder="Paste Google Meet link"
                          value={batchLinks[batch.id] || ''}
                          onChange={(e) => setBatchLinks({ ...batchLinks, [batch.id]: e.target.value })}
                        />
                        <Button className="btn-secondary btn-sm" onClick={() => handleSaveClassLink(batch.id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-action-bar" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => setManagingBatch(batch)}
                      style={{
                        flex: 1,
                        background: '#eef2ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <UserCheck size={16} />
                      <span>Manage Students ({batch.student_count || 0})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Manage Batch Students Modal */}
        {managingBatch && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Manage Students in {managingBatch.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    Enroll or remove students assigned to this batch
                  </p>
                </div>
                <button
                  onClick={() => { setManagingBatch(null); setSelectedToAddInModal([]); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {/* 1. Add unassigned students section */}
                <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    ➕ Add More Students to this Batch
                  </h4>
                  {students.filter(s => s.batch !== managingBatch.name).length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b' }}>All students are already in this batch.</p>
                  ) : (
                    <>
                      <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                        {students.filter(s => s.batch !== managingBatch.name).map(s => {
                          const isChecked = selectedToAddInModal.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: isChecked ? '#eef2ff' : '#ffffff',
                                border: isChecked ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedToAddInModal(prev =>
                                    prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                  );
                                }}
                              />
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.name}</span>
                              <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>
                                {s.batch ? `(${s.batch})` : '(No Batch)'}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleAddStudentsToCurrentBatch}
                        disabled={selectedToAddInModal.length === 0 || modalActionLoading}
                        style={{
                          background: selectedToAddInModal.length > 0 ? '#4f46e5' : '#cbd5e1',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: selectedToAddInModal.length > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {modalActionLoading ? 'Adding...' : `Add Selected (${selectedToAddInModal.length})`}
                      </button>
                    </>
                  )}
                </div>

                {/* 2. Currently enrolled students */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    👤 Currently Enrolled Students ({students.filter(s => s.batch === managingBatch.name).length})
                  </h4>
                  {students.filter(s => s.batch === managingBatch.name).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                      No students are currently enrolled in this batch.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {students.filter(s => s.batch === managingBatch.name).map(s => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{s.name}</span>
                            <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '8px' }}>{s.email}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveStudentFromBatch(s.id)}
                            disabled={modalActionLoading}
                            style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="outline" onClick={() => { setManagingBatch(null); setSelectedToAddInModal([]); }}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .batch-management-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 3rem 0;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
          z-index: 0;
        }

        .header-container {
          position: relative;
          z-index: 1;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .welcome-text h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }

        .welcome-text p {
          color: #64748b;
          font-size: 1.1rem;
        }

        .search-wrapper {
          position: relative;
          width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          background: white;
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .main-content {
          padding-bottom: 5rem;
        }

        .create-section {
          margin-bottom: 3rem;
        }

        .create-card {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .card-header-simple {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-badge.primary {
          background: #eef2ff;
          color: #4f46e5;
        }

        .card-header-simple h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .create-form {
          display: flex;
          gap: 1rem;
        }

        .input-group {
          flex: 1;
        }

        .mt-2 {
          margin-top: 0.5rem;
        }

        .alert-success {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #dcfce7;
          color: #166534;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .alert-error {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .batches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .batch-card {
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }

        .batch-card-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #ffffff;
        }

        .batch-info h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .batch-meta {
          display: flex;
          gap: 1rem;
          color: #64748b;
          font-size: 0.8rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .batch-icon-primary {
          width: 44px;
          height: 44px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sub-batches-preview {
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          flex: 1;
        }

        .class-link-editor {
          margin-bottom: 1.25rem;
        }

        .class-link-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.75rem;
          align-items: center;
        }

        .preview-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .sub-batch-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sub-batch-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.875rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }

        .sb-dot {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
        }

        .sb-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          flex: 1;
        }

        .sb-arrow {
          color: #cbd5e1;
        }

        .empty-sub-batches {
          padding: 1rem 0;
          text-align: center;
          color: #94a3b8;
          font-size: 0.875rem;
          font-style: italic;
        }

        .card-action-bar {
          padding: 1rem 1.5rem;
        }

        .empty-state-card {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: white;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-wrapper {
            width: 100%;
          }
          .create-form {
            flex-direction: column;
          }
          .batches-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default BatchManagement;
