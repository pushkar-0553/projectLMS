const db = require('../config/db');

// In-memory rate limiting map: sessionId -> { count, resetAt }
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 15; // Max 15 queries per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(sessionId) {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, waitSec };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

/**
 * Clean and parse DuckDuckGo HTML results
 */
function parseDuckDuckGoHtml(html) {
  const results = [];
  try {
    const titleRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

    const titles = [];
    let tm;
    while ((tm = titleRegex.exec(html)) !== null && titles.length < 10) {
      let rawUrl = tm[1] || '';
      if (rawUrl.includes('uddg=')) {
        try {
          rawUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
        } catch (_) {}
      }
      if (rawUrl.startsWith('//')) rawUrl = 'https:' + rawUrl;

      const cleanTitle = tm[2].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
      if (cleanTitle) {
        titles.push({ title: cleanTitle, url: rawUrl });
      }
    }

    const snippets = [];
    let sm;
    while ((sm = snippetRegex.exec(html)) !== null && snippets.length < 10) {
      const cleanSnippet = sm[1].replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
      snippets.push(cleanSnippet);
    }

    for (let i = 0; i < titles.length; i++) {
      results.push({
        title: titles[i].title,
        snippet: snippets[i] || 'Documentation and article reference.',
        url: titles[i].url
      });
    }
  } catch (err) {
    console.warn('[SEARCH PARSER ERROR]', err.message);
  }
  return results;
}

/**
 * Execute DuckDuckGo Web Search via Backend Proxy
 */
async function searchWeb(query, session, questionId = null, clientIp = null) {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    throw new Error('Search query cannot be empty.');
  }

  // 1. Rate Limiting Check
  const rate = checkRateLimit(session.id);
  if (!rate.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${rate.waitSec} seconds before searching again.`);
  }

  const startTime = Date.now();
  let results = [];
  let provider = process.env.SEARCH_PROVIDER || 'duckduckgo';

  try {
    // 2. Fetch from DuckDuckGo HTML endpoint with strict 6s timeout
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `q=${encodeURIComponent(cleanQuery)}`,
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const html = await response.text();
      results = parseDuckDuckGoHtml(html);
    } else {
      console.warn(`[SEARCH] DuckDuckGo HTTP status: ${response.status}`);
    }

    // Fallback: If HTML parsing returned 0 results, query DuckDuckGo instant API
    if (results.length === 0) {
      const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const instantRes = await fetch(instantUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000)
      });

      if (instantRes.ok) {
        const data = await instantRes.json();
        if (data.AbstractText) {
          results.push({
            title: data.Heading || cleanQuery,
            snippet: data.AbstractText,
            url: data.AbstractURL || 'https://duckduckgo.com'
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          data.RelatedTopics.slice(0, 5).forEach(item => {
            if (item.Text && item.FirstURL) {
              results.push({
                title: item.Text.split(' - ')[0] || 'Reference',
                snippet: item.Text,
                url: item.FirstURL
              });
            }
          });
        }
      }
    }

    // 2b. Enrich with Wikipedia Conceptual Reference for technical/programming terms
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=2&namespace=0&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExaminationSearch/1.0' },
        signal: AbortSignal.timeout(3000)
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const titles = wikiData[1] || [];
        const snippets = wikiData[2] || [];
        const urls = wikiData[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (titles[i] && snippets[i] && snippets[i].length > 30) {
            results.unshift({
              title: `${titles[i]} (Conceptual Summary)`,
              snippet: snippets[i],
              url: urls[i] || 'https://en.wikipedia.org',
              sourceType: 'WIKIPEDIA'
            });
          }
        }
      }
    } catch (_) {
      // Non-blocking Wikipedia fallback
    }
  } catch (err) {
    console.warn(`[SEARCH SERVICE] DuckDuckGo query error for "${cleanQuery}":`, err.message);
    if (err.name === 'TimeoutError') {
      throw new Error('Search request timed out. Please try again with different keywords.');
    }
  }

  const responseTimeMs = Date.now() - startTime;

  // 3. Log query to database for monitoring & security audit
  try {
    await db.query(`
      INSERT INTO exam_search_logs
        (session_id, candidate_id, question_id, query, provider, result_count, response_time_ms, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [session.id, session.candidate_id, questionId || null, cleanQuery.slice(0, 500), provider, results.length, responseTimeMs, clientIp || null]);
  } catch (logErr) {
    console.warn('[SEARCH LOG ERROR]', logErr.message);
  }

  return {
    query: cleanQuery,
    provider,
    results,
    count: results.length,
    responseTimeMs
  };
}

/**
 * Safely fetch and extract clean readable text from a URL for In-Exam Reader View
 * (Allows reading full documentation/articles without exiting fullscreen exam or opening external tabs)
 */
async function readWebPage(targetUrl, session = null) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('Invalid URL provided.');
  }

  const cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('Only HTTP/HTTPS URLs are supported.');
  }

  let domain = '';
  try {
    domain = new URL(cleanUrl).hostname;
  } catch (e) {
    throw new Error('Malformed URL.');
  }

  // 1. Fetch webpage with 6-second timeout
  const response = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch page (${response.status}: ${response.statusText}).`);
  }

  const html = await response.text();

  // 2. Extract title
  let title = 'Web Reference';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // 3. Strip non-content blocks (scripts, styles, headers, navs, footers, svg, iframe)
  let cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Isolate main article body if available
  const mainMatch = cleanHtml.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (mainMatch && mainMatch[1]) {
    cleanHtml = mainMatch[1];
  }

  // Convert headings and paragraphs to markdown-like format
  cleanHtml = cleanHtml
    .replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, '\n\n## $1\n\n')
    .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, '\n\n### $1\n\n')
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n\n```\n$1\n```\n\n')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining HTML tags
  let text = cleanHtml.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n');

  // Clean redundant whitespace and empty lines
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0));

  const content = lines.slice(0, 150).join('\n').trim();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    title,
    url: cleanUrl,
    domain,
    content: content || 'Could not parse readable text from this webpage.',
    wordCount
  };
}

module.exports = {
  searchWeb,
  readWebPage
};
