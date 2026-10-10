import React, { useState, useEffect } from 'react';
import { examApi as api } from '../../services/examApi';
import { 
  Bot, Plus, ShieldCheck, AlertCircle, RefreshCw, 
  CheckCircle2, Clock, Play, Activity, AlertTriangle, Key, Info,
  Edit2, Trash2, Sparkles, Check, ExternalLink, Cpu, Star
} from 'lucide-react';

const PROVIDER_OPTIONS = [
  { 
    id: 'openai', 
    name: 'OpenAI (GPT-4o, GPT-4o-mini)', 
    defaultBase: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    keyHint: 'Visit platform.openai.com > API Keys. Key usually starts with sk-...'
  },
  { 
    id: 'gemini', 
    name: 'Google Gemini (via OpenAI-compatible API)', 
    defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    keyHint: 'Visit aistudio.google.com > Get API key. Key starts with AIzaSy...'
  },
  { 
    id: 'groq', 
    name: 'Groq (Ultra-Fast Free Llama 3.3)', 
    defaultBase: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyHint: 'Visit console.groq.com/keys. Key starts with gsk_...'
  },
  { 
    id: 'deepseek', 
    name: 'DeepSeek (DeepSeek V3 / Coder)', 
    defaultBase: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    keyHint: 'Visit platform.deepseek.com > API Keys. Key starts with sk-...'
  },
  { 
    id: 'litellm', 
    name: 'LiteLLM Gateway / Local Proxy', 
    defaultBase: 'http://localhost:4000/v1',
    models: ['gpt-4o-mini', 'claude-3-5-sonnet', 'ollama/llama3'],
    keyHint: 'Enter your LiteLLM master key or bearer token.'
  },
  { 
    id: 'custom', 
    name: 'Custom OpenAI-Compatible Provider', 
    defaultBase: 'https://api.openai.com/v1',
    models: [],
    keyHint: 'Enter any OpenAI-compatible API key and endpoint URL.'
  }
];

