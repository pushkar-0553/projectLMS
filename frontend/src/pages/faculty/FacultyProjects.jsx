import React, { useState, useEffect } from 'react';
import { Target, Search, FolderOpen, Clock, Activity, MoreVertical, Edit, ExternalLink, Plus, X, List, Layers, Tag, User } from 'lucide-react';
import platformAPI from '../../services/platformAPI';

const FacultyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({
    title: '', description: '', category: '', difficulty_level: 'beginner', estimated_hours: '', tags: ''
  });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getProjects();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProject,
        tags: newProject.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };
      await platformAPI.createProject(payload);
      setShowAddModal(false);
      setNewProject({ title: '', description: '', category: '', difficulty_level: 'beginner', estimated_hours: '', tags: '' });
      fetchProjects();
    } catch (err) {
      console.error('Failed to upload project:', err);
    }
  };

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  const filtered = projects.filter(p =>
    !searchTerm || p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const diffBadge = (level) => {
    if (level === 'beginner') return 'badge-success';
    if (level === 'intermediate') return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <div className="faculty-projects-page fade-in">
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}><Target size={14} /> Project Architecture</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>Projects Management</h1>
            <p style={{ color: '#64748b' }}>Manage and review active learning project assignments.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={18} />
              <input
                type="text" placeholder="Search projects..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', outline: 'none', fontSize: '0.875rem', background: 'white', width: '260px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Upload Project
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '3rem' }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <FolderOpen size={48} style={{ color: '#e2e8f0', margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>No Projects Found</h3>
            <p style={{ color: '#64748b' }}>No projects match your search criteria.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {filtered.map(project => (
              <div key={project.id} className="card project-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="project-icon-box"><FolderOpen size={22} /></div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${diffBadge(project.difficulty_level)}`}>{project.difficulty_level}</span>
                  </div>
                </div>

                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.5rem' }}>{project.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={11} /> Duration
                    </p>
                    <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{project.estimated_hours}h</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Activity size={11} /> Category
                    </p>
                    <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem', textTransform: 'capitalize' }}>{project.category}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => setSelectedProject(project)}
                  >
                    View <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0f172a', margin: 0 }}>Upload New Project</h2>
              <button onClick={() => setShowAddModal(false)} className="close-modal">✕</button>
            </div>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Project Title</label>
                <input required type="text" className="form-control" placeholder="e.g. Chat Application with Socket.io"
                  value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category</label>
                  <input required type="text" className="form-control" placeholder="e.g. Full Stack"
                    value={newProject.category} onChange={e => setNewProject({...newProject, category: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Estimated Hours</label>
                  <input required type="number" className="form-control" placeholder="e.g. 40"
                    value={newProject.estimated_hours} onChange={e => setNewProject({...newProject, estimated_hours: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select className="form-control" value={newProject.difficulty_level}
                    onChange={e => setNewProject({...newProject, difficulty_level: e.target.value})}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input type="text" className="form-control" placeholder="React, Node.js, SQL"
                    value={newProject.tags} onChange={e => setNewProject({...newProject, tags: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required rows={4} className="form-control" placeholder="Explain the project objective and requirements..."
                  value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center' }}>
                <Plus size={18} /> Publish Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedProject && (
        <div className="modal-overlay">
          <div className="modal-box project-detail-modal">
            <div className="detail-header">
              <div className="detail-icon"><FolderOpen size={32} /></div>
              <div className="detail-title">
                <span className={`badge ${diffBadge(selectedProject.difficulty_level)}`}>{selectedProject.difficulty_level}</span>
                <h2>{selectedProject.title}</h2>
              </div>
              <button onClick={() => setSelectedProject(null)} className="close-details">✕</button>
            </div>
            
            <div className="detail-body">
              <div className="detail-section">
                <h3><List size={18} /> Description</h3>
                <p>{selectedProject.description}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <Layers size={18} />
                  <div>
                    <strong>Category</strong>
                    <span>{selectedProject.category}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <Clock size={11} />
                  <div>
                    <strong>Estimated Duration</strong>
                    <span>{selectedProject.estimated_hours} Hours</span>
                  </div>
                </div>
                <div className="detail-item">
                  <User size={18} />
                  <div>
                    <strong>Created By</strong>
                    <span>{selectedProject.created_by_name || 'System Administrator'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <Tag size={18} />
                  <div>
                    <strong>Tags</strong>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      {JSON.parse(selectedProject.tags || '[]').map((tag, i) => (
                        <span key={i} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .faculty-projects-page { min-height: 100vh; background: #f8fafc; }
        .page-header { position: relative; background: #fff; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79,70,229,0.05) 0%, rgba(99,102,241,0.05) 100%); }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .project-card { display: flex; flex-direction: column; }
        .project-icon-box { width: 48px; height: 48px; background: #eef2ff; color: #4f46e5; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .project-card:hover .project-icon-box { background: #4f46e5; color: white; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .modal-box { background: white; border-radius: 1.5rem; width: 100%; max-width: 600px; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .close-modal { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
        
        .project-detail-modal { max-width: 800px; }
        .detail-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; position: relative; }
        .detail-icon { width: 80px; height: 80px; background: #eef2ff; color: #4f46e5; border-radius: 1.25rem; display: flex; align-items: center; justify-content: center; }
        .detail-title h2 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; }
        .close-details { position: absolute; right: 0; top: 0; background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%; color: #64748b; cursor: pointer; font-size: 1.2rem; }
        
        .detail-body { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; }
        .detail-section h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .detail-section p { color: #475569; lineHeight: 1.8; font-size: 1rem; }
        .detail-grid { display: flex; flex-direction: column; gap: 1.5rem; }
        .detail-item { display: flex; gap: 1rem; align-items: flex-start; }
        .detail-item svg { color: #4f46e5; flex-shrink: 0; margin-top: 0.2rem; }
        .detail-item strong { display: block; font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
        .detail-item span { font-size: 0.95rem; font-weight: 700; color: #1e293b; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 800px) { .detail-body { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default FacultyProjects;
