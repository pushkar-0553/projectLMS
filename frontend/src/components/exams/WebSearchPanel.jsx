import React, { useState } from 'react';
import { Search, Globe, Copy, Check, ExternalLink, AlertCircle, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { examApi as api } from '../../services/examApi';

export default function WebSearchPanel({
  sessionToken,
  questionId,
  onInsertSnippet,
  height = '100%'
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);

  // In-Exam Reader View state (reads full article without exiting fullscreen exam or opening external tabs)
  const [readingArticle, setReadingArticle] = useState(null); // { url, title, loading, content, error, domain, wordCount }

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setReadingArticle(null); // Return to search list on new search

    try {
      const res = await api.studentExam.search(sessionToken, cleanQuery, questionId);
      if (res.success) {
        setResults(res.results || []);
      } else {
        setError(res.message || 'Search request failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete search. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenArticle = async (item) => {
    setReadingArticle({
      url: item.url,
      title: item.title,
      domain: new URL(item.url || 'https://duckduckgo.com').hostname.replace('www.', ''),
      loading: true,
      content: '',
      error: ''
    });

    try {
      const res = await api.studentExam.readPage(sessionToken, item.url);
      if (res.success) {
        setReadingArticle(prev => ({
          ...prev,
          loading: false,
          title: res.title || prev.title,
          content: res.content || 'No text content available for this page.',
          wordCount: res.wordCount || 0
        }));
      } else {
        setReadingArticle(prev => ({
          ...prev,
          loading: false,
          error: res.message || 'Unable to load article content.'
        }));
      }
    } catch (err) {
      setReadingArticle(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Could not fetch page content. Please try another reference.'
      }));
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height,
      background: '#ffffff', border: '1px solid #cbd5e1',
      borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
    }}>
      {/* Search Header */}
      <div style={{
        padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} color="#0284c7" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              DuckDuckGo Web Reference
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Secure in-exam proxy (No tab switching)
          </span>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search algorithms, syntax, documentation..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', fontSize: '13px',
                borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: '#0284c7', color: '#ffffff', border: 'none', cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {loading ? <Loader2 size={13} className="spin-animation" /> : <Search size={13} />}
            Search
          </button>
        </form>
      </div>

      {/* In-Exam Reader View (Activated when clicking any link or Read Article) */}
      {readingArticle ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff' }}>
          {/* Reader Top Action Bar */}
          <div style={{
            padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexShrink: 0
          }}>
            <button
              type="button"
              onClick={() => setReadingArticle(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', fontSize: '12px', fontWeight: 600,
                background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                color: '#475569', cursor: 'pointer'
              }}
            >
              <ArrowLeft size={13} /> Back to Search
            </button>

            <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Source: <strong>{readingArticle.domain}</strong> {readingArticle.wordCount ? `(${readingArticle.wordCount} words)` : ''}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {onInsertSnippet && readingArticle.content && (
                <button
                  type="button"
                  onClick={() => onInsertSnippet(`[Reference: ${readingArticle.title}]\n${readingArticle.content.slice(0, 1500)}\nSource: ${readingArticle.url}`)}
                  style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                    borderRadius: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Insert in Answer
                </button>
              )}

              {readingArticle.content && (
                <button
                  type="button"
                  onClick={() => handleCopy(readingArticle.content, 'reader')}
                  style={{
                    background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569',
                    borderRadius: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {copiedUrl === 'reader' ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                  {copiedUrl === 'reader' ? 'Copied' : 'Copy All'}
                </button>
              )}
            </div>
          </div>

          {/* Reader Scrollable Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', lineHeight: '1.7', color: '#1e293b' }}>
            {readingArticle.loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <Loader2 size={28} className="spin-animation" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#0f172a' }}>Loading & Extracting Article Content...</h4>
                <p style={{ fontSize: '12px', margin: 0, color: '#64748b' }}>
                  Formatting readable documentation without leaving exam fullscreen mode.
                </p>
              </div>
            )}

            {readingArticle.error && (
              <div style={{
                padding: '16px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', color: '#991b1b', fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                  <AlertCircle size={16} /> Unable to Extract Page
                </div>
                <p style={{ margin: '0 0 10px' }}>{readingArticle.error}</p>
                <button
                  type="button"
                  onClick={() => handleOpenArticle({ url: readingArticle.url, title: readingArticle.title })}
                  style={{
                    padding: '4px 12px', background: '#ffffff', border: '1px solid #fca5a5',
                    borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#991b1b'
                  }}
                >
                  Retry Loading
                </button>
              </div>
            )}

            {!readingArticle.loading && !readingArticle.error && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#0369a1' }}>
                  {readingArticle.title}
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  URL: <span style={{ fontFamily: 'monospace' }}>{readingArticle.url}</span>
                </div>
                <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#334155' }}>
                  {readingArticle.content}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Search Results Content */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#b91c1c', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
              <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Searching DuckDuckGo & Technical References via secure backend proxy...</p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
              No matching reference materials found for "{query}". Try broader search terms.
            </div>
          )}

          {!loading && !hasSearched && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
              <Globe size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>In-Exam Search & Article Reader Enabled</p>
              <p style={{ margin: 0 }}>
                Search for syntax reference, API documentation, or theoretical concepts and read full articles without leaving fullscreen.
              </p>
            </div>
          )}

          {!loading && results.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: item.sourceType === 'WIKIPEDIA' ? '#f0f9ff' : '#f8fafc',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <h4 
                  onClick={() => handleOpenArticle(item)}
                  style={{ 
                    margin: 0, fontSize: '13px', fontWeight: 700, color: '#0369a1', cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  title="Click to read full article"
                >
                  {item.title}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.sourceType === 'WIKIPEDIA' && (
                    <span style={{ fontSize: '9px', fontWeight: 700, background: '#bae6fd', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                      Concept
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new URL(item.url || 'https://duckduckgo.com').hostname.replace('www.', '')}
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                {item.snippet}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenArticle(item)}
                  style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8',
                    borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                  title="Read full article/documentation safely inside exam window"
                >
                  <BookOpen size={12} /> Read Full Article
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {onInsertSnippet && (
                    <button
                      type="button"
                      onClick={() => onInsertSnippet(`[Reference: ${item.title}]\n${item.snippet}\nSource: ${item.url}`)}
                      style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
                        borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Insert in Answer
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(item.snippet, idx)}
                    style={{
                      background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569',
                      borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {copiedUrl === idx ? <Check size={11} color="#22c55e" /> : <Copy size={11} />}
                    {copiedUrl === idx ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-animation { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
