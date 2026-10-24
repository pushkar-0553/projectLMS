import React from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2, HelpCircle } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Detailed / Long Text' },
  { value: 'RATING', label: 'Rating (1 to 5)' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice (Options)' }
];

export const DEFAULT_FEEDBACK_QUESTIONS = [
  {
    question_text: 'How is the class going for you?',
    question_type: 'TEXT',
    options: [],
    is_required: true
  },
  {
    question_text: 'How frequently are you able to attend the classes?',
    question_type: 'SINGLE_CHOICE',
    options: ['Regularly (Everyday)', 'Most days', 'Occasionally', 'Facing attendance issues'],
    is_required: true
  },
  {
    question_text: 'How is your practice going?',
    question_type: 'SINGLE_CHOICE',
    options: ['Very Good', 'Good', 'Average', 'Poor'],
    is_required: true
  },
  {
    question_text: 'How would you rate the class teaching and explanation?',
    question_type: 'RATING',
    options: [],
    is_required: true
  },
  {
    question_text: 'Are you facing any difficulty understanding the topics?',
    question_type: 'LONG_TEXT',
    options: [],
    is_required: false
  },
  {
    question_text: 'Do you have any suggestions for improving the class or sessions?',
    question_type: 'LONG_TEXT',
    options: [],
    is_required: false
  }
];

const QuestionBuilder = ({ questions = [], onChange }) => {
  const handleAddQuestion = () => {
    const newQ = {
      id: `temp_${Date.now()}`,
      question_text: '',
      question_type: 'TEXT',
      options: [],
      is_required: true
    };
    onChange([...questions, newQ]);
  };

  const handleUpdateQuestion = (index, updates) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length <= 1) {
      alert('Feedback campaign must have at least one question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...questions];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleMoveDown = (index) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleOptionsChange = (index, optionsStr) => {
    const arr = optionsStr.split('\n').map(o => o.trim()).filter(Boolean);
    handleUpdateQuestion(index, { options: arr });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Questions ({questions.length})
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>
            (Asked by coordinator during student call)
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddQuestion}
          style={{
            padding: '6px 12px',
            background: '#e0e7ff',
            color: '#4338ca',
            border: '1px solid #c7d2fe',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={14} /> Add Question
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="fb-qb-item">
            <div className="fb-qb-header">
              <span className="fb-qb-num">Question {idx + 1}</span>
              <div className="fb-qb-tools">
                <button
                  type="button"
                  className="fb-qb-tool-btn"
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  title="Move question up"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="fb-qb-tool-btn"
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === questions.length - 1}
                  title="Move question down"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  className="fb-qb-delete-btn"
                  onClick={() => handleDeleteQuestion(idx)}
                  title="Delete question"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <input
              type="text"
              placeholder="e.g. How is the class going for you?"
              value={q.question_text || q.questionText || ''}
              onChange={(e) => handleUpdateQuestion(idx, { question_text: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {/* Row with Question Type and Required checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TYPE:</span>
                <select
                  value={q.question_type || q.questionType || 'TEXT'}
                  onChange={(e) => handleUpdateQuestion(idx, { question_type: e.target.value })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: '#1e293b',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {QUESTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={q.is_required !== undefined ? q.is_required : true}
                  onChange={(e) => handleUpdateQuestion(idx, { is_required: e.target.checked })}
                />
                Required
              </label>
            </div>

            {/* Options Input for Single Choice */}
            {(q.question_type === 'SINGLE_CHOICE' || q.questionType === 'SINGLE_CHOICE') && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  OPTIONS (Enter one per line):
                </div>
                <textarea
                  rows={3}
                  placeholder={`Very Good\nGood\nAverage\nPoor`}
                  value={Array.isArray(q.options) ? q.options.join('\n') : (q.options || '')}
                  onChange={(e) => handleOptionsChange(idx, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    color: '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionBuilder;
