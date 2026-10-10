import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { examApi as api } from '../../services/examApi';

const QUICK_PROMPTS = [
  'Explain the core concept behind this question',
  'What is the standard algorithmic approach & time complexity?',
  'Help identify common syntax or boundary edge cases',
  'Explain the mathematical / logical formula needed'
];

export default function AiAssistantPanel({
  sessionToken,
  questionId,
  questionText = '',
  codeContext = '',
  onInsertExplanation,
  height = '100%'
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [aiMeta, setAiMeta] = useState({
    model: 'AI Assistant',
    provider: 'openai',
    remainingQueries: 8,
    maxQueries: 8,
    queriesUsed: 0
  });

  // Load session AI quota & active model on mount
  React.useEffect(() => {
    if (!sessionToken) return;
    api.studentExam.getAiStatus(sessionToken).then(res => {
      if (res && res.success) {
        setAiMeta({
          model: res.model || 'gpt-4o-mini',
          provider: res.provider || 'openai',
          remainingQueries: res.remainingQueries ?? 8,
          maxQueries: res.maxQueries ?? 8,
          queriesUsed: res.queriesUsed ?? 0
        });
      }
    }).catch(() => {});
  }, [sessionToken]);

  const handleSend = async (customPrompt = null) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || loading || aiMeta.remainingQueries <= 0) return;

    const userMessage = { role: 'user', content: textToSend, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);
    setError('');

    try {
      const res = await api.studentExam.askAi(
        sessionToken,
        textToSend,
        questionText,
        codeContext,
        questionId
      );

      if (res.success) {
        const assistantMessage = {
          role: 'assistant',
          content: res.response || 'No response returned.',
          model: res.model,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Update active model and remaining query budget
        setAiMeta(prev => ({
          ...prev,
          model: res.model || prev.model,
          provider: res.provider || prev.provider,
          remainingQueries: res.remainingQueries ?? Math.max(0, prev.remainingQueries - 1),
          queriesUsed: res.queriesUsed ?? (prev.queriesUsed + 1),
          maxQueries: res.maxQueries ?? prev.maxQueries
        }));
      } else {
        setError(res.message || 'AI request failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to contact AI Assistant. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height,
      background: '#ffffff', border: '1px solid #cbd5e1',
      borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: '#f5f3ff', borderBottom: '1px solid #ede9fe',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '6px', background: '#7c3aed',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={16} color="#ffffff" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#4c1d95' }}>
              Exam AI Assistant
            </h4>
            <span style={{ fontSize: '11px', color: '#6d28d9' }}>
              Conceptual Guidance & Hints
            </span>
          </div>
        </div>

        {/* Model Badge & Query Limit Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: '#4c1d95', background: '#ede9fe',
            padding: '2px 8px', borderRadius: '12px', border: '1px solid #ddd6fe',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <Sparkles size={11} color="#7c3aed" />
            {aiMeta.model}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: aiMeta.remainingQueries <= 2 ? '#b91c1c' : '#15803d',
            background: aiMeta.remainingQueries <= 2 ? '#fef2f2' : '#f0fdf4',
            padding: '2px 8px', borderRadius: '12px',
            border: `1px solid ${aiMeta.remainingQueries <= 2 ? '#fecaca' : '#bbf7d0'}`
          }}>
            {aiMeta.remainingQueries} / {aiMeta.maxQueries} left
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: '#64748b' }}>
            <Sparkles size={28} color="#8b5cf6" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, color: '#334155', fontSize: '13px', margin: '0 0 6px' }}>
              Need conceptual clarification?
            </p>
            <p style={{ fontSize: '12px', margin: '0 0 14px', color: '#64748b' }}>
              Ask questions about programming syntax, algorithm theory, or question specifications.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              {QUICK_PROMPTS.map((qp, qpIdx) => (
                <button
                  key={qpIdx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
                    padding: '8px 10px', fontSize: '12px', color: '#475569', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#6d28d9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                >
                  💡 {qp}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, mIdx) => (
          <div
            key={mIdx}
            style={{
              display: 'flex', flexDirection: 'column',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%'
            }}
          >
            <div style={{
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: m.role === 'user' ? '#7c3aed' : '#f8fafc',
              color: m.role === 'user' ? '#ffffff' : '#1e293b',
              border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
              fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '10px', color: '#94a3b8', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <span>{m.timestamp}</span>
              {m.role === 'assistant' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopy(m.content, mIdx)}
                    style={{ background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' }}
                  >
                    {copiedIdx === mIdx ? <Check size={10} color="#22c55e" /> : <Copy size={10} />}
                    {copiedIdx === mIdx ? 'Copied' : 'Copy'}
                  </button>
                  {onInsertExplanation && (
                    <button
                      type="button"
                      onClick={() => onInsertExplanation(m.content)}
                      style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', padding: 0 }}
                    >
                      Insert in answer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '10px', background: '#f5f3ff', color: '#6d28d9', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} className="spin-animation" />
            <span>AI Assistant is generating explanation...</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#b91c1c', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Quota Exhausted Banner */}
      {aiMeta.remainingQueries <= 0 && (
        <div style={{
          padding: '8px 14px', background: '#fffbeb', borderTop: '1px solid #fef3c7',
          color: '#92400e', fontSize: '11px', textAlign: 'center', fontWeight: 600
        }}>
          ⚠️ Exam AI Assistant allowance reached ({aiMeta.maxQueries} / {aiMeta.maxQueries} queries used). Please solve remaining questions independently.
        </div>
      )}

      {/* Input Box Footer */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{
        padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: '8px', flexShrink: 0
      }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={aiMeta.remainingQueries <= 0 ? "AI query limit reached for this exam" : "Ask a question about syntax, algorithm, or logic..."}
          disabled={loading || aiMeta.remainingQueries <= 0}
          style={{
            flex: 1, padding: '8px 12px', fontSize: '12px',
            borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none',
            background: aiMeta.remainingQueries <= 0 ? '#f1f5f9' : '#ffffff'
          }}
        />

        <button
          type="submit"
          disabled={loading || !prompt.trim() || aiMeta.remainingQueries <= 0}
          style={{
            padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: aiMeta.remainingQueries <= 0 ? '#94a3b8' : '#7c3aed', color: '#ffffff', border: 'none',
            cursor: (loading || !prompt.trim() || aiMeta.remainingQueries <= 0) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Send size={13} />
          Send
        </button>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-animation { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
