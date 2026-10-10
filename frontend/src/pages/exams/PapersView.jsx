import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  FileText, Plus, Eye, Download, Copy, Calendar, 
  Trash2, Layers, CheckCircle2, Search, ArrowRight, X, ExternalLink,
  Code, Globe, Bot, ArrowLeft, Check, Sparkles, Terminal, ListPlus, Edit2
} from 'lucide-react';

export default function PapersView({ onAssignPaper, courseId }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // View state: 'LIST' for table of papers, 'CREATE' for full-page Paper Maker Studio
  const [viewMode, setViewMode] = useState('LIST');
  const [editingPaperId, setEditingPaperId] = useState(null);

  // Preview Modal
  const [previewVersionId, setPreviewVersionId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Initial Paper Builder Form state
  const defaultInitialFormData = {
    title: '',
    subject: '',
    courseId: courseId || 1,
    durationMinutes: 60,
    instructions: '1. Answer all questions concisely.\n2. In written answers, justify with examples.\n3. A maximum of 3 security violations is permitted.',
    sections: [
      {
        title: 'Section A — Core Fundamentals',
        description: '',
        instructions: 'Answer all questions in this section.',
        default_capabilities: ['CODE_EDITOR'],
        questions: [
          {
            questionOrder: 1,
            questionType: 'WRITTEN',
            difficulty: 'MEDIUM',
            marks: 10,
            questionText: 'Explain the difference between mutable and immutable objects in Python with code examples.',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answerKey: 'Mutable objects can be modified in-place (lists, dicts). Immutable objects cannot be changed (int, str, tuple).',
            explanation: 'Full marks for clear explanation and memory reference rationale.',
            codeLanguage: 'python',
            codeTemplate: '# Write your solution below\ndef solution():\n    pass\n',
            capabilities_override: null
          }
        ]
      }
    ]
  };

  const [formData, setFormData] = useState(defaultInitialFormData);

  useEffect(() => {
    if (viewMode === 'LIST') {
      loadPapers();
    }
  }, [filterStatus, search, courseId, viewMode]);

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

  const handleOpenPreview = async (versionId, paperId = null) => {
    try {
      let targetVersionId = versionId;
      if (!targetVersionId && paperId) {
        const paper = await api.papers.getById(paperId);
        targetVersionId = paper?.latestVersion?.id || paper?.versions?.[0]?.id;
      }
      if (!targetVersionId) {
        alert('No version record found for this question paper.');
        return;
      }
      const data = await api.papers.getVersion(targetVersionId);
      if (data) {
        setPreviewData(data);
        setPreviewVersionId(targetVersionId);
      }
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

  const handleStartCreatePaper = () => {
    setEditingPaperId(null);
    setFormData(defaultInitialFormData);
    setViewMode('CREATE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditPaper = async (paper) => {
    try {
      setLoading(true);
      const targetVersionId = paper.latest_version_id || paper.id;
      const vData = await api.papers.getVersion(targetVersionId);
      if (!vData) {
        alert('Could not load version details for editing.');
        return;
      }
      
      const loadedSections = (vData.sections || []).map((sec, sIdx) => ({
        title: sec.title || `Section ${String.fromCharCode(65 + sIdx)}`,
        description: sec.description || '',
        instructions: sec.instructions || '',
        default_capabilities: Array.isArray(sec.default_capabilities) ? sec.default_capabilities : ['CODE_EDITOR'],
        questions: (sec.questions || []).map((q, qIdx) => ({
          questionOrder: q.question_order || qIdx + 1,
          questionType: q.question_type || 'WRITTEN',
          difficulty: q.difficulty || 'MEDIUM',
          marks: q.marks || 1,
          questionText: q.question_text || '',
          options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          answerKey: q.answer_key || '',
          explanation: q.explanation || '',
          codeLanguage: q.code_language || 'python',
          codeTemplate: q.code_template || '# Write your solution below\n',
          capabilities_override: q.capabilities_override || null
        }))
      }));

      setFormData({
        title: paper.title || vData.title || '',
        subject: paper.subject || vData.subject || '',
        courseId: paper.course_id || courseId || 1,
        durationMinutes: paper.duration_minutes || vData.duration_minutes || 60,
        instructions: paper.instructions || vData.instructions || '',
        sections: loadedSections.length > 0 ? loadedSections : defaultInitialFormData.sections
      });

      setEditingPaperId(paper.id);
      setViewMode('CREATE');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(`Failed to load paper for editing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (paper) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${paper.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.papers.delete(paper.id);
      alert(`Question paper "${paper.title}" deleted successfully.`);
      loadPapers();
    } catch (err) {
      alert(`Failed to delete paper: ${err.message}`);
    }
  };

  const handleCancelCreatePaper = () => {
    if (window.confirm('Discard unsaved changes and return to papers list?')) {
      setEditingPaperId(null);
      setViewMode('LIST');
    }
  };

  // Section & Question Builder helpers with deep immutability
  const addSection = () => {
    const sLetter = String.fromCharCode(65 + formData.sections.length);
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: `Section ${sLetter} — Advanced Concepts`,
          description: '',
          instructions: 'Answer all questions in this section.',
          default_capabilities: ['CODE_EDITOR'],
          questions: [
            {
              questionOrder: 1,
              questionType: 'WRITTEN',
              difficulty: 'MEDIUM',
              marks: 5,
              questionText: '',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              answerKey: '',
              explanation: '',
              codeLanguage: 'python',
              codeTemplate: '# Write your solution below\n',
              capabilities_override: null
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
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const qCount = sec.questions.length;
        return {
          ...sec,
          questions: [
            ...sec.questions,
            {
              questionOrder: qCount + 1,
              questionType: 'WRITTEN',
              difficulty: 'MEDIUM',
              marks: 5,
              questionText: '',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              answerKey: '',
              explanation: '',
              codeLanguage: 'python',
              codeTemplate: '# Write your solution below\n',
              capabilities_override: null
            }
          ]
        };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const removeQuestion = (sIdx, qIdx) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        if (sec.questions.length === 1) return sec;
        const filteredQ = sec.questions.filter((_, idx) => idx !== qIdx).map((q, newIdx) => ({
          ...q,
          questionOrder: newIdx + 1
        }));
        return { ...sec, questions: filteredQ };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const updateQuestion = (sIdx, qIdx, field, val) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const updatedQ = { ...q, [field]: val };
          // If switching to MCQ and options not initialized
          if (field === 'questionType' && val === 'MCQ') {
            if (!updatedQ.options || !Array.isArray(updatedQ.options) || updatedQ.options.length === 0) {
              updatedQ.options = ['Option A', 'Option B', 'Option C', 'Option D'];
            }
            if (!updatedQ.answerKey) {
              updatedQ.answerKey = updatedQ.options[0];
            }
          }
          // If switching to CODE, ensure codeLanguage and template exist
          if (field === 'questionType' && val === 'CODE') {
            if (!updatedQ.codeLanguage) updatedQ.codeLanguage = 'python';
            if (!updatedQ.codeTemplate) {
              updatedQ.codeTemplate = '# Write your code solution here\ndef solution():\n    pass\n';
            }
          }
          return updatedQ;
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  // Multiple Choice Option Helpers
  const updateMcqOption = (sIdx, qIdx, optIdx, text) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const curOptions = Array.isArray(q.options) ? [...q.options] : ['Option A', 'Option B', 'Option C', 'Option D'];
          const oldVal = curOptions[optIdx];
          curOptions[optIdx] = text;
          // If answerKey was this option, update answerKey as well
          let nextAnswerKey = q.answerKey;
          if (nextAnswerKey === oldVal) {
            nextAnswerKey = text;
          }
          return { ...q, options: curOptions, answerKey: nextAnswerKey };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const addMcqOption = (sIdx, qIdx) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const curOptions = Array.isArray(q.options) ? [...q.options] : [];
          if (curOptions.length >= 8) return q;
          const nextLetter = String.fromCharCode(65 + curOptions.length);
          curOptions.push(`Option ${nextLetter}`);
          return { ...q, options: curOptions };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const removeMcqOption = (sIdx, qIdx, optIdx) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const curOptions = Array.isArray(q.options) ? [...q.options] : [];
          if (curOptions.length <= 2) {
            alert('Multiple choice questions require at least 2 options.');
            return q;
          }
          const removedVal = curOptions[optIdx];
          const newOptions = curOptions.filter((_, idx) => idx !== optIdx);
          let nextAnswerKey = q.answerKey;
          if (nextAnswerKey === removedVal) {
            nextAnswerKey = newOptions[0] || '';
          }
          return { ...q, options: newOptions, answerKey: nextAnswerKey };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const selectCorrectMcqOption = (sIdx, qIdx, optText) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          return { ...q, answerKey: optText };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  // Section & Question Tool Capabilities Helpers
  const toggleSectionCapability = (sIdx, cap) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const curCaps = Array.isArray(sec.default_capabilities) ? [...sec.default_capabilities] : ['CODE_EDITOR'];
        const nextCaps = curCaps.includes(cap)
          ? curCaps.filter(c => c !== cap)
          : [...curCaps, cap];
        return { ...sec, default_capabilities: nextCaps };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const toggleQuestionOverride = (sIdx, qIdx) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const isCurrentlyOverridden = q.capabilities_override !== null && q.capabilities_override !== undefined;
          return {
            ...q,
            capabilities_override: isCurrentlyOverridden
              ? null
              : (Array.isArray(sec.default_capabilities) ? [...sec.default_capabilities] : ['CODE_EDITOR'])
          };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const toggleQuestionCapability = (sIdx, qIdx, cap) => {
    setFormData(prev => {
      const updatedSecs = prev.sections.map((sec, i) => {
        if (i !== sIdx) return sec;
        const updatedQuestions = sec.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const curCaps = Array.isArray(q.capabilities_override) ? [...q.capabilities_override] : ['CODE_EDITOR'];
          const nextCaps = curCaps.includes(cap)
            ? curCaps.filter(c => c !== cap)
            : [...curCaps, cap];
          return { ...q, capabilities_override: nextCaps };
        });
        return { ...sec, questions: updatedQuestions };
      });
      return { ...prev, sections: updatedSecs };
    });
  };

  const handleSavePaper = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a paper title.');
      return;
    }
    if (!formData.subject.trim()) {
      alert('Please enter a subject / topic.');
      return;
    }

    setSaving(true);
    try {
      if (editingPaperId) {
        await api.papers.update(editingPaperId, formData);
        alert('Question paper and sections updated successfully!');
      } else {
        const res = await api.papers.create(formData);
        // Auto publish Version 1 so it's ready for immediate batch assignment
        await api.papers.publishVersion(res.versionId);
        alert('Question paper created and published successfully!');
      }
      setEditingPaperId(null);
      setViewMode('LIST');
      loadPapers();
    } catch (err) {
      alert(`Error saving paper: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Calculate live total marks & total questions
  let calculatedTotalMarks = 0;
  let calculatedTotalQuestions = 0;
  formData.sections.forEach(sec => {
    (sec.questions || []).forEach(q => {
      calculatedTotalMarks += parseFloat(q.marks || 0);
      calculatedTotalQuestions += 1;
    });
  });

  // =========================================================================
  // VIEW MODE: FULL-PAGE QUESTION PAPER MAKER STUDIO
  // =========================================================================
  if (viewMode === 'CREATE') {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Sticky Top Action Bar */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
          background: '#ffffff', padding: '16px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'sticky', top: '12px', zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              type="button" 
              onClick={handleCancelCreatePaper} 
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <ArrowLeft size={16} /> Back to Papers
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                  {editingPaperId ? 'Edit Question Paper Studio' : 'Question Paper Studio'}
                </h2>
                <span className={`badge ${editingPaperId ? 'badge-warning' : 'badge-primary'}`}>
                  {editingPaperId ? `Editing Paper #${editingPaperId}` : 'New Assessment'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {editingPaperId ? 'Modify questions, options, code templates, marks, and capabilities in this assessment.' : 'Configure sections, tool capabilities, multiple choice options, and code tasks.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ 
              display: 'flex', gap: '16px', background: '#f8fafc', padding: '6px 16px', 
              borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', fontSize: '13px' 
            }}>
              <div><strong>Sections:</strong> {formData.sections.length}</div>
              <div><strong>Questions:</strong> {calculatedTotalQuestions}</div>
              <div><strong>Total Marks:</strong> <span style={{ color: '#4f46e5', fontWeight: 700 }}>{calculatedTotalMarks}</span></div>
              <div><strong>Duration:</strong> {formData.durationMinutes}m</div>
            </div>

            <button 
              type="button" 
              onClick={handleCancelCreatePaper} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSavePaper} 
              disabled={saving}
              className="btn btn-primary"
              style={{ gap: '6px', minWidth: '170px' }}
            >
              {saving ? 'Saving...' : (editingPaperId ? <><Sparkles size={16} /> Update Question Paper</> : <><Sparkles size={16} /> Save & Publish Paper</>)}
            </button>
          </div>
        </div>

        <form onSubmit={handleSavePaper} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Paper Information */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--primary)" /> 1. Examination Details & Instructions
            </h3>

            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px' }}>
              <div>
                <label htmlFor="paper-title" className="label">Paper Title *</label>
                <input
                  id="paper-title"
                  name="paperTitle"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Full Stack Python & Database Midterm Assessment"
                  className="input"
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  The title candidates and batch coordinators see for this examination.
                </span>
              </div>
              <div>
                <label htmlFor="paper-subject" className="label">Subject / Topic *</label>
                <input
                  id="paper-subject"
                  name="paperSubject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Python Programming, Algorithms & SQL"
                  className="input"
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Subject area or course module tag for analytics.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="paper-duration" className="label">Duration (Minutes) *</label>
                <input
                  id="paper-duration"
                  name="paperDuration"
                  type="number"
                  min="15"
                  max="360"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) || 60 }))}
                  className="input"
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Auto-submits when countdown timer reaches 00:00.
                </span>
              </div>
              <div>
                <label htmlFor="paper-instructions" className="label">General Instructions for Candidates</label>
                <textarea
                  id="paper-instructions"
                  name="paperInstructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  className="textarea"
                  style={{ minHeight: '75px', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Sections & Questions Studio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#1e293b' }}>
                  2. Sections & Assessment Questions
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Set section default capabilities (Code Editor, Web Search, AI) and override per question if needed.
                </span>
              </div>

              <button 
                type="button" 
                onClick={addSection} 
                className="btn btn-secondary"
                style={{ gap: '6px' }}
              >
                <Plus size={16} /> Add Section
              </button>
            </div>

            {formData.sections.map((sec, sIdx) => {
              let secMarks = 0;
              (sec.questions || []).forEach(q => { secMarks += parseFloat(q.marks || 0); });

              return (
                <div 
                  key={sIdx} 
                  style={{ 
                    background: '#ffffff', borderRadius: 'var(--radius-lg)', 
                    border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', 
                    overflow: 'hidden' 
                  }}
                >
                  {/* Section Banner */}
                  <div style={{ 
                    padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ 
                        background: '#4f46e5', color: '#ffffff', fontWeight: 800, 
                        fontSize: '12px', padding: '4px 10px', borderRadius: '6px' 
                      }}>
                        SECTION {String.fromCharCode(65 + sIdx)}
                      </span>
                      <input
                        id={`sec-title-${sIdx}`}
                        name={`secTitle_${sIdx}`}
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => {
                            const updatedSecs = prev.sections.map((s, idx) => idx === sIdx ? { ...s, title: val } : s);
                            return { ...prev, sections: updatedSecs };
                          });
                        }}
                        className="input"
                        style={{ fontWeight: 'bold', maxWidth: '400px', fontSize: '15px' }}
                        placeholder="Section Title"
                        required
                      />
                      <span className="badge badge-muted">
                        {sec.questions.length} Question{sec.questions.length > 1 ? 's' : ''} ({secMarks} Marks)
                      </span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeSection(sIdx)} 
                      className="btn btn-danger btn-sm"
                      style={{ gap: '4px' }}
                    >
                      <Trash2 size={13} /> Remove Section
                    </button>
                  </div>

                  {/* Section Body */}
                  <div style={{ padding: '20px' }}>
                    {/* Section Default Capabilities Pill Selector */}
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '14px', background: '#f1f5f9', 
                      padding: '10px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', 
                      border: '1px solid #e2e8f0', flexWrap: 'wrap' 
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        Section Default Tools:
                      </span>
                      {[
                        { key: 'CODE_EDITOR', label: 'Code Editor', icon: Code, color: '#2563eb' },
                        { key: 'WEB_SEARCH', label: 'Web Search', icon: Globe, color: '#0284c7' },
                        { key: 'AI_ASSISTANT', label: 'AI Assistant', icon: Bot, color: '#7c3aed' }
                      ].map(tool => {
                        const isChecked = (sec.default_capabilities || ['CODE_EDITOR']).includes(tool.key);
                        const Icon = tool.icon;
                        return (
                          <button
                            key={tool.key}
                            type="button"
                            onClick={() => toggleSectionCapability(sIdx, tool.key)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
                              fontWeight: 600, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                              border: `1.5px solid ${isChecked ? tool.color : '#cbd5e1'}`,
                              background: isChecked ? `${tool.color}15` : '#ffffff',
                              color: isChecked ? tool.color : '#64748b',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ 
                              width: '14px', height: '14px', borderRadius: '3px', 
                              border: `1.5px solid ${isChecked ? tool.color : '#94a3b8'}`,
                              background: isChecked ? tool.color : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isChecked && <Check size={10} color="#ffffff" strokeWidth={3} />}
                            </div>
                            <Icon size={14} />
                            <span>{tool.label}</span>
                          </button>
                        );
                      })}
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
                        Tools enabled here are inherited by all questions in this section unless explicitly overridden.
                      </span>
                    </div>

                    {/* Questions in Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {sec.questions.map((q, qIdx) => (
                        <div 
                          key={qIdx} 
                          style={{ 
                            background: '#f8fafc', border: '1px solid #e2e8f0', 
                            borderRadius: 'var(--radius-md)', padding: '18px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Question Card Top Bar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ 
                                fontWeight: 800, fontSize: '14px', background: '#3b82f6', 
                                color: '#ffffff', padding: '3px 8px', borderRadius: '5px' 
                              }}>
                                #{qIdx + 1}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                Question {qIdx + 1}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <label htmlFor={`q-type-${sIdx}-${qIdx}`} style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                                Type:
                              </label>
                              <select
                                id={`q-type-${sIdx}-${qIdx}`}
                                name={`qType_${sIdx}_${qIdx}`}
                                value={q.questionType}
                                onChange={(e) => updateQuestion(sIdx, qIdx, 'questionType', e.target.value)}
                                className="select"
                                style={{ padding: '6px 10px', fontSize: '13px', width: '160px', fontWeight: 600 }}
                              >
                                <option value="WRITTEN">Written Answer</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                                <option value="MCQ">Multiple Choice (MCQ)</option>
                                <option value="CODE">Code Writing</option>
                              </select>

                              <label htmlFor={`q-marks-${sIdx}-${qIdx}`} style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                                Marks:
                              </label>
                              <input
                                id={`q-marks-${sIdx}-${qIdx}`}
                                name={`qMarks_${sIdx}_${qIdx}`}
                                type="number"
                                min="1"
                                max="100"
                                value={q.marks}
                                onChange={(e) => updateQuestion(sIdx, qIdx, 'marks', parseFloat(e.target.value) || 1)}
                                className="input"
                                style={{ width: '80px', padding: '6px 8px', fontSize: '13px', fontWeight: 600 }}
                                required
                              />

                              {sec.questions.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => removeQuestion(sIdx, qIdx)} 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ color: '#ef4444' }}
                                  title="Delete question"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Question Text */}
                          <div style={{ marginBottom: '14px' }}>
                            <label htmlFor={`q-text-${sIdx}-${qIdx}`} className="label" style={{ fontSize: '13px', marginBottom: '4px' }}>
                              Question Description / Problem Statement *
                            </label>
                            <textarea
                              id={`q-text-${sIdx}-${qIdx}`}
                              name={`qText_${sIdx}_${qIdx}`}
                              value={q.questionText}
                              onChange={(e) => updateQuestion(sIdx, qIdx, 'questionText', e.target.value)}
                              placeholder="Type question prompt, requirements, or problem statement here..."
                              className="textarea"
                              style={{ minHeight: '80px', fontSize: '14px' }}
                              required
                            />
                          </div>

                          {/* =========================================================
                              TYPE-SPECIFIC CONTROL 1: MULTIPLE CHOICE QUESTION (MCQ)
                              ========================================================= */}
                          {q.questionType === 'MCQ' && (
                            <div style={{ 
                              background: '#eff6ff', border: '1px solid #bfdbfe', 
                              borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '14px' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#1e40af' }}>
                                  <ListPlus size={16} /> Options & Correct Answer
                                </div>
                                <span style={{ fontSize: '11px', color: '#3b82f6' }}>
                                  Click the radio button next to the option that is correct.
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => {
                                  const optLetter = String.fromCharCode(65 + optIdx);
                                  const isCorrect = q.answerKey === opt;

                                  return (
                                    <div 
                                      key={optIdx} 
                                      style={{ 
                                        display: 'flex', alignItems: 'center', gap: '10px', 
                                        background: isCorrect ? '#ffffff' : '#f8fafc',
                                        border: `1.5px solid ${isCorrect ? '#2563eb' : '#cbd5e1'}`,
                                        padding: '6px 12px', borderRadius: '6px'
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name={`correctOpt_${sIdx}_${qIdx}`}
                                        id={`mcq-opt-${sIdx}-${qIdx}-${optIdx}`}
                                        checked={isCorrect}
                                        onChange={() => selectCorrectMcqOption(sIdx, qIdx, opt)}
                                        style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                                        title="Mark as correct answer"
                                      />
                                      <label 
                                        htmlFor={`mcq-opt-${sIdx}-${qIdx}-${optIdx}`}
                                        style={{ 
                                          fontWeight: 800, fontSize: '13px', minWidth: '24px', 
                                          color: isCorrect ? '#2563eb' : '#64748b', cursor: 'pointer' 
                                        }}
                                      >
                                        {optLetter}.
                                      </label>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateMcqOption(sIdx, qIdx, optIdx, e.target.value)}
                                        placeholder={`Option ${optLetter} text`}
                                        className="input"
                                        style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                                        required
                                      />
                                      {isCorrect && (
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                                          Correct Answer
                                        </span>
                                      )}
                                      {(q.options || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeMcqOption(sIdx, qIdx, optIdx)}
                                          className="btn btn-ghost btn-sm"
                                          style={{ color: '#ef4444', padding: '2px 6px' }}
                                          title="Remove option"
                                        >
                                          &times;
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() => addMcqOption(sIdx, qIdx)}
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: '10px', gap: '4px', fontSize: '12px' }}
                              >
                                <Plus size={13} /> Add Another Option
                              </button>
                            </div>
                          )}

                          {/* =========================================================
                              TYPE-SPECIFIC CONTROL 2: CODE WRITING QUESTION
                              ========================================================= */}
                          {q.questionType === 'CODE' && (
                            <div style={{ 
                              background: '#f8fafc', border: '1px solid #cbd5e1', 
                              borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '14px' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                                  <Terminal size={16} color="var(--primary)" /> Code Challenge Configuration
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label htmlFor={`code-lang-${sIdx}-${qIdx}`} style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                    Target Language:
                                  </label>
                                  <select
                                    id={`code-lang-${sIdx}-${qIdx}`}
                                    name={`codeLang_${sIdx}_${qIdx}`}
                                    value={q.codeLanguage || 'python'}
                                    onChange={(e) => updateQuestion(sIdx, qIdx, 'codeLanguage', e.target.value)}
                                    className="select"
                                    style={{ padding: '4px 8px', fontSize: '12px', width: '130px' }}
                                  >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="c">C</option>
                                    <option value="sql">SQL</option>
                                    <option value="html">HTML</option>
                                    <option value="css">CSS</option>
                                    <option value="go">Go</option>
                                    <option value="rust">Rust</option>
                                    <option value="php">PHP</option>
                                    <option value="shell">Bash / Shell</option>
                                  </select>
                                </div>
                              </div>

                              <div style={{ marginBottom: '10px' }}>
                                <label htmlFor={`code-tmpl-${sIdx}-${qIdx}`} className="label" style={{ fontSize: '12px' }}>
                                  Starter Code / Function Stub (Provided to student in Monaco Editor):
                                </label>
                                <textarea
                                  id={`code-tmpl-${sIdx}-${qIdx}`}
                                  name={`codeTemplate_${sIdx}_${qIdx}`}
                                  value={q.codeTemplate || ''}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'codeTemplate', e.target.value)}
                                  placeholder="# Initial starter code for candidate..."
                                  className="textarea"
                                  style={{ fontFamily: 'monospace', minHeight: '90px', fontSize: '13px', background: '#0f172a', color: '#e2e8f0' }}
                                />
                              </div>

                              <div>
                                <label htmlFor={`code-cases-${sIdx}-${qIdx}`} className="label" style={{ fontSize: '12px' }}>
                                  Expected Output / Test Cases / Key Logic Criteria:
                                </label>
                                <textarea
                                  id={`code-cases-${sIdx}-${qIdx}`}
                                  name={`codeCases_${sIdx}_${qIdx}`}
                                  value={q.explanation || ''}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'explanation', e.target.value)}
                                  placeholder="e.g. Test case 1: Input [2, 7, 11, 15], Target 9 -> Output [0, 1]..."
                                  className="textarea"
                                  style={{ minHeight: '60px', fontSize: '12px' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Regular Answer Key / Explanation for Written & Short Answer */}
                          {(q.questionType === 'WRITTEN' || q.questionType === 'SHORT_ANSWER') && (
                            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '12px' }}>
                              <div>
                                <label htmlFor={`q-key-${sIdx}-${qIdx}`} className="label" style={{ fontSize: '12px' }}>
                                  Expected Answer Key / Bullet Points
                                </label>
                                <input
                                  id={`q-key-${sIdx}-${qIdx}`}
                                  name={`qKey_${sIdx}_${qIdx}`}
                                  type="text"
                                  value={q.answerKey}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'answerKey', e.target.value)}
                                  placeholder="Key points expected in student solution"
                                  className="input"
                                  style={{ fontSize: '13px' }}
                                />
                              </div>
                              <div>
                                <label htmlFor={`q-exp-${sIdx}-${qIdx}`} className="label" style={{ fontSize: '12px' }}>
                                  Grading Criteria / Rubric Notes
                                </label>
                                <input
                                  id={`q-exp-${sIdx}-${qIdx}`}
                                  name={`qExp_${sIdx}_${qIdx}`}
                                  type="text"
                                  value={q.explanation}
                                  onChange={(e) => updateQuestion(sIdx, qIdx, 'explanation', e.target.value)}
                                  placeholder="Criteria for full marks vs partial marks"
                                  className="input"
                                  style={{ fontSize: '13px' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* =========================================================
                              QUESTION TOOL ACCESS & CAPABILITIES OVERRIDE
                              ========================================================= */}
                          <div style={{ 
                            paddingTop: '12px', borderTop: '1px dashed #cbd5e1', 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            flexWrap: 'wrap', gap: '10px' 
                          }}>
                            <button
                              type="button"
                              onClick={() => toggleQuestionOverride(sIdx, qIdx)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
                                fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer',
                                color: (q.capabilities_override !== null && q.capabilities_override !== undefined) ? '#4f46e5' : '#475569',
                                padding: 0
                              }}
                            >
                              <div style={{
                                width: '15px', height: '15px', borderRadius: '3px',
                                border: `1.5px solid ${(q.capabilities_override !== null && q.capabilities_override !== undefined) ? '#4f46e5' : '#94a3b8'}`,
                                background: (q.capabilities_override !== null && q.capabilities_override !== undefined) ? '#4f46e5' : '#ffffff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {(q.capabilities_override !== null && q.capabilities_override !== undefined) && (
                                  <Check size={11} color="#ffffff" strokeWidth={3} />
                                )}
                              </div>
                              <span>Override Section Tools for this Question</span>
                            </button>

                            {(q.capabilities_override !== null && q.capabilities_override !== undefined) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {[
                                  { key: 'CODE_EDITOR', label: 'Code', icon: Code, color: '#2563eb' },
                                  { key: 'WEB_SEARCH', label: 'Search', icon: Globe, color: '#0284c7' },
                                  { key: 'AI_ASSISTANT', label: 'AI', icon: Bot, color: '#7c3aed' }
                                ].map(tool => {
                                  const isChecked = (q.capabilities_override || []).includes(tool.key);
                                  const Icon = tool.icon;
                                  return (
                                    <button
                                      key={tool.key}
                                      type="button"
                                      onClick={() => toggleQuestionCapability(sIdx, qIdx, tool.key)}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px',
                                        fontWeight: 600, padding: '3px 8px', borderRadius: '5px', cursor: 'pointer',
                                        border: `1px solid ${isChecked ? tool.color : '#cbd5e1'}`,
                                        background: isChecked ? `${tool.color}15` : '#ffffff',
                                        color: isChecked ? tool.color : '#64748b'
                                      }}
                                    >
                                      <Icon size={12} />
                                      <span>{tool.label}</span>
                                      {isChecked && <Check size={10} />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                Inheriting section tools: {(sec.default_capabilities || ['CODE_EDITOR']).map(c => c === 'CODE_EDITOR' ? 'Code' : c === 'WEB_SEARCH' ? 'Search' : 'AI').join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      <button 
                        type="button" 
                        onClick={() => addQuestion(sIdx)} 
                        className="btn btn-secondary btn-sm" 
                        style={{ alignSelf: 'flex-start', marginTop: '4px', gap: '6px' }}
                      >
                        <Plus size={14} /> Add Question to Section {String.fromCharCode(65 + sIdx)}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Add Section Button */}
            <button 
              type="button" 
              onClick={addSection} 
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start', gap: '6px' }}
            >
              <Plus size={16} /> Add Another Section
            </button>
          </div>

          {/* Sticky Footer Action Bar */}
          <div style={{ 
            display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#ffffff', 
            padding: '16px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginTop: '12px' 
          }}>
            <button 
              type="button" 
              onClick={handleCancelCreatePaper} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary"
              style={{ gap: '6px', minWidth: '180px' }}
            >
              {saving ? 'Saving...' : (editingPaperId ? <><Sparkles size={16} /> Update Question Paper</> : <><Sparkles size={16} /> Save & Publish Paper</>)}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: PAPERS LIST VIEW (DEFAULT)
  // =========================================================================
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

        <button onClick={handleStartCreatePaper} className="btn btn-primary" style={{ gap: '8px' }}>
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
                  <th>Paper Details</th>
                  <th>Subject</th>
                  <th>Version</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => {
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.description || 'No description provided'}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{p.subject || 'General'}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>v{p.latest_version_number || 1}</span>
                      </td>
                      <td>{p.duration_minutes} Mins</td>
                      <td>
                        <span style={{ fontWeight: 'bold' }}>{p.total_marks}</span>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'READY' ? 'badge-success' : 'badge-warning'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenPreview(p.latest_version_id, p.id)}
                            className="btn btn-secondary btn-sm"
                            title="Preview paper"
                          >
                            <Eye size={14} /> Preview
                          </button>

                          <button
                            onClick={() => handleEditPaper(p)}
                            className="btn btn-secondary btn-sm"
                            title="Edit question paper & questions"
                          >
                            <Edit2 size={14} /> Edit
                          </button>

                          <button
                            onClick={() => handleDuplicateVersion(p.id)}
                            className="btn btn-secondary btn-sm"
                            title="Create new version"
                          >
                            <Copy size={14} /> Branch
                          </button>

                          {onAssignPaper && p.status === 'READY' && (
                            <button
                              onClick={() => onAssignPaper(p)}
                              className="btn btn-primary btn-sm"
                              title="Assign paper to batches"
                            >
                              Assign <ArrowRight size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeletePaper(p)}
                            className="btn btn-danger btn-sm"
                            title="Delete question paper"
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>{previewData.title}</h2>
                <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#4b5563' }}>Subject: {previewData.subject || 'Assessment'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
                <span>Total Marks: {previewData.total_marks}</span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>Q{q.question_order || qIdx + 1}. [{q.question_type}]</span>
                          {q.capabilities && Array.isArray(q.capabilities) && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {q.capabilities.map(cap => (
                                <span key={cap} style={{ fontSize: '10px', padding: '1px 6px', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontFamily: 'sans-serif', fontWeight: 600 }}>
                                  {cap === 'CODE_EDITOR' ? 'Code' : cap === 'WEB_SEARCH' ? 'Search' : 'AI'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
