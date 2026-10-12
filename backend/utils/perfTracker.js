const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Performance Tracking Middleware
 * Captures request timeline, database query metrics, and injects Server-Timing headers.
 */
function perfMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  const context = {
    reqId: Math.random().toString(36).substring(2, 9),
    startTime,
    authDurationMs: 0,
    dbQueries: [],
    dbTotalMs: 0
  };

  asyncLocalStorage.run(context, () => {
    // Intercept header writing to inject Server-Timing before headers are committed
    const originalWriteHead = res.writeHead;
    res.writeHead = function (...args) {
      try {
        const totalMs = Number(process.hrtime.bigint() - startTime) / 1e6;
        const dbMs = context.dbTotalMs || 0;
        const authMs = context.authDurationMs || 0;
        const qCount = context.dbQueries.length;
        
        let slowestQMs = 0;
        for (const q of context.dbQueries) {
          if (q.durationMs > slowestQMs) slowestQMs = q.durationMs;
        }

        const serverTimingParts = [
          `total;dur=${totalMs.toFixed(1)}`,
          `db;dur=${dbMs.toFixed(1)}`,
          `auth;dur=${authMs.toFixed(1)}`,
          `q_cnt;desc="${qCount}"`
        ];
        if (qCount > 0) {
          serverTimingParts.push(`q_slow;dur=${slowestQMs.toFixed(1)}`);
        }

        res.setHeader('Server-Timing', serverTimingParts.join(', '));
      } catch (err) {
        // Guard against header mutation errors
      }
      return originalWriteHead.apply(res, args);
    };

    // Log structured timing on request finish
    res.on('finish', () => {
      // Suppress noisy health checks in production logs
      if (req.path === '/health' || req.path === '/api/health') return;

      const totalMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      const qCount = context.dbQueries.length;
      let slowestQMs = 0;
      for (const q of context.dbQueries) {
        if (q.durationMs > slowestQMs) slowestQMs = q.durationMs;
      }

      console.log(
        `[PERF] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ` +
        `| Total: ${totalMs.toFixed(1)}ms ` +
        `| DB: ${context.dbTotalMs.toFixed(1)}ms (${qCount} queries, slowest: ${slowestQMs.toFixed(1)}ms) ` +
        `| Auth: ${context.authDurationMs.toFixed(1)}ms`
      );
    });

    next();
  });
}

/**
 * Record a database query execution inside the active request context
 */
function recordDbQuery(sql, durationMs) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.dbTotalMs += durationMs;
    // Keep sanitized brief preview of SQL (no parameter values)
    const preview = typeof sql === 'string' ? sql.trim().substring(0, 60).replace(/\s+/g, ' ') : 'query';
    store.dbQueries.push({ sql: preview, durationMs });
  }
}

/**
 * Record authentication duration
 */
function recordAuthDuration(durationMs) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.authDurationMs += durationMs;
  }
}

function getPerfContext() {
  return asyncLocalStorage.getStore();
}

module.exports = {
  perfMiddleware,
  recordDbQuery,
  recordAuthDuration,
  getPerfContext
};
