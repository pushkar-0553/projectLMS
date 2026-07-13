const pool = require('./config/db');

async function showTables() {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('\n--- TABLES IN DATABASE ---');
    console.table(tables);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

showTables();
