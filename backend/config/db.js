const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 12, // Tuned for free-tier cloud DB connection limits
  maxIdle: 8,          // Actively reclaim idle connections to prevent connection starvation
  idleTimeout: 30000,  // Close idle connection after 30s
  queueLimit: 100,     // Guard against unbounded queue memory leak during connection stalls
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

module.exports = pool;
