const pool = require('../config/db');

async function logCols() {
  const [cols] = await pool.execute("SHOW COLUMNS FROM Users");
  cols.forEach(c => console.log(c.Field));
  process.exit();
}
logCols();
