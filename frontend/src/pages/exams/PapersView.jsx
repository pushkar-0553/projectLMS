import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  FileText, Plus, Eye, Download, Copy, Calendar, 
  Trash2, Layers, CheckCircle2, Search, ArrowRight, X, ExternalLink
} from 'lucide-react';

export default function PapersView({ onAssignPaper, courseId }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Paper Builder Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    courseId: courseId || 1,
    durationMinutes: 60,
    instructions: '1. Answer all questions concisely.\n2. In written answers, justify with examples.\n3. A maximum of 3 security violations is permitted.',
    sections: [
      {
        title: 'Section A — Core Fundamentals',
        description: '',
        instructions: 'Answer all questions.',
        questions: [
          {
            questionOrder: 1,
            questionType: 'WRITTEN',
            difficulty: 'MEDIUM',
            marks: 10,
            questionText: 'Explain the difference between mutable and immutable objects in Python with code examples.',
            answerKey: 'Mutable objects can be modified in-place (lists, dicts). Immutable objects cannot be changed (int, str, tuple).',
            explanation: 'Full marks for clear explanation and memory reference rationale.'
          }
        ]
      }
    ]
  });

  useEffect(() => {
    loadPapers();
  }, [filterStatus, search, courseId]);

  const loadPapers = async () => {
    setLoading(true);
    try {
      const data = await api.papers.list({ status: filterStatus, search, courseId });
      setPapers(data);
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (versionId) => {
    try {
      const data = await api.papers.getVersion(versionId);
      setPreviewData(data);
      setPreviewVersionId(versionId);
    } catch (err) {
      alert(`Failed to load paper preview: ${err.message}`);
    }
  };

  const handleDuplicateVersion = async (paperId) => {
    const titlePrompt = prompt('Enter a title or note for this new version:', 'Version Update');
    if (!titlePrompt) return;

    try {
      const res = await api.papers.createNewVersion(paperId, { title: titlePrompt });
      alert(`Created New Version #${res.versionNumber} successfully! Historical examinations remain untouched.`);
      loadPapers();
    } catch (err) {
      alert(`Error creating version: ${err.message}`);
    }
  };

  // Section & Question Builder helpers
  const addSection = () => {
    const sLetter = String.fromCharCode(65 + formData.sections.length);
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: `Section ${sLetter} — New Topic`,
          description: '',
          instructions: '',
          questions: [
            {
              questionOrder: 1,
              questionType: 'WRITTEN',
              difficulty: 'MEDIUM',
              marks: 5,
              questionText: '',
              answerKey: '',
              explanation: ''
            }
          ]
        }
      ]
    }));
  };

  const removeSection = (sIdx) => {
    if (formData.sections.length === 1) return alert('At least 1 section is required.');
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== sIdx)
    }));
  };

  const addQuestion = (sIdx) => {
    setFormData(prev => {
      const updatedSecs = [...prev.sections];
      const qCount = updatedSecs[sIdx].questions.length;
      updatedSecs[sIdx].questions.push({
        questionOrder: qCount + 1,
        questionType: 'WRITTEN',
        difficulty: 'MEDIUM',
        marks: 5,
        questionText: '',
        answerKey: '',
        explanation: ''
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const removeQuestion = (sIdx, qIdx) => {
    setFormData(prev => {
      const updatedSecs = [...prev.sections];
      if (updatedSecs[sIdx].questions.length === 1) return prev;
      updatedSecs[sIdx].questions = updatedSecs[sIdx].questions.filter((_, idx) => idx !== qIdx);
      return { ...prev, sections: updatedSecs };
    });
  };

  const updateQuestion = (sIdx, qIdx, field, val) => {
    setFormData(prev => {
      const updatedSecs = [...prev.sections];
      updatedSecs[sIdx].questions[qIdx] = {
        ...updatedSecs[sIdx].questions[qIdx],
        [field]: val
      };
      return { ...prev, sections: updatedSecs };
    });
  };

  const handleSavePaper = async (e) => {
    e.preventDefault();
    try {
      const res = await api.papers.create(formData);
      // Auto publish Version 1 so it's ready for immediate batch assignment
      await api.papers.publishVersion(res.versionId);
      alert('Question paper created and published successfully!');
      setShowCreateModal(false);
      loadPapers();
    } catch (err) {
      alert(`Error creating paper: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers by title..."
              className="input"
              style={{ paddingLeft: '38px' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select"
            style={{ width: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ gap: '8px' }}>
          <Plus size={18} />
          Create Question Paper
        </button>
      </div>

      {/* Papers Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading question papers...</div>
        ) : papers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No question papers found. Click "Create Question Paper" to design your first assessment.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Paper Title</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Versions</th>
                  <th>Assignments</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Latest Version: v{p.latest_version || 1}
                      </div>
                    </td>
                    <td>{p.subject || 'General'}</td>
                    <td>{p.duration_minutes} Mins</td>
                    <td>{p.total_marks} Marks</td>
                    <td>
                      <span className="badge badge-primary">{p.version_count || 1} Versions</span>
                    </td>
                    <td>
                      <span className="badge badge-muted">{p.assignment_count || 0} Batches</span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'READY' ? 'badge-success' : 'badge-warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleOpenPreview(p.id)} 
                          className="btn btn-secondary btn-sm" 
                          title="Preview Document"
                        >
                          <Eye size={15} />
                          Preview
                        </button>

                        <button 
                          onClick={() => onAssignPaper && onAssignPaper(p)} 
                          className="btn btn-primary btn-sm"
                          title="Assign this paper to a student batch"
                        >
                          <Calendar size={15} />
                          Use Paper
                        </button>

                        <button 
                          onClick={() => handleDuplicateVersion(p.id)} 
                          className="btn btn-secondary btn-sm"
                          title="Duplicate / Create New Version"
                        >
                          <Copy size={15} />
                          v+1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PAPER MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Question Paper Builder</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-ghost btn-sm">&times;</button>
            </div>

            <form onSubmit={handleSavePaper} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Basic Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Paper Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Full Stack Python Assessment"
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Subject / Topic *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Python & Cloud Architecture"
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="360"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">General Instructions</label>
                    <textarea
                      value={formData.instructions}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                      className="textarea"
                      style={{ minHeight: '60px' }}
                    />
                  </div>
                </div>

                {/* Sections & Questions */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '16px' }}>Sections & Questions</h4>
                    <button type="button" onClick={addSection} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                      <Plus size={15} />
                      Add Section
                    </button>
                  </div>

                  {formData.sections.map((sec, sIdx) => (
                    <div key={sIdx} style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border-default)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => {
                              const s = [...prev.sections];
                              s[sIdx].title = val;
                              return { ...prev, sections: s };
                            });
                          }}
                          className="input"
                          style={{ fontWeight: 'bold', maxWidth: '350px' }}
                          required
                        />
                        <button type="button" onClick={() => removeSection(sIdx)} className="btn btn-danger btn-sm">
                          Remove Section
                        </button>
                      </div>

                      {/* Questions in Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginLeft: '12px' }}>
                        {sec.questions.map((q, qIdx) => (
                          <div key={qIdx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Question #{qIdx + 1}</span>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <select
                                  value={q.questionType}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'questionType', e.target.value)}
                                  className="select"
                                  style={{ padding: '4px 8px', fontSize: '12px', width: '130px' }}
                                >
                                  <option value="WRITTEN">Written Answer</option>
                                  <option value="SHORT_ANSWER">Short Answer</option>
                                  <option value="MCQ">Multiple Choice</option>
                                  <option value="CODE">Code Writing</option>
                                </select>

                                <input
                                  type="number"
                                  min="1"
                                  value={q.marks}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'marks', parseFloat(e.target.value))}
                                  placeholder="Marks"
                                  className="input"
                                  style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                                />

                                {sec.questions.length > 1 && (
                                  <button type="button" onClick={() => removeQuestion(sIdx, qIdx)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
                                    &times;
                                  </button>
                                )}
                              </div>
                            </div>

                            <textarea
                              value={q.questionText}
                              onChange={(e) => updateQuestion(sIdx, qIdx, 'questionText', e.target.value)}
                              placeholder="Enter question text here..."
                              className="textarea"
                              style={{ minHeight: '70px', marginBottom: '8px' }}
                              required
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={q.answerKey}
                                onChange={(e) => updateQuestion(sIdx, qIdx, 'answerKey', e.target.value)}
                                placeholder="Answer Key / Expected key points"
                                className="input"
                                style={{ fontSize: '13px' }}
                              />
                              <input
                                type="text"
                                value={q.explanation}
                                onChange={(e) => updateQuestion(sIdx, qIdx, 'explanation', e.target.value)}
                                placeholder="Grading criteria / Explanation for evaluator"
                                className="input"
                                style={{ fontSize: '13px' }}
                              />
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={() => addQuestion(sIdx)} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                          <Plus size={14} />
                          Add Question to this Section
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Publish Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPER PREVIEW MODAL */}
      {previewData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Paper Preview: {previewData.title}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={api.papers.getPdfDownloadUrl(previewData.id)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={14} /> PDF
                </a>
                <a 
                  href={api.papers.getDocxDownloadUrl(previewData.id)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={14} /> DOCX
                </a>
                <button onClick={() => setPreviewData(null)} className="btn btn-ghost btn-sm">&times;</button>
              </div>
            </div>

            <div className="modal-body" style={{ background: '#ffffff', color: '#111827', padding: '36px', borderRadius: 'var(--radius-sm)', fontFamily: 'serif' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '14px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', textTransform: 'uppercase', letterSpacing: '1px', color: '#111827' }}>
                  EXAMINATION & EVALUATION AUTHORITY
                </h2>
                <h3 style={{ fontSize: '16px', fontWeight: 'normal', margin: '4px 0', color: '#374151' }}>
                  {previewData.title} (Version {previewData.version_number})
                </h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>
                <span>Subject: {previewData.subject || 'General'}</span>
                <span>Total Marks: {previewData.total_marks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
                <span>Duration: {previewData.duration_minutes} Minutes</span>
                <span>Passing Marks: {Math.round(previewData.total_marks * 0.4)}</span>
              </div>

              {previewData.instructions && (
                <div style={{ fontStyle: 'italic', background: '#f9fafb', border: '1px dashed #9ca3af', padding: '12px', marginBottom: '24px', fontSize: '13px' }}>
                  <strong>Instructions:</strong><br />
                  {previewData.instructions}
                </div>
              )}

              {(previewData.sections || []).map((sec, sIdx) => (
                <div key={sec.id || sIdx} style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #4b5563', paddingBottom: '4px', marginBottom: '14px' }}>
                    {sec.title} {sec.total_marks ? `[${sec.total_marks} Marks]` : ''}
                  </div>

                  {(sec.questions || []).map((q, qIdx) => (
                    <div key={q.id || qIdx} style={{ marginBottom: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                        <span>Q{q.question_order || qIdx + 1}. [{q.question_type}]</span>
                        <span>[{q.marks} Marks]</span>
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {q.question_text}
                      </div>
                      {q.options && Array.isArray(q.options) && (
                        <ol style={{ marginLeft: '24px', marginTop: '6px' }}>
                          {q.options.map((opt, oIdx) => <li key={oIdx}>{opt}</li>)}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button onClick={() => setPreviewData(null)} className="btn btn-secondary">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
