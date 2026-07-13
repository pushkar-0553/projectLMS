const pool = require('../config/db');

async function debugUsersTable() {
  try {
    console.log('--- USERS TABLE STRUCTURE ---');
    const [columns] = await pool.execute("SHOW COLUMNS FROM Users");
    console.table(columns);
    
    console.log('\n--- LATEST USERS ---');
    const [users] = await pool.execute("SELECT id, name, email, role, password FROM Users ORDER BY id DESC LIMIT 5");
    console.table(users);
  } catch (error) {
    console.error('Debug error:', error.message);
  } finally {
    process.exit();
  }
}

debugUsersTable();
