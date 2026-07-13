const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeMigration() {
  try {
    const filename = process.argv[2] || process.env.MIGRATION_FILE || 'migration_v5_academics.sql';
    const sqlFilePath = path.join(__dirname, 'database', filename);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      multipleStatements: true
    });

    console.log(`Executing ${filename}...`);
    await connection.query(sql);
    console.log(`${filename} executed successfully.`);
    await connection.end();
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  }
}

executeMigration();
