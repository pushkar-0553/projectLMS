import React, { useState, useEffect } from 'react';
import { coordinatorAPI, adminAPI, projectAPI } from '../../services/api';
import { Plus, Users, Layers, ChevronRight, UserPlus, Search, Info, Layout, Briefcase, GraduationCap } from 'lucide-react';
import Button from '../../components/common/Button';

const SubBatchManagement = () => {
  const [batches, setBatches] = useState([]);
  const [mySubBatches, setMySubBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddSubBatch, setShowAddSubBatch] = useState(false);
  const [newSubBatch, setNewSubBatch] = useState({ batchId: '', name: '' });
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignment, setAssignment] = useState({ userId: '', batchId: '', subBatchId: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const [projectsCount, setProjectsCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, subRes, studentsRes, projectsRes] = await Promise.all([
        adminAPI.getBatches(),
        coordinatorAPI.getMySubBatches(),
        adminAPI.getStudents(),
        projectAPI.getAll()
      ]);
      setBatches(batchesRes.data);
      setMySubBatches(subRes.data);
      setStudents(studentsRes.data);
      setProjectsCount(projectsRes.data.length);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubBatch = async (e) => {
    e.preventDefault();
    try {
      await coordinatorAPI.createSubBatch(newSubBatch);
      setShowAddSubBatch(false);
      setNewSubBatch({ batchId: '', name: '' });
      fetchData();
    } catch (err) {
      alert('Failed to create sub-batch');
    }
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    try {
      await coordinatorAPI.assignStudent(assignment);
      setShowAssignModal(false);
      setAssignment({ userId: '', batchId: '', subBatchId: '' });
      fetchData();
    } catch (err) {
      alert('Failed to assign student');
    }
  };

  return (
    <div className="sub-batch-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>Sub-Batch Workspace</h1>
              <p>Organize high-performance student groups and manage institutional hierarchies.</p>
            </div>
            <div className="header-actions">
              <Button 
                onClick={() => setShowAssignModal(true)}
                className="btn-glass"
              >
                <UserPlus size={18} />
                Assign Student
              </Button>
              <Button 
                onClick={() => setShowAddSubBatch(true)}
                className="btn-primary"
              >
                <Plus size={18} />
                New Sub-Batch
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <div className="workspace-layout">
          {/* Main Workspace */}
          <section className="batches-view slide-up">
            <div className="section-header-row">
              <h2 className="section-title">Institutional Groups</h2>
              <span className="count-badge primary">{mySubBatches.length} Batches Managed</span>
            </div>

            {loading ? (
               <div className="skeleton-grid">
                 {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton-card"></div>)}
               </div>
            ) : mySubBatches.length === 0 ? (
              <div className="empty-state-card card">
                <div className="empty-icon-wrapper">
                  <Layers size={48} />
                </div>
                <h3>No Sub-Batches Initialized</h3>
                <p>Initialize your first student group by clicking "New Sub-Batch" above.</p>
              </div>
            ) : (
              <div className="sub-batches-grid">
                {mySubBatches.map(sb => (
                  <div key={sb.id} className="sb-card card fade-in">
                    <div className="sb-card-header">
                      <div className="sb-icon-box">
                        <Layers size={22} />
                      </div>
                      <div className="sb-parent-tag">
                        <Layout size={12} />
                        {sb.batch_name}
                      </div>
                    </div>
                    
                    <div className="sb-card-body">
                      <h3>{sb.name}</h3>
                      <p className="sb-description">Standard institutional group for specialized technical training and mentorship.</p>
                      
                      <div className="sb-stats-mini">
                        <div className="mini-stat">
                          <Users size={14} />
                          <span>Active Students</span>
                        </div>
                      </div>
                    </div>

                    <div className="sb-card-footer">
                      <Button className="btn-secondary w-full btn-sm">
                        View Enrollment List <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lateral Controls */}
          <aside className="workspace-sidebar slide-up">
            <div className="sidebar-card card">
              <h3 className="card-heading">Platform Statistics</h3>
              <div className="stat-rows">
                <div className="stat-row blue">
                  <div className="row-label">
                    <Layers size={16} />
                    <span>My Groups</span>
                  </div>
                  <span className="row-value">{mySubBatches.length}</span>
                </div>
                <div className="stat-row indigo">
                  <div className="row-label">
                    <GraduationCap size={16} />
                    <span>Total Students</span>
                  </div>
                  <span className="row-value">{students.length}</span>
                </div>
                <div className="stat-row amber">
                  <div className="row-label">
                    <Briefcase size={16} />
                    <span>Active Projects</span>
                  </div>
                  <span className="row-value">{projectsCount}</span>
                </div>
              </div>
            </div>

            <div className="info-promo-card">
              <div className="promo-icon">
                <Info size={24} />
              </div>
              <h4>Orchestration Tip</h4>
              <p>Granular sub-batches allow for more focused reviews and personalized learning roadmaps for every student.</p>
            </div>
          </aside>
        </div>
      </main>

      {/* Create Sub-Batch Modal */}
      {showAddSubBatch && (
        <div className="modal-overlay fade-in">
          <div className="modal-content slide-up">
            <div className="modal-header">
              <div className="icon-box-primary">
                <Plus size={24} />
              </div>
              <div className="modal-labels">
                <h2>Initialize Sub-Group</h2>
                <p>Create a specialized segment under an institutional master batch.</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateSubBatch} className="modal-body-form">
              <div className="form-group">
                <label>Parent Institutional Batch</label>
                <select 
                  required
                  className="form-control"
                  value={newSubBatch.batchId}
                  onChange={(e) => setNewSubBatch({...newSubBatch, batchId: e.target.value})}
                >
                  <option value="">Choose Main Batch...</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label>Sub-Batch Designation</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g., React Alpha, Node.js Winter 2024"
                  className="form-control"
                  value={newSubBatch.name}
                  onChange={(e) => setNewSubBatch({...newSubBatch, name: e.target.value})}
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddSubBatch(false)} className="btn-cancel">Discard</button>
                <Button type="submit" className="btn-primary">Create Sub-Group</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content slide-up max-w-lg">
            <div className="modal-header">
              <div className="icon-box-success">
                <UserPlus size={24} />
              </div>
              <div className="modal-labels">
                <h2>Student Allocation</h2>
                <p>Map a student to their specific institutional hierarchy.</p>
              </div>
            </div>
            
            <form onSubmit={handleAssignStudent} className="modal-body-form">
              <div className="form-section">
                <label className="section-label">1. Identity Selection</label>
                <div className="search-box-modal">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by name or email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  required
                  className="form-control"
                  value={assignment.userId}
                  onChange={(e) => setAssignment({...assignment, userId: e.target.value})}
                >
                  <option value="">Select student target...</option>
                  {students
                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(s => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
                </select>
              </div>

              <div className="side-by-side">
                <div className="form-group">
                  <label>2. Master Batch</label>
                  <select 
                    required
                    className="form-control"
                    value={assignment.batchId}
                    onChange={(e) => setAssignment({...assignment, batchId: e.target.value, subBatchId: ''})}
                  >
                    <option value="">Choose Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>3. Sub-Batch Ref</label>
                  <select 
                    className="form-control"
                    value={assignment.subBatchId}
                    onChange={(e) => setAssignment({...assignment, subBatchId: e.target.value})}
                  >
                    <option value="">Institutional Default</option>
                    {mySubBatches
                      .filter(sb => sb.batch_id === parseInt(assignment.batchId))
                      .map(sb => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-cancel">Cancel</button>
                <Button type="submit" className="btn-primary">Confirm Allocation</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .sub-batch-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 3rem 0;
          margin-bottom: 2.5rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);
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

        .main-content {
          padding-bottom: 5rem;
        }

        .workspace-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 2rem;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e293b;
        }

        .sub-batches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .sb-card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          border-radius: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sb-card:hover {
          transform: translateY(-4px);
          border-color: #4f46e5;
          box-shadow: 0 12px 20px -8px rgba(79, 70, 229, 0.15);
        }

        .sb-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .sb-icon-box {
          width: 44px;
          height: 44px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sb-parent-tag {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          background: #f1f5f9;
          color: #475569;
          border-radius: 2rem;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sb-card-body h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .sb-description {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        .sb-stats-mini {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .mini-stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .workspace-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .stat-rows {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-radius: 0.875rem;
          font-weight: 600;
        }

        .stat-row.blue { background: #eff6ff; color: #1d4ed8; }
        .stat-row.indigo { background: #eef2ff; color: #4338ca; }
        .stat-row.amber { background: #fff7ed; color: #b45309; }

        .row-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .info-promo-card {
          background: linear-gradient(135deg, #4f46e5, #3730a3);
          padding: 1.75rem;
          border-radius: 1.25rem;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .promo-icon {
          margin-bottom: 1rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .info-promo-card h4 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .info-promo-card p {
          font-size: 0.875rem;
          line-height: 1.6;
          opacity: 0.9;
          margin: 0;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .modal-header {
          padding: 2rem;
          background: #fafaf9;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .icon-box-primary {
          width: 56px;
          height: 56px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-box-success {
          width: 56px;
          height: 56px;
          background: #ecfdf5;
          color: #10b981;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-labels h2 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .modal-labels p { font-size: 0.875rem; color: #64748b; margin: 0; }

        .modal-body-form { padding: 2rem; }
        
        .form-section { margin-bottom: 1.5rem; }
        .section-label { display: block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 1rem; }
        
        .search-box-modal {
          position: relative;
          margin-bottom: 0.75rem;
        }
        
        .search-box-modal input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
        }
        
        .search-box-modal svg {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .side-by-side {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .modal-footer {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .btn-cancel {
          background: transparent;
          border: none;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
        }

        @media (max-width: 1024px) {
          .workspace-layout { grid-template-columns: 1fr; }
          .workspace-sidebar { order: -1; }
        }

        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; }
          .side-by-side { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default SubBatchManagement;