export default function AiConfigView() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
  const [editingId, setEditingId] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    displayName: '',
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    isDefault: true
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await api.aiConfig.list();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to load AI configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('ADD');
    setEditingId(null);
    setFormData({
      displayName: 'Primary Exam AI Assistant',
      provider: 'openai',
      modelName: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      isDefault: configs.length === 0
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cfg) => {
    setModalMode('EDIT');
    setEditingId(cfg.id);
    setFormData({
      displayName: cfg.displayName,
      provider: cfg.provider || 'openai',
      modelName: cfg.modelName || 'gpt-4o-mini',
      apiKey: '', // Leave blank to preserve existing encrypted key
      baseUrl: cfg.baseUrl || '',
      isDefault: cfg.isDefault
    });
    setShowModal(true);
  };

  const handleProviderChange = (newProvider) => {
    const provDef = PROVIDER_OPTIONS.find(p => p.id === newProvider) || PROVIDER_OPTIONS[0];
    setFormData(prev => ({
      ...prev,
      provider: newProvider,
      baseUrl: provDef.defaultBase,
      modelName: provDef.models[0] || prev.modelName
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'ADD') {
        if (!formData.apiKey.trim()) {
          return alert('Please enter an API Key.');
        }
        await api.aiConfig.create(formData);
        alert('AI Model configuration encrypted and saved successfully!');
      } else {
        await api.aiConfig.update(editingId, formData);
        alert('AI Model configuration updated successfully!');
      }
      setShowModal(false);
      loadConfigs();
    } catch (err) {
      alert(`Error saving AI configuration: ${err.message}`);
    }
  };

  const handleTestConnection = async (id) => {
    setTestingId(id);
    try {
      const res = await api.aiConfig.testConnection(id);
      alert(res.message || 'Connection verified successfully!');
      loadConfigs();
    } catch (err) {
      alert(err.message || 'Connection failed.');
      loadConfigs();
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    try {
      await api.aiConfig.setDefault(id);
      loadConfigs();
    } catch (err) {
      alert(`Error setting default model: ${err.message}`);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete AI Model configuration "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.aiConfig.delete(id);
      loadConfigs();
    } catch (err) {
      alert(`Error deleting configuration: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const selectedProviderDef = PROVIDER_OPTIONS.find(p => p.id === formData.provider) || PROVIDER_OPTIONS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 14px rgba(49, 46, 129, 0.25)'
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ background: '#4f46e5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
              AI ASSISTANT ENGINE
            </span>
            <span style={{ fontSize: '12px', opacity: 0.85 }}>AES-256-GCM Hardware Encrypted</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
            AI Models & API Gateway Settings
          </h2>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9, lineHeight: '1.5' }}>
            Configure and test cloud AI models (OpenAI, Google Gemini, Groq, DeepSeek, or LiteLLM). 
            API keys are encrypted in the database and never exposed to candidate browsers. 
            The active default model powers in-exam student assistance.
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal} 
          className="btn btn-primary"
          style={{ background: '#4f46e5', border: '1px solid #6366f1', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
        >
          <Plus size={18} /> Configure AI Model & Key
        </button>
      </div>

      {/* Main Configurations Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>
              Configured AI Models & Keys
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {configs.length} active model configuration{configs.length === 1 ? '' : 's'} registered.
            </span>
          </div>

          <button 
            onClick={loadConfigs} 
            disabled={loading} 
            className="btn btn-secondary btn-sm" 
            style={{ gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            Loading AI configurations...
          </div>
        ) : configs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
            <Bot size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: '#1e293b' }}>
              No AI Model Configured Yet
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '0 auto 16px' }}>
              Add your OpenAI, Gemini, or Groq API key and preferred model name to power the student AI assistant panel.
            </p>
            <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
              <Plus size={14} /> Add First AI Model
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Model & Label</th>
                  <th>Provider</th>
                  <th>API Key</th>
                  <th>Endpoint (Base URL)</th>
                  <th>Status</th>
                  <th>Last Tested</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(cfg => (
                  <tr key={cfg.id} style={{ background: cfg.isDefault ? 'rgba(79, 70, 229, 0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                          {cfg.modelName}
                        </div>
                        {cfg.isDefault && (
                          <span style={{ 
                            background: '#dcfce7', color: '#15803d', fontSize: '11px', 
                            fontWeight: 800, padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' 
                          }}>
                            <Star size={11} fill="#15803d" /> Active Default
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {cfg.displayName}
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '11px' }}>
                        {cfg.provider}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                        {cfg.maskedApiKey}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#64748b' }}>
                        {cfg.baseUrl ? cfg.baseUrl.replace('https://', '') : 'Default Provider Gateway'}
                      </span>
                    </td>

                    <td>
                      {cfg.isHealthy ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Healthy
                        </span>
                      ) : (
                        <div>
                          <span className="badge badge-danger">
                            <AlertCircle size={12} /> Failing
                          </span>
                          {cfg.lastErrorMessage && (
                            <div 
                              style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', maxWidth: '180px', lineHeight: '1.2' }}
                              title={cfg.lastErrorMessage}
                            >
                              {cfg.lastErrorMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {cfg.lastTestedAt ? new Date(cfg.lastTestedAt).toLocaleString() : 'Not tested'}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleTestConnection(cfg.id)}
                          disabled={testingId === cfg.id}
                          className="btn btn-secondary btn-sm"
                          title="Send test ping to model"
                        >
                          {testingId === cfg.id ? 'Testing...' : 'Test'}
                        </button>

                        {!cfg.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(cfg.id)}
                            disabled={settingDefaultId === cfg.id}
                            className="btn btn-secondary btn-sm"
                            title="Set as active default AI model"
                          >
                            Set Default
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cfg)}
                          className="btn btn-secondary btn-sm"
                          title="Edit model or API key"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(cfg.id, cfg.displayName)}
                          disabled={deletingId === cfg.id}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          title="Delete AI model configuration"
                        >
                          <Trash2 size={13} />
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

      {/* =========================================================================
          MODAL: CONFIGURE AI MODEL & API KEY
          ========================================================================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-primary)' }}>
                  {modalMode === 'EDIT' ? 'Update AI Model Configuration' : 'Configure AI Model & API Key'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Provide your API key and preferred model. All credentials are encrypted with AES-256-GCM.
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Provider Selector */}
                <div>
                  <label htmlFor="ai-provider" className="label">AI Provider / Gateway *</label>
                  <select
                    id="ai-provider"
                    value={formData.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="select"
                    required
                  >
                    {PROVIDER_OPTIONS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Key Name / Label */}
                <div>
                  <label htmlFor="ai-key-name" className="label">Configuration Label / Key Name *</label>
                  <input
                    id="ai-key-name"
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. Production GPT-4o Mini or Fast Groq Llama 3"
                    className="input"
                    required
                  />
                </div>

                {/* Model Name & Quick Suggestions */}
                <div>
                  <label htmlFor="ai-model-name" className="label">Model Name *</label>
                  <input
                    id="ai-model-name"
                    type="text"
                    value={formData.modelName}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                    placeholder="e.g. gpt-4o-mini, gemini-1.5-flash, llama-3.3-70b-versatile"
                    className="input"
                    required
                  />
                  
                  {selectedProviderDef.models.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Suggested models:</span>
                      {selectedProviderDef.models.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, modelName: m }))}
                          style={{
                            fontSize: '11px', background: formData.modelName === m ? '#e0e7ff' : '#f1f5f9',
                            color: formData.modelName === m ? '#3730a3' : '#475569',
                            border: `1px solid ${formData.modelName === m ? '#a5b4fc' : '#cbd5e1'}`,
                            padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* API Key */}
                <div>
                  <label htmlFor="ai-api-key" className="label">
                    API Key {modalMode === 'ADD' ? '*' : '(Leave blank to keep existing key)'}
                  </label>
                  <input
                    id="ai-api-key"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={modalMode === 'EDIT' ? '•••••••••••••••• (Leave blank to keep current)' : 'Paste API Key (sk-..., gsk_..., AIzaSy...)'}
                    className="input"
                    required={modalMode === 'ADD'}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={13} color="var(--primary)" />
                    <span>{selectedProviderDef.keyHint}</span>
                  </div>
                </div>

                {/* Base URL (Advanced / Custom) */}
                <div>
                  <label htmlFor="ai-base-url" className="label">Base URL (API Endpoint)</label>
                  <input
                    id="ai-base-url"
                    type="text"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                    className="input"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Auto-configured for standard providers. Change only if using a custom gateway, reverse proxy, or local LiteLLM.
                  </span>
                </div>

                {/* Default Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                  <input
                    id="ai-is-default"
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="ai-is-default" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
                    Set as the active default AI model for all candidate examinations
                  </label>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                  <ShieldCheck size={16} />
                  {modalMode === 'EDIT' ? 'Update AI Configuration' : 'Encrypt & Save AI Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
