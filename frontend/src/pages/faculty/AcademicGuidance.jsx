import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, ExternalLink, MessageCircle, FileText, ChevronDown, Send, Search, Users } from 'lucide-react';
import facultyAPI from '../../services/facultyAPI';

const AcademicGuidance = () => {
  const [batches, setBatches] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState({ batch_id: '', title: '', content: '', reference_links: [] });
  const [currentLink, setCurrentLink] = useState({ title: '', url: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, notesRes] = await Promise.all([facultyAPI.getMyBatches(), facultyAPI.getMyNotes()]);
      setBatches(batchesRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch guidance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (currentLink.title && currentLink.url) {
      setNewNote({ ...newNote, reference_links: [...newNote.reference_links, currentLink] });
      setCurrentLink({ title: '', url: '' });
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      if (!newNote.batch_id || !newNote.title || !newNote.content) return;
      await facultyAPI.addNote(newNote);
      setShowAddModal(false);
      setNewNote({ batch_id: '', title: '', content: '', reference_links: [] });
      fetchData();
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm('Delete this guidance note?')) {
      try { await facultyAPI.deleteNote(id); fetchData(); }
      catch (err) { console.error('Delete failed:', err); }
    }
  };

  if (loading) return <div className="loader-container"><div className="spinner"></div></div>;

  const filteredNotes = notes.filter(n =>
    !searchTerm ||
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.batch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseLinks = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

  return (
    <div className="academic-guidance-page fade-in">
      {/* Header */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>Academic Guidance</h1>
            <p style={{ color: '#64748b' }}>Distribute knowledge and instructions across your assigned batches.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Create New Guidance
          </button>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '3rem' }}>
        <div className="guidance-layout">
          
          {/* Sidebar */}
          <aside>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-header-simple">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', margin: 0 }}><BookOpen size={18} /> Your Batches</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {batches.map(batch => (
                  <div key={batch.id} className="batch-sidebar-item">
                    <strong>{batch.name}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
                      <span className="badge badge-primary"><Users size={10} /> {batch.student_count || 0} Students</span>
                      {batch.coordinator_name && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>• {batch.coordinator_name}</span>}
                    </div>
                  </div>
                ))}
                {batches.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem' }}>No batches assigned yet.</p>}
              </div>
            </div>
          </aside>

          {/* Notes Feed */}
          <div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} size={18} />
              <input
                type="text"
                placeholder="Filter by title or batch..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.875rem', outline: 'none', background: 'white' }}
              />
            </div>

            {filteredNotes.map(note => (
              <div key={note.id} className="card note-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>{note.batch_name}</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{note.title}</h3>
                  </div>
                  <button className="delete-btn" onClick={() => handleDeleteNote(note.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{note.content}</div>

                {parseLinks(note.reference_links).length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Reference Materials</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {parseLinks(note.reference_links).map((link, idx) => (
                        <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="ref-link">
                          <ExternalLink size={12} /> {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Posted {new Date(note.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MessageCircle size={12} /> Read by Students
                  </span>
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
                <FileText size={48} style={{ color: '#e2e8f0', margin: '0 auto 1rem' }} />
                <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>No Guidance Notes Yet</h3>
                <p style={{ color: '#64748b' }}>Start by creating your first guidance note for a batch.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0f172a', margin: 0 }}>Broadcasting Knowledge</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#94a3b8', padding: '0.25rem' }}>✕</button>
            </div>
            <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Target Batch</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      required
                      value={newNote.batch_id}
                      onChange={e => setNewNote({ ...newNote, batch_id: e.target.value })}
                      className="form-control"
                      style={{ appearance: 'none' }}
                    >
                      <option value="">Select Batch</option>
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Note Title</label>
                  <input required type="text" className="form-control" placeholder="e.g. System Design Principles"
                    value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Content</label>
                <textarea required rows={5} className="form-control"
                  placeholder="Provide detailed instructions or academic notes..."
                  value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Reference Links (Optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input type="text" placeholder="Title" className="form-control" style={{ flex: '0 0 30%' }}
                    value={currentLink.title} onChange={e => setCurrentLink({ ...currentLink, title: e.target.value })} />
                  <input type="text" placeholder="URL (https://...)" className="form-control"
                    value={currentLink.url} onChange={e => setCurrentLink({ ...currentLink, url: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={handleAddLink} style={{ flexShrink: 0 }}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {newNote.reference_links.map((link, idx) => (
                    <span key={idx} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      {link.title}
                      <Trash2 size={12} style={{ cursor: 'pointer' }} onClick={() =>
                        setNewNote({ ...newNote, reference_links: newNote.reference_links.filter((_, i) => i !== idx) })} />
                    </span>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.875rem' }}>
                <Send size={18} /> Broadcast to Students
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .academic-guidance-page { min-height: 100vh; background: #f8fafc; }
        .page-header { position: relative; background: #fff; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
        .header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%); }
        .guidance-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }
        .card-header-simple { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
        .batch-sidebar-item { padding: 0.75rem; background: #f8fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-bottom: 0.5rem; font-size: 0.875rem; color: #1e293b; font-weight: 600; }
        .note-card { margin-bottom: 1.5rem; }
        .delete-btn { background: none; border: none; cursor: pointer; color: #cbd5e1; padding: 0.4rem; border-radius: 0.5rem; transition: all 0.2s; }
        .delete-btn:hover { color: #ef4444; background: #fef2f2; }
        .ref-link { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #475569; text-decoration: none; transition: all 0.2s; }
        .ref-link:hover { background: #eef2ff; border-color: #c7d2fe; color: #4f46e5; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .modal-box { background: white; border-radius: 1.25rem; width: 100%; max-width: 680px; padding: 2rem; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 900px) { .guidance-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default AcademicGuidance;
