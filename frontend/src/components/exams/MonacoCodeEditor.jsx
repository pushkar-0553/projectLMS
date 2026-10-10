import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, RotateCcw, Sun, Moon, Sparkles } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { id: 'python', label: 'Python (v3.11)' },
  { id: 'javascript', label: 'JavaScript (Node.js)' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'sql', label: 'SQL' },
  { id: 'html', label: 'HTML5' },
  { id: 'css', label: 'CSS3' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'shell', label: 'Bash / Shell' }
];

const DEFAULT_SNIPPETS = {
  python: `# Write your Python solution here\ndef solution():\n    pass\n`,
  javascript: `// Write your JavaScript solution here\nfunction solution() {\n    \n}\n`,
  typescript: `// Write your TypeScript solution here\nfunction solution(): void {\n    \n}\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
  sql: `-- Write your SQL query here\nSELECT * FROM table_name;\n`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Solution</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
  css: `/* Write your CSS rules here */\n.container {\n    display: flex;\n}\n`,
  go: `package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n`,
  rust: `fn main() {\n    // Your Rust code here\n}\n`,
  php: `<?php\n// Write your PHP solution here\nfunction solution() {\n    \n}\n`,
  shell: `#!/bin/bash\n# Write your Bash script here\n`
};

export default function MonacoCodeEditor({
  code = '',
  language = 'python',
  onChange,
  readOnly = false,
  height = '100%'
}) {
  const [currentLang, setCurrentLang] = useState(language || 'python');
  const [theme, setTheme] = useState('vs-dark');
  const [copied, setCopied] = useState(false);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor preferences
    editor.updateOptions({
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
      lineNumbers: 'on',
      automaticLayout: true,
      renderLineHighlight: 'all',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      formatOnPaste: true
    });
  };

  const handleLanguageChange = (newLang) => {
    setCurrentLang(newLang);
    // If current code is empty or matches default snippet of old language, populate with new snippet
    if (!code || Object.values(DEFAULT_SNIPPETS).includes(code)) {
      const snippet = DEFAULT_SNIPPETS[newLang] || '';
      if (onChange) onChange(snippet, newLang);
    } else {
      if (onChange) onChange(code, newLang);
    }
  };

  const handleCopyCode = () => {
    if (editorRef.current) {
      const val = editorRef.current.getValue();
      navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleResetSnippet = () => {
    if (window.confirm('Reset code editor to the default template? Any unsaved edits in this editor will be overwritten.')) {
      const snippet = DEFAULT_SNIPPETS[currentLang] || '';
      if (onChange) onChange(snippet, currentLang);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height,
      background: theme === 'vs-dark' ? '#1e1e1e' : '#ffffff',
      border: '1px solid #cbd5e1', borderRadius: '10px',
      overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
    }}>
      {/* Editor Control Header */}
      <div style={{
        height: '42px',
        background: theme === 'vs-dark' ? '#252526' : '#f1f5f9',
        borderBottom: `1px solid ${theme === 'vs-dark' ? '#333333' : '#e2e8f0'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', flexShrink: 0
      }}>
        {/* Left: Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={15} color={theme === 'vs-dark' ? '#60a5fa' : '#2563eb'} />
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={readOnly}
            style={{
              background: theme === 'vs-dark' ? '#333333' : '#ffffff',
              color: theme === 'vs-dark' ? '#e2e8f0' : '#1e293b',
              border: `1px solid ${theme === 'vs-dark' ? '#444444' : '#cbd5e1'}`,
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.label}</option>
            ))}
          </select>

          <span style={{ fontSize: '11px', color: theme === 'vs-dark' ? '#94a3b8' : '#64748b' }}>
            VS Code Monaco
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleFormatCode}
            title="Format Code Document"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme === 'vs-dark' ? '#cbd5e1' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <Sparkles size={13} color="#f59e0b" /> Format
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy Code"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme === 'vs-dark' ? '#cbd5e1' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleResetSnippet}
            title="Reset Starter Template"
            disabled={readOnly}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme === 'vs-dark' ? '#cbd5e1' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>

          <button
            type="button"
            onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')}
            title="Toggle Dark/Light Editor Theme"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme === 'vs-dark' ? '#fbbf24' : '#475569',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px'
            }}
          >
            {theme === 'vs-dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Editor
          height="100%"
          language={currentLang}
          theme={theme}
          value={code || DEFAULT_SNIPPETS[currentLang] || ''}
          onChange={(val) => {
            if (onChange) onChange(val, currentLang);
          }}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            tabSize: 4,
            minimap: { enabled: false },
            fontSize: 13,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
          loading={
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
              color: '#94a3b8', fontSize: '13px', background: theme === 'vs-dark' ? '#1e1e1e' : '#fff'
            }}>
              Loading Monaco Code Editor...
            </div>
          }
        />
      </div>

      {/* Editor Status Footer */}
      <div style={{
        height: '24px',
        background: theme === 'vs-dark' ? '#007acc' : '#2563eb',
        color: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', fontSize: '11px', fontWeight: 600
      }}>
        <span>Language: {currentLang.toUpperCase()} | Spaces: 4 | UTF-8</span>
        <span>Auto-synced to exam vault</span>
      </div>
    </div>
  );
}
