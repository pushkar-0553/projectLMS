const db = require('../config/db');
const { getActiveAiConfig } = require('./aiConfigService');

// In-memory rate limiting map: sessionId -> { count, resetAt }
const aiRateLimitMap = new Map();
const AI_RATE_LIMIT_MAX = 10; // Max 10 AI queries per minute per candidate
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkAiRateLimit(sessionId) {
  const now = Date.now();
  const entry = aiRateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    aiRateLimitMap.set(sessionId, { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: AI_RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= AI_RATE_LIMIT_MAX) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, waitSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: AI_RATE_LIMIT_MAX - entry.count };
}

const DEFAULT_MAX_QUERIES_PER_SESSION = 8;
const DEFAULT_MAX_TOKENS_PER_SESSION = 2500;

/**
 * Get AI Assistant configuration, active model, and session quota usage
 */
async function getAiAssistantStatus(sessionId) {
  let model = process.env.AI_MODEL || 'gpt-4o-mini';
  let providerName = 'openai';

  const activeDbConfig = await getActiveAiConfig();
  if (activeDbConfig && activeDbConfig.apiKey) {
    model = activeDbConfig.modelName;
    providerName = activeDbConfig.provider;
  }

  const [usageRows] = await db.query(`
    SELECT COUNT(*) as query_count, COALESCE(SUM(tokens_used), 0) as total_tokens
    FROM exam_ai_logs
    WHERE session_id = ?
  `, [sessionId]);

  const queryCount = usageRows[0]?.query_count || 0;
  const totalTokens = usageRows[0]?.total_tokens || 0;
  const maxQueries = DEFAULT_MAX_QUERIES_PER_SESSION;
  const remainingQueries = Math.max(0, maxQueries - queryCount);

  return {
    model,
    provider: providerName,
    queriesUsed: queryCount,
    maxQueries,
    remainingQueries,
    tokensUsed: totalTokens,
    maxTokens: DEFAULT_MAX_TOKENS_PER_SESSION,
    remainingTokens: Math.max(0, DEFAULT_MAX_TOKENS_PER_SESSION - totalTokens)
  };
}

/**
 * Generate AI Assistant guidance using configured provider (LiteLLM, OpenAI, custom gateway)
 */
