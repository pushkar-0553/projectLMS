import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { BookOpen, Plus, Tag, Layers, Search, Filter } from 'lucide-react';

export default function QuestionBankView() {
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    categoryId: '',
    questionType: 'WRITTEN',
    difficulty: 'MEDIUM',
    topic: '',
    marks: 5,
    questionText: '',
    answerKey: '',
    explanation: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedCatId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, qList] = await Promise.all([
        api.questionBank.listCategories(),
        api.questionBank.listQuestions(selectedCatId)
      ]);
      setCategories(cats);
      setQuestions(qList);
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await api.questionBank.createQuestion(form);
      alert('Question saved to Question Bank successfully!');
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert(`Error creating question: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="select"
            style={{ width: '220px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ gap: '8px' }}>
          <Plus size={18} />
          Add Reusable Question
        </button>
      </div>

      {/* Questions list */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Question Bank...</div>
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No reusable questions found. Click "Add Reusable Question" to build your repository.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Question Preview</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Default Marks</th>
                </tr>
              </thead>
              <tbody>
                {questions.map(q => (
                  <tr key={q.id}>
                    <td>
                      <span className="badge badge-muted">{q.topic || 'General'}</span>
                    </td>
                    <td style={{ maxWidth: '400px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {q.question_text}
                      </div>
                      {q.answer_key && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Key: {q.answer_key}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary">{q.question_type}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        q.difficulty === 'EASY' ? 'badge-success' :
                        q.difficulty === 'HARD' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td>
                      <strong>{q.marks} pts</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD QUESTION MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Add Question to Bank</h3>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm">&times;</button>
            </div>

            <form onSubmit={handleCreateQuestion}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Topic / Skill</label>
                    <input
                      type="text"
                      value={form.topic}
                      onChange={(e) => setForm(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. Python Generators"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Question Type</label>
                    <select
                      value={form.questionType}
                      onChange={(e) => setForm(prev => ({ ...prev, questionType: e.target.value }))}
                      className="select"
                    >
                      <option value="WRITTEN">Written Answer</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="MCQ">Multiple Choice</option>
                      <option value="CODE">Code Writing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Difficulty</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="select"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Default Marks</label>
                    <input
                      type="number"
                      value={form.marks}
                      onChange={(e) => setForm(prev => ({ ...prev, marks: parseFloat(e.target.value) }))}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Question Text *</label>
                  <textarea
                    value={form.questionText}
                    onChange={(e) => setForm(prev => ({ ...prev, questionText: e.target.value }))}
                    placeholder="Enter question text..."
                    className="textarea"
                    required
                  />
                </div>

                <div>
                  <label className="label">Answer Key / Solution</label>
                  <textarea
                    value={form.answerKey}
                    onChange={(e) => setForm(prev => ({ ...prev, answerKey: e.target.value }))}
                    placeholder="Enter expected answer..."
                    className="textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
