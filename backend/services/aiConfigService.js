const db = require('../config/db');
const { encrypt, decrypt } = require('../config/crypto');
const { logAudit } = require('./auditService');

/**
 * Standard provider default endpoints (all supporting OpenAI-compatible chat completions)
 */
const PROVIDER_DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  litellm: 'http://localhost:4000/v1',
  custom: 'https://api.openai.com/v1'
};

/**
 * Mask an API key for safe client display (e.g. sk-proj••••••••4a8b)
 */
function maskApiKey(key) {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) return '••••••••';
  const prefix = clean.slice(0, Math.min(6, Math.floor(clean.length / 3)));
  const suffix = clean.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * List all configured AI models and keys (passwords securely masked)
 */
async function listAiConfigs() {
  const [rows] = await db.query(`
    SELECT 
      id,
      display_name,
      provider,
      model_name,
      base_url,
      is_active,
      is_default,
      is_healthy,
      last_tested_at,
      last_error_message,
      created_at,
      encrypted_api_key,
      iv,
      auth_tag
    FROM exam_ai_configs
    ORDER BY is_default DESC, id DESC
  `);

  return rows.map(r => {
    let maskedKey = '••••••••';
    try {
      const plainKey = decrypt(r.encrypted_api_key, r.iv, r.auth_tag);
      maskedKey = maskApiKey(plainKey);
    } catch (_) {}

    return {
      id: r.id,
      displayName: r.display_name,
      provider: r.provider,
      modelName: r.model_name,
      baseUrl: r.base_url || PROVIDER_DEFAULT_BASE_URLS[r.provider] || '',
      maskedApiKey: maskedKey,
      isActive: Boolean(r.is_active),
      isDefault: Boolean(r.is_default),
      isHealthy: Boolean(r.is_healthy),
      lastTestedAt: r.last_tested_at,
      lastErrorMessage: r.last_error_message,
      createdAt: r.created_at
    };
  });
}

/**
 * Create a new AI configuration with encrypted API key
 */
async function createAiConfig(data, userId) {
  const displayName = (data.displayName || data.keyName || '').trim() || 'AI Model Configuration';
  const provider = (data.provider || 'openai').toLowerCase().trim();
  const modelName = (data.modelName || data.model || 'gpt-4o-mini').trim();
  const rawApiKey = (data.apiKey || '').trim();
  const baseUrl = (data.baseUrl || PROVIDER_DEFAULT_BASE_URLS[provider] || '').trim();
  const isDefault = data.isDefault ? 1 : 0;

  if (!rawApiKey) {
    throw new Error('API Key is required to configure an AI model.');
  }

  // Encrypt API key with AES-256-GCM
  const { encrypted, iv, authTag } = encrypt(rawApiKey);

  // If this key is set as default, or if it is the first record, reset existing defaults
  const [countRows] = await db.query(`SELECT COUNT(*) as cnt FROM exam_ai_configs`);
  const isFirst = countRows[0].cnt === 0;
  const shouldBeDefault = isDefault || isFirst ? 1 : 0;

  if (shouldBeDefault) {
    await db.query(`UPDATE exam_ai_configs SET is_default = 0`);
  }

  const [result] = await db.query(`
    INSERT INTO exam_ai_configs
      (display_name, provider, model_name, base_url, encrypted_api_key, iv, auth_tag, is_active, is_default, is_healthy, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?)
  `, [displayName, provider, modelName, baseUrl, encrypted, iv, authTag, shouldBeDefault, userId || null]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'AI_CONFIG_CREATED',
    entityType: 'AI_CONFIG',
    entityId: result.insertId,
    payload: { displayName, provider, modelName, isDefault: Boolean(shouldBeDefault) }
  });

  return { id: result.insertId, message: 'AI Model configuration saved successfully.' };
}

/**
 * Update an existing AI configuration
 */
async function updateAiConfig(id, data, userId) {
  const [rows] = await db.query(`SELECT * FROM exam_ai_configs WHERE id = ?`, [id]);
  if (rows.length === 0) throw new Error('AI configuration not found.');
  const cur = rows[0];

  const displayName = data.displayName !== undefined ? data.displayName.trim() : cur.display_name;
  const provider = data.provider !== undefined ? data.provider.toLowerCase().trim() : cur.provider;
  const modelName = data.modelName !== undefined ? data.modelName.trim() : cur.model_name;
  const baseUrl = data.baseUrl !== undefined ? data.baseUrl.trim() : cur.base_url;
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : cur.is_active;

  let encrypted = cur.encrypted_api_key;
  let iv = cur.iv;
  let authTag = cur.auth_tag;

  if (data.apiKey && data.apiKey.trim()) {
    const enc = encrypt(data.apiKey.trim());
    encrypted = enc.encrypted;
    iv = enc.iv;
    authTag = enc.authTag;
  }

  if (data.isDefault) {
    await db.query(`UPDATE exam_ai_configs SET is_default = 0`);
  }

  const isDefault = data.isDefault !== undefined ? (data.isDefault ? 1 : 0) : cur.is_default;

  await db.query(`
    UPDATE exam_ai_configs
    SET display_name = ?,
        provider = ?,
        model_name = ?,
        base_url = ?,
        encrypted_api_key = ?,
        iv = ?,
        auth_tag = ?,
        is_active = ?,
        is_default = ?,
        is_healthy = 1,
        last_error_message = NULL
    WHERE id = ?
  `, [displayName, provider, modelName, baseUrl, encrypted, iv, authTag, isActive, isDefault, id]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'AI_CONFIG_UPDATED',
    entityType: 'AI_CONFIG',
    entityId: id,
    payload: { displayName, provider, modelName, apiKeyUpdated: Boolean(data.apiKey) }
  });

  return { success: true, message: 'AI Model configuration updated successfully.' };
}

