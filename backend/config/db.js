const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { recordDbQuery } = require('../utils/perfTracker');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 6,  // Tuned for Render Free Tier (512MB RAM) and TiDB serverless
  maxIdle: 4,          // Maintain warm connections for reuse
  idleTimeout: 60000,  // Keep idle connections open for 60s to prevent handshake overhead
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
};

const pool = mysql.createPool(dbConfig);

// Pool diagnostics to track unexpected disconnects
pool.on?.('error', (err) => {
  console.error('[DB POOL ERROR]', err.code || err.message);
});

// Non-intrusive query profiling wrappers
const originalExecute = pool.execute.bind(pool);
pool.execute = async function (sql, values) {
  const start = process.hrtime.bigint();
  try {
    return await originalExecute(sql, values);
  } finally {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    recordDbQuery(sql, durMs);
  }
};

const originalQuery = pool.query.bind(pool);
pool.query = async function (sql, values) {
  const start = process.hrtime.bigint();
  try {
    return await originalQuery(sql, values);
  } finally {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    recordDbQuery(sql, durMs);
  }
};

module.exports = pool;
