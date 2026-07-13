import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Plus, Users, Layers, Calendar, ChevronRight, Search, Layout, Clock } from 'lucide-react';
import Button from '../../components/common/Button';

const BatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchClassLink, setNewBatchClassLink] = useState('');
  const [batchLinks, setBatchLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

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
      await adminAPI.createBatch(newBatchName, newBatchClassLink);
      setSuccess('Batch created successfully!');
      setNewBatchName('');
      setNewBatchClassLink('');
      fetchBatches();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create batch');
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
                  placeholder="Google Meet / online class link"
                  className="form-control mt-2"
                  value={newBatchClassLink}
                  onChange={(e) => setNewBatchClassLink(e.target.value)}
                />
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
          <div className="section-header">
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
                          <Clock size={14} /> {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                        <span className="meta-item">
                          <Layout size={14} /> {batch.subBatches?.length || 0} Sub-batches
                        </span>
                      </div>
                    </div>
                    <div className="batch-icon-primary">
                      <Users size={22} />
                    </div>
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
                    <h4 className="preview-label">Sub-Batch Structure</h4>
                    {batch.subBatches && batch.subBatches.length > 0 ? (
                      <div className="sub-batch-list">
                        {batch.subBatches.slice(0, 3).map(sb => (
                          <div key={sb.id} className="sub-batch-item">
                            <span className="sb-dot"></span>
                            <span className="sb-name">{sb.name}</span>
                            <ChevronRight size={14} className="sb-arrow" />
                          </div>
                        ))}
                        {batch.subBatches.length > 3 && (
                          <div className="more-indicator text-xs text-muted">
                            + {batch.subBatches.length - 3} more sub-batches
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-sub-batches">
                        <p>No sub-batches initialized yet.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-action-bar">
                    <Button className="btn-glass btn-sm w-full">
                      View Hierarchy Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