/**
 * Set an AI configuration as the primary active default
 */
async function setDefaultAiConfig(id, userId) {
  await db.query(`UPDATE exam_ai_configs SET is_default = 0`);
  await db.query(`UPDATE exam_ai_configs SET is_default = 1, is_active = 1 WHERE id = ?`, [id]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'AI_CONFIG_SET_DEFAULT',
    entityType: 'AI_CONFIG',
    entityId: id,
    payload: { isDefault: true }
  });

  return { success: true, message: 'Active default AI model updated.' };
}

/**
 * Delete an AI configuration
 */
async function deleteAiConfig(id, userId) {
  const [rows] = await db.query(`SELECT * FROM exam_ai_configs WHERE id = ?`, [id]);
  if (rows.length === 0) throw new Error('AI configuration not found.');

  await db.query(`DELETE FROM exam_ai_configs WHERE id = ?`, [id]);

  // If deleted config was default, pick another active config as default
  if (rows[0].is_default) {
    await db.query(`
      UPDATE exam_ai_configs 
      SET is_default = 1 
      WHERE is_active = 1 
      ORDER BY id DESC 
      LIMIT 1
    `);
  }

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'AI_CONFIG_DELETED',
    entityType: 'AI_CONFIG',
    entityId: id,
    payload: { displayName: rows[0].display_name }
  });

  return { success: true, message: 'AI configuration deleted successfully.' };
}

/**
 * Test an AI model configuration with live lightweight ping
 */
async function testAiConfig(id) {
  const [rows] = await db.query(`SELECT * FROM exam_ai_configs WHERE id = ?`, [id]);
  if (rows.length === 0) throw new Error('AI configuration not found.');
  const cur = rows[0];

  const plainApiKey = decrypt(cur.encrypted_api_key, cur.iv, cur.auth_tag).trim();
  const apiBase = (cur.base_url || PROVIDER_DEFAULT_BASE_URLS[cur.provider] || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = cur.model_name || 'gpt-4o-mini';

  const startTime = Date.now();
  try {
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${plainApiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Ping. Respond with single word: OK' }
        ],
        max_tokens: 5,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errText = errBody.error?.message || errBody.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errText);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'OK';
    const latencyMs = Date.now() - startTime;

    await db.query(`
      UPDATE exam_ai_configs 
      SET is_healthy = 1, last_tested_at = NOW(), last_error_message = NULL
      WHERE id = ?
    `, [id]);

    return {
      success: true,
      latencyMs,
      message: `Verified successfully! Model "${model}" responded in ${latencyMs}ms: "${reply.trim()}".`
    };
  } catch (err) {
    const errMsg = err.name === 'TimeoutError'
      ? 'Connection timed out after 12 seconds.'
      : err.message;

    await db.query(`
      UPDATE exam_ai_configs 
      SET is_healthy = 0, last_tested_at = NOW(), last_error_message = ?
      WHERE id = ?
    `, [errMsg, id]);

    throw new Error(`AI Model connection failed: ${errMsg}`);
  }
}

/**
 * Retrieve the active default AI configuration for student exam assistant runtime
 */
async function getActiveAiConfig() {
  const [rows] = await db.query(`
    SELECT * FROM exam_ai_configs 
    WHERE is_active = 1 
    ORDER BY is_default DESC, is_healthy DESC, id DESC 
    LIMIT 1
  `);

  if (rows.length === 0) return null;

  const cur = rows[0];
  try {
    const plainApiKey = decrypt(cur.encrypted_api_key, cur.iv, cur.auth_tag).trim();
    return {
      id: cur.id,
      displayName: cur.display_name,
      provider: cur.provider,
      modelName: cur.model_name,
      baseUrl: (cur.base_url || PROVIDER_DEFAULT_BASE_URLS[cur.provider] || 'https://api.openai.com/v1').replace(/\/$/, ''),
      apiKey: plainApiKey
    };
  } catch (err) {
    console.warn(`[AI CONFIG] Failed decrypting key for AI config #${cur.id}:`, err.message);
    return null;
  }
}

module.exports = {
  listAiConfigs,
  createAiConfig,
  updateAiConfig,
  setDefaultAiConfig,
  deleteAiConfig,
  testAiConfig,
  getActiveAiConfig,
  PROVIDER_DEFAULT_BASE_URLS
};
