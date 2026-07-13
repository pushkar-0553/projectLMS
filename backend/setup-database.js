const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeDatabaseFile(filename) {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', filename);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 4000,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'your_mysql_password',
      database: process.env.DB_NAME || 'test',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      multipleStatements: true
    });
    
    console.log(`Executing ${filename}...`);
    
    // Execute the SQL file using query instead of execute for multiple statements
    await connection.query(sql);
    
    console.log(`✅ ${filename} executed successfully!`);
    
    await connection.end();
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error);
  }
}

// Usage examples
async function main() {
  const filename = process.argv[2] || 'setup.sql';
  // For fresh setup
  await executeDatabaseFile(filename);
}

main();