async function queryAiAssistant({ prompt, questionContext = '', codeContext = '', session, questionId = null }) {
  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('AI prompt cannot be empty.');
  }

  // 1a. In-Memory Burst Rate Limiting Check (e.g. max 10/min)
  const rate = checkAiRateLimit(session.id);
  if (!rate.allowed) {
    throw new Error(`AI rate limit reached. Please wait ${rate.waitSec} seconds before asking again.`);
  }

  // 1b. Session-Level Examination Quota Check
  const aiStatus = await getAiAssistantStatus(session.id);
  if (aiStatus.remainingQueries <= 0) {
    throw new Error(`AI Assistant limit reached for this examination (${aiStatus.maxQueries} of ${aiStatus.maxQueries} conceptual assists used). Please complete the remaining questions independently.`);
  }

  const startTime = Date.now();

  // 2. Resolve Configured AI Provider & Gateway Settings from DB or Environment
  let apiBase = (process.env.LITELLM_BASE_URL || process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');
  let apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
  let model = process.env.AI_MODEL || 'gpt-4o-mini';
  let providerName = 'openai';

  const activeDbConfig = await getActiveAiConfig();
  if (activeDbConfig && activeDbConfig.apiKey) {
    apiBase = activeDbConfig.baseUrl;
    apiKey = activeDbConfig.apiKey;
    model = activeDbConfig.modelName;
    providerName = activeDbConfig.provider;
  }

  const systemPrompt = `You are a concise examination AI assistant helping a student understand concepts, algorithms, syntax, and debugging clues.
Guidelines:
1. Provide direct, helpful, and concise explanations (strictly under 200 words).
2. Explain the reasoning, algorithm, or syntax error clearly.
3. If the question context is provided, explain the concept without dumping a direct, verbatim full cheating answer if asked explicitly to just "solve it for me". Encourage understanding.
4. Format code snippets or formulas with clean markdown.`;

  let responseText = '';
  let tokensUsed = 0;

  // 3. If an API key or LiteLLM gateway is available, make the LLM request
  if (apiKey || apiBase.includes('localhost') || apiBase.includes('127.0.0.1')) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      if (questionContext) {
        messages.push({
          role: 'user',
          content: `Current Exam Question: ${questionContext}`
        });
      }

      if (codeContext) {
        messages.push({
          role: 'user',
          content: `Student Current Code:\n\`\`\`\n${codeContext.slice(0, 2000)}\n\`\`\``
        });
      }

      messages.push({
        role: 'user',
        content: cleanPrompt
      });

      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || 'dummy-key'}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 350,
          temperature: 0.3
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || 'No response generated.';
        tokensUsed = data.usage?.total_tokens || 0;
      } else {
        const errText = await response.text();
        console.warn(`[AI SERVICE] Gateway returned status ${response.status}:`, errText);
        throw new Error(`AI Gateway error (${response.status})`);
      }
    } catch (err) {
      console.warn('[AI SERVICE] External LLM gateway unreachable, providing heuristic assistance:', err.message);
      responseText = generateHeuristicAssistantResponse(cleanPrompt, questionContext, codeContext);
    }
  } else {
    // Graceful offline heuristic assistant mode when no external API key is set
    responseText = generateHeuristicAssistantResponse(cleanPrompt, questionContext, codeContext);
  }

  const responseTimeMs = Date.now() - startTime;

  // 4. Log interaction into exam_ai_logs for compliance & audit
  try {
    await db.query(`
      INSERT INTO exam_ai_logs
        (session_id, candidate_id, question_id, prompt_text, response_text, model_used, tokens_used, response_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [session.id, session.candidate_id, questionId || null, cleanPrompt.slice(0, 1000), responseText.slice(0, 3000), model, tokensUsed, responseTimeMs]);
  } catch (logErr) {
    console.warn('[AI LOG ERROR]', logErr.message);
  }

  return {
    prompt: cleanPrompt,
    response: responseText,
    model,
    provider: providerName,
    queriesUsed: aiStatus.queriesUsed + 1,
    maxQueries: aiStatus.maxQueries,
    remainingQueries: Math.max(0, aiStatus.maxQueries - (aiStatus.queriesUsed + 1)),
    tokensUsed: tokensUsed,
    responseTimeMs
  };
}

/**
 * Intelligent fallback generator for development / sandbox / offline runs
 */
function generateHeuristicAssistantResponse(prompt, questionContext, codeContext) {
  const p = prompt.toLowerCase();

  if (p.includes('syntax') || p.includes('error') || p.includes('bug') || p.includes('indent')) {
    return `### Syntax & Debugging Hints
1. **Check Matching Delimiters**: Verify that every open bracket \`(\`, \`[\`, \`{\` has a matching close bracket.
2. **Indentation / Semicolons**: If using Python, ensure 4-space uniform indentation. For JavaScript/Java/C++, ensure semicolons and proper brace nesting.
3. **Variable Names**: Check for typos, case sensitivity, and that variables are initialized before use.`;
  }

  if (p.includes('time complexity') || p.includes('space') || p.includes('big o')) {
    return `### Complexity Analysis Guide
- Single loop over array of size $N$: **$O(N)$**
- Nested loops: **$O(N^2)$**
- Divide-and-conquer (binary search / merge sort): **$O(\\log N)$** or **$O(N \\log N)$**
- Hash map lookup/insert: **$O(1)$** average time complexity.`;
  }

  if (p.includes('approach') || p.includes('how to start') || p.includes('hint') || p.includes('logic')) {
    return `### Recommended Problem Approach
1. **Understand Input/Output**: Identify edge cases (empty inputs, negative numbers, single elements).
2. **Step-by-Step Logic**: Write pseudo-code in comments before writing the actual implementation.
3. **Trace with Small Input**: Trace your logic manually with a small sample input (e.g. $[1, 2, 3]$).`;
  }

  return `### AI Concept Explanation
You asked: "${prompt}"

**Key Concept Summary**:
When solving this problem, break down the core requirement into:
1. Data representation and storage.
2. Traversal or loop invariant.
3. Return statement meeting the required specification.

*Tip: Use the Code Editor panel to write and test your syntax structure carefully before submitting.*`;
}

module.exports = {
  queryAiAssistant,
  getAiAssistantStatus
};
