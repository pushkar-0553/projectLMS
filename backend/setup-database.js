const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeDatabaseFile(filename) {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', filename);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Create MySQL connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'your_mysql_password', // Replace with your MySQL password
      multipleStatements: true
    });
    
    console.log(`Executing ${filename}...`);
    
    // Execute the SQL file
    await connection.execute(sql);
    
    console.log(`✅ ${filename} executed successfully!`);
    
    await connection.end();
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error);
  }
}

// Usage examples
async function main() {
  // For fresh setup
  await executeDatabaseFile('setup.sql');
  
  // OR for migration
  // await executeDatabaseFile('migrate_safe.sql');
}

main();
